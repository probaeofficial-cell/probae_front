"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Search, Loader2 } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { Ingredient } from "@/lib/types";

interface AsyncIngredientSelectProps {
  value: number;
  onChange: (id: number, ingredient?: Ingredient) => void;
  selectedIngredient?: Ingredient | null;
  compact?: boolean;
}

export default function AsyncIngredientSelect({
  value,
  onChange,
  selectedIngredient,
  compact = false,
}: AsyncIngredientSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<Ingredient[]>([]);
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
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchOptions = useCallback(async (pageNum: number, searchQuery: string, isNewSearch: boolean) => {
    setIsLoading(true);
    try {
      const res = await endpoints.ingredients.getIngredients(pageNum, 15, searchQuery || undefined);
      const newItems: Ingredient[] = res.items || [];
      if (isNewSearch) {
        setOptions(newItems);
      } else {
        setOptions(prev => [...prev, ...newItems]);
      }
      setHasMore(pageNum < res.pages);
    } catch (err) {
      console.error("Failed to fetch ingredients", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchOptions(1, debouncedSearch, true);
    }
  }, [debouncedSearch, isOpen, fetchOptions]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore && !isLoading) {
      setPage(p => {
        const next = p + 1;
        fetchOptions(next, debouncedSearch, false);
        return next;
      });
    }
  }, [hasMore, isLoading, debouncedSearch, fetchOptions]);

  useEffect(() => {
    const option = { root: null, rootMargin: "20px", threshold: 0 };
    observerRef.current = new IntersectionObserver(handleObserver, option);
    if (loadingNodeRef.current) observerRef.current.observe(loadingNodeRef.current);
    return () => { if (observerRef.current) observerRef.current.disconnect(); };
  }, [handleObserver]);

  const currentOption = options.find(o => o.id === value) || selectedIngredient;
  const displayLabel = value === 0 ? "Select component..." : currentOption ? currentOption.name : "Select component...";

  return (
    <div className={`relative w-full ${isOpen ? "z-50" : "z-10"}`} ref={containerRef}>
      <div
        className={`w-full ${compact ? "h-full min-h-[36px]" : "h-[48px]"} bg-transparent flex items-center justify-between cursor-pointer px-2 gap-1`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-xs font-medium line-clamp-1 ${value === 0 ? "text-neutral-400" : "text-neutral-800"}`}>
          {displayLabel}
        </span>
        <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 w-72 mt-1 bg-white border border-neutral-200 rounded-xl shadow-2xl z-[9999] overflow-hidden flex flex-col">
          <div className="p-2 border-b border-neutral-100 flex items-center gap-2 bg-white">
            <Search className="w-4 h-4 text-neutral-400 ml-1 shrink-0" />
            <input
              type="text"
              placeholder="Search components..."
              className="flex-1 bg-transparent h-8 text-sm outline-none text-neutral-800 placeholder:text-neutral-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1 flex flex-col">
            {options.map(option => (
              <div
                key={option.id}
                onClick={() => {
                  onChange(option.id, option);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  value === option.id ? "bg-[#7020A3]/10 text-[#7020A3]" : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {option.name}
                {option.code && <span className="text-neutral-400 font-normal ml-1">[{option.code}]</span>}
              </div>
            ))}

            {options.length === 0 && !isLoading && (
              <div className="p-4 text-center text-xs text-neutral-500">No ingredients found.</div>
            )}

            <div ref={loadingNodeRef} className="py-2 flex justify-center">
              {isLoading && <BowlLoader className="w-4 h-4 text-neutral-400 animate-spin" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
