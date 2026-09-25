"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Search, MapPin, Map } from "lucide-react";

// Dynamically import the map to avoid SSR "window is not defined" issues
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] flex flex-col items-center justify-center bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-400 gap-2">
      <Map className="w-6 h-6 text-neutral-300 animate-pulse" />
      <span className="text-sm font-medium">Loading Map Engine...</span>
    </div>
  ),
});

export interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
  label?: string;
}

export function LocationPicker({ latitude, longitude, onChange, label = "Pinpoint Delivery Location" }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Default fallback (Delhi)
  const defaultPosition: [number, number] = [28.6139, 77.2090];
  const [currentPosition, setCurrentPosition] = useState<[number, number]>(defaultPosition);

  // Sync state with props or fetch geolocation if missing
  useEffect(() => {
    if (latitude && longitude) {
      setCurrentPosition([latitude, longitude]);
    } else {
      // Automatically request user location on load if no coordinates are set
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setCurrentPosition([lat, lng]);
            onChange(lat, lng); // Auto-fill the form with their current location
          },
          (error) => {
            console.warn("Geolocation denied or failed:", error);
            // Leaves it at defaultPosition
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  // Debounced search for Autocomplete Suggestions
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchQuery.trim().length > 2) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              searchQuery
            )}&limit=5`
          );
          const data = await res.json();
          setSuggestions(data || []);
          setShowSuggestions(true);
        } catch (err) {
          console.error("Autocomplete error:", err);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500); // 500ms debounce to respect Nominatim limits

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Close suggestions if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (suggestion: any) => {
    setSearchQuery(suggestion.display_name);
    setShowSuggestions(false);
    onChange(parseFloat(suggestion.lat), parseFloat(suggestion.lon));
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setShowSuggestions(false);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const firstResult = data[0];
        setSearchQuery(firstResult.display_name);
        onChange(parseFloat(firstResult.lat), parseFloat(firstResult.lon));
      } else {
        alert("Location not found. Please try a different query.");
      }
    } catch (error) {
      console.error("Error searching location:", error);
      alert("Failed to search location.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full relative">
      <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
        <MapPin className="w-4 h-4 text-[#6A0FAD]" />
        {label}
      </label>

      {/* Search Bar */}
      <div className="flex gap-2 relative" ref={suggestionsRef}>
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder="Search for an area or landmark..."
            className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD] transition-all"
          />
          
          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
              {suggestions.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSuggestion(s)}
                  className="px-4 py-3 text-sm text-neutral-800 font-medium hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-b-0 transition-colors"
                >
                  {s.display_name}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="px-6 py-3 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-neutral-800 transition-colors flex items-center gap-2 disabled:opacity-50 shrink-0"
        >
          <Search className="w-4 h-4" />
          {isSearching ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Map Container */}
      <div className="w-full h-[300px] rounded-xl overflow-hidden border border-neutral-200 relative z-0">
        <LeafletMap
          position={currentPosition}
          setPosition={(pos: [number, number]) => onChange(pos[0], pos[1])}
        />
      </div>
      
      {/* Real-time Coordinate Feedback */}
      {latitude && longitude && (
        <div className="text-xs text-neutral-400 font-medium px-1">
          Coordinates captured: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </div>
      )}
    </div>
  );
}
