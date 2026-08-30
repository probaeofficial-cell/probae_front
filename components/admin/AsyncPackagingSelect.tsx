"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Search, Loader2 } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { Packaging } from "@/lib/types";

interface AsyncPackagingSelectProps {
  value: number | null;
  onChange: (id: number | null, pkg?: Packaging) => void;
  selectedPackaging?: Packaging | null;
}

export default function AsyncPackagingSelect({ value, onChange, selectedPackaging }: AsyncPackagingSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<Packaging[]>([]);
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
      // The backend packaging search might not support search string right now?
      // Assuming it does or we just fetch page by page
      const res = await endpoints.packaging.getBundles(pageNum, 10);
      let newItems = res.items || [];
      if (searchQuery) {
         newItems = newItems.filter((i: Packaging) => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || (i.code && i.code.toLowerCase().includes(searchQuery.toLowerCase())));
      }

      if (isNewSearch) {
        setOptions(newItems);
      } else {
        setOptions(prev => [...prev, ...newItems]);
      }
      setHasMore(pageNum < res.pages);
    } catch (err) {
      console.error("Failed to fetch packaging", err);
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
  const currentOption = options.find(o => o.id === value) || selectedPackaging;
  const displayLabel = value === null ? "No Packaging" : currentOption ? `${currentOption.code ? `[${currentOption.code}] ` : ''}${currentOption.name}` : "Select packaging...";

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className={`w-full h-10 bg-white border ${isOpen ? 'border-[#7c3aed] ring-2 ring-[#7c3aed]/20' : 'border-neutral-200'} rounded-xl px-4 flex items-center justify-between cursor-pointer transition-all`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-sm font-medium ${currentOption || value === null ? 'text-neutral-800' : 'text-neutral-500'} line-clamp-1`}>
          {displayLabel}
        </span>
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''} shrink-0`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-neutral-100 rounded-xl shadow-lg z-50 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-neutral-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-neutral-400 ml-2" />
            <input 
              type="text"
              placeholder="Search packaging..."
              className="flex-1 bg-transparent h-8 text-sm outline-none text-neutral-800"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1 flex flex-col">
            <div 
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${value === null ? 'bg-[#7c3aed]/10 text-[#7c3aed]' : 'text-neutral-700 hover:bg-neutral-50'}`}
            >
              No Packaging
            </div>
            {options.map(option => (
              <div 
                key={option.id}
                onClick={() => {
                  onChange(option.id, option);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${value === option.id ? 'bg-[#7c3aed]/10 text-[#7c3aed]' : 'text-neutral-700 hover:bg-neutral-50'}`}
              >
                {option.code && <span className="text-neutral-500 font-normal mr-1">[{option.code}]</span>}
                {option.name}
              </div>
            ))}
            
            {options.length === 0 && !isLoading && (
              <div className="p-4 text-center text-sm text-neutral-500">No packaging found.</div>
            )}
            
            {/* Loading / Observer target */}
            <div ref={loadingNodeRef} className="py-3 flex justify-center">
              {isLoading && <BowlLoader className="w-4 h-4 text-neutral-400 animate-spin" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
