"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Search, Loader2 } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { PackagingComponent } from "@/lib/types";

interface AsyncComponentSelectProps {
  value: string;
  onChange: (ulid: string, component?: PackagingComponent) => void;
  selectedComponent?: PackagingComponent | null;
}

export default function AsyncComponentSelect({ value, onChange, selectedComponent }: AsyncComponentSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<PackagingComponent[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingNodeRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch data
  const fetchOptions = async (pageNum: number, searchQuery: string, isNewSearch: boolean) => {
    setIsLoading(true);
    try {
      const res = await endpoints.packagingComponents.getComponents(pageNum, 10, searchQuery);
      if (isNewSearch) {
        setOptions(res.items || []);
      } else {
        setOptions(prev => [...prev, ...(res.items || [])]);
      }
      setHasMore(pageNum < res.pages);
    } catch (err) {
      console.error("Failed to fetch components", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset and fetch when search changes
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchOptions(1, debouncedSearch, true);
    }
  }, [debouncedSearch, isOpen]);

  // Infinite scroll intersection observer
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore && !isLoading) {
      setPage(p => {
        const nextPage = p + 1;
        fetchOptions(nextPage, debouncedSearch, false);
        return nextPage;
      });
    }
  }, [hasMore, isLoading, debouncedSearch]);

  useEffect(() => {
    const option = { root: null, rootMargin: "20px", threshold: 0 };
    observerRef.current = new IntersectionObserver(handleObserver, option);
    if (loadingNodeRef.current) observerRef.current.observe(loadingNodeRef.current);
    
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [handleObserver]);

  // Derived display name
  const currentOption = options.find(o => o.ulid === value) || selectedComponent;
  const displayLabel = currentOption ? `${currentOption.name} (₹${currentOption.cost})` : "Select a component...";

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className={`w-full h-12 bg-white border ${isOpen ? 'border-[#7c3aed] ring-2 ring-[#7c3aed]/20' : 'border-neutral-200'} rounded-xl px-4 flex items-center justify-between cursor-pointer transition-all`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-sm font-medium ${currentOption ? 'text-neutral-800' : 'text-neutral-500'}`}>
          {displayLabel}
        </span>
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-neutral-100 rounded-xl shadow-lg z-50 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-neutral-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-neutral-400 ml-2" />
            <input 
              type="text"
              placeholder="Search components..."
              className="flex-1 bg-transparent h-8 text-sm outline-none text-neutral-800"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1 flex flex-col">
            {options.map(option => (
              <div 
                key={option.ulid}
                onClick={() => {
                  onChange(option.ulid, option);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${value === option.ulid ? 'bg-[#7c3aed]/10 text-[#7c3aed]' : 'text-neutral-700 hover:bg-neutral-50'}`}
              >
                {option.name} <span className="text-neutral-400 font-normal ml-1">(₹{option.cost})</span>
              </div>
            ))}
            
            {options.length === 0 && !isLoading && (
              <div className="p-4 text-center text-sm text-neutral-500">No components found.</div>
            )}
            
            {/* Loading / Observer target */}
            <div ref={loadingNodeRef} className="py-3 flex justify-center">
              {isLoading && <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
