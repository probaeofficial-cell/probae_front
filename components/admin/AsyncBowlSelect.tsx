"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Search } from "lucide-react";
import { endpoints } from "@/lib/apiService";

interface AsyncBowlSelectProps {
  value: string;
  onChange: (ulid: string) => void;
  mealCategoryId?: number;
  selectedBowl?: any;
}

export default function AsyncBowlSelect({ value, onChange, mealCategoryId, selectedBowl }: AsyncBowlSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingNodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchOptions = async (pageNum: number, searchTerm: string, isNewSearch: boolean) => {
    setIsLoading(true);
    try {
      // Search by name — always
      // Also pass as code search if the term looks like a bowl code (short, no spaces)
      const looksLikeCode = searchTerm.length > 0 && !searchTerm.includes(' ');
      const nameRes = await endpoints.bowls.getBowls(pageNum, 10, searchTerm, undefined, undefined, undefined, undefined, undefined, undefined, mealCategoryId === 0 ? undefined : mealCategoryId) as any;
      let codeItems: any[] = [];
      if (looksLikeCode) {
        const codeRes = await endpoints.bowls.getBowls(1, 10, undefined, undefined, undefined, undefined, undefined, searchTerm, undefined, mealCategoryId === 0 ? undefined : mealCategoryId) as any;
        // Merge, dedup by ulid
        const seen = new Set((nameRes.items || []).map((i: any) => i.ulid));
        codeItems = (codeRes.items || []).filter((i: any) => !seen.has(i.ulid));
      }
      const combined = [...(nameRes.items || []), ...codeItems];
      const newItems = combined;
      if (isNewSearch) {
        setOptions(newItems);
      } else {
        setOptions(prev => [...prev, ...newItems]);
      }
      setHasMore((nameRes.items || []).length === 10);
    } catch (err) {
      console.error("Failed to load bowls", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchOptions(1, debouncedSearch, true);
    }
  }, [debouncedSearch, isOpen, mealCategoryId]);

  useEffect(() => {
    if (isOpen && options.length === 0 && !isLoading) {
      fetchOptions(1, "", true);
    }
  }, [isOpen, mealCategoryId]);

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

  const currentOption = options.find(o => o.ulid === value) || selectedBowl;
  const displayLabel = value === "" ? "Select Bowl..." : currentOption ? currentOption.name : "Select Bowl...";

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className={`w-full h-[44px] bg-neutral-50 rounded-xl px-4 flex items-center justify-between cursor-pointer transition-all border ${isOpen ? 'border-[#7c3aed] ring-2 ring-[#7c3aed]/20' : 'border-neutral-200'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-sm font-medium ${currentOption || value !== "" ? 'text-neutral-900' : 'text-neutral-500'} line-clamp-1`}>
          {displayLabel}
        </span>
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''} shrink-0`} />
      </div>

      {isOpen && (
        <div className="absolute z-[300] w-full mt-2 bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden flex flex-col max-h-[300px]">
          <div className="p-2 border-b border-neutral-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="text"
                placeholder="Search by name or bowl code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-neutral-50 rounded-xl text-sm outline-none placeholder:text-neutral-400 text-neutral-900"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
            {options.map((opt) => (
              <div 
                key={opt.ulid}
                onClick={() => {
                  onChange(opt.ulid);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-between group ${value === opt.ulid ? 'bg-[#f3f0ff] text-[#7c3aed] font-semibold' : 'text-neutral-900 hover:bg-neutral-50'}`}
              >
                <div className="flex flex-col">
                  <span className="truncate font-medium">{opt.name}</span>
                  <span className="text-[10px] text-neutral-500">
                    {opt.code && <span className="font-mono bg-neutral-100 px-1 rounded mr-1">{opt.code}</span>}
                    {opt.bowl_type || 'Standard'}
                  </span>
                </div>
                {value === opt.ulid && (
                  <div className="w-2 h-2 rounded-full bg-[#7c3aed]" />
                )}
              </div>
            ))}
            
            {hasMore && (
              <div ref={loadingNodeRef} className="py-3 flex justify-center">
                <BowlLoader className="w-4 h-4 animate-spin text-neutral-400" />
              </div>
            )}
            
            {!hasMore && options.length === 0 && (
              <div className="py-4 text-center text-sm text-neutral-400">
                No bowls found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
