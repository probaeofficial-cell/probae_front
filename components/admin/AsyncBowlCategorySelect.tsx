"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Search, Loader2 } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { BowlCategory } from "@/lib/types";

interface AsyncBowlCategorySelectProps {
  value: number | 0;
  onChange: (id: number) => void;
  selectedCategory?: BowlCategory | null;
}

export default function AsyncBowlCategorySelect({ value, onChange, selectedCategory }: AsyncBowlCategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<BowlCategory[]>([]);
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
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch logic
  const fetchOptions = async (pageNum: number, searchTerm: string, isNewSearch: boolean) => {
    setIsLoading(true);
    try {
      const res = await endpoints.bowlCategories.getBowlCategories(pageNum, 10, searchTerm);
      const newItems = res.items || [];
      if (isNewSearch) {
        setOptions(newItems);
      } else {
        setOptions(prev => [...prev, ...newItems]);
      }
      setHasMore(pageNum < (res.total_pages || 1));
    } catch (err) {
      console.error("Failed to load bowl categories", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger search when debounced term changes, but only if dropdown is open
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchOptions(1, debouncedSearch, true);
    }
  }, [debouncedSearch, isOpen]);

  // Load initial options if empty and opened
  useEffect(() => {
    if (isOpen && options.length === 0 && !isLoading) {
      fetchOptions(1, "", true);
    }
  }, [isOpen]);

  // Intersection observer for infinite scroll
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore && !isLoading) {
      setPage(prev => {
        const nextPage = prev + 1;
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
  const currentOption = options.find(o => o.id === value) || selectedCategory;
  const displayLabel = value === 0 ? "Select Category…" : currentOption ? `${currentOption.code ? `[${currentOption.code}] ` : ''}${currentOption.name}` : "Select Category…";

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className={`w-full h-[48px] bg-neutral-100 rounded-[14px] px-4 flex items-center justify-between cursor-pointer transition-all border ${isOpen ? 'border-[#7c3aed] ring-2 ring-[#7c3aed]/20' : 'border-transparent'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-sm font-medium ${currentOption || value === 0 ? 'text-neutral-800' : 'text-neutral-500'} line-clamp-1`}>
          {displayLabel}
        </span>
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''} shrink-0`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden flex flex-col max-h-[300px]">
          <div className="p-2 border-b border-neutral-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-neutral-50 rounded-xl text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
            {options.map((opt) => (
              <div 
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-between group ${value === opt.id ? 'bg-[#f3f0ff] text-[#7c3aed] font-semibold' : 'text-neutral-700 hover:bg-neutral-50'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="truncate">{opt.name}</span>
                  {opt.code && <span className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded font-mono group-hover:bg-neutral-200 transition-colors">{opt.code}</span>}
                </div>
                {value === opt.id && (
                  <div className="w-2 h-2 rounded-full bg-[#7c3aed]" />
                )}
              </div>
            ))}
            
            {hasMore && (
              <div ref={loadingNodeRef} className="py-3 flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
              </div>
            )}
            
            {!hasMore && options.length === 0 && (
              <div className="py-4 text-center text-sm text-neutral-400">
                No categories found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
