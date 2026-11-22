"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Search } from "lucide-react";
import { endpoints } from "@/lib/apiService";

interface AsyncCustomerSelectProps<T extends number | string = number> {
  value: T | 0;
  onChange: (id: T | 0) => void;
  onSelectFull?: (customer: any) => void;
  selectedCustomer?: any;
  placeholder?: string;
  allowAny?: boolean;
  valueKey?: "id" | "ulid";
}

export default function AsyncCustomerSelect<T extends number | string = number>({ value, onChange, onSelectFull, selectedCustomer, placeholder = "Select Customer...", allowAny = true, valueKey = "id" }: AsyncCustomerSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingNodeRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const pageRef = useRef(1);
  const inFlightRequestsRef = useRef(new Set<string>());

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
    const requestKey = `${searchTerm}:${pageNum}`;
    if (inFlightRequestsRef.current.has(requestKey)) return;
    inFlightRequestsRef.current.add(requestKey);
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const res = await endpoints.customers.list({ page: pageNum, limit: 10, search: searchTerm }) as any;
      const newItems = res.customers || [];
      const uniqueItems = [...new Map(newItems.map((item: any, index: number) => [item.ulid ?? item.id ?? index, item])).values()];
      if (isNewSearch) {
        setOptions(uniqueItems);
      } else {
        setOptions(prev => {
          const existingKeys = new Set(prev.map(item => item.ulid ?? item.id));
          return [...prev, ...uniqueItems.filter((item: any) => !existingKeys.has(item.ulid ?? item.id))];
        });
      }
      setHasMore(typeof res.totalCount === "number"
        ? pageNum * (res.limit || 10) < res.totalCount
        : newItems.length === 10);
    } catch (err) {
      console.error("Failed to load customers", err);
    } finally {
      inFlightRequestsRef.current.delete(requestKey);
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      pageRef.current = 1;
      setOptions([]);
      setHasMore(true);
      fetchOptions(1, debouncedSearch, true);
    }
  }, [debouncedSearch, isOpen]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore && !isLoadingRef.current) {
      const nextPage = pageRef.current + 1;
      pageRef.current = nextPage;
      void fetchOptions(nextPage, debouncedSearch, false);
    }
  }, [hasMore, debouncedSearch]);

  useEffect(() => {
    const option = { root: null, rootMargin: "20px", threshold: 0 };
    observerRef.current = new IntersectionObserver(handleObserver, option);
    if (loadingNodeRef.current) observerRef.current.observe(loadingNodeRef.current);
    
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [handleObserver]);

  const optionValue = (option: any) => option[valueKey] ?? option.ulid ?? option.id;
  const currentOption = options.find(option => String(optionValue(option)) === String(value)) || selectedCustomer;
  const displayLabel = value === 0 || value === "" ? placeholder : currentOption ? currentOption.name : placeholder;

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className={`w-full h-[44px] bg-neutral-50 rounded-xl px-4 flex items-center justify-between cursor-pointer transition-all border ${isOpen ? 'border-[#7c3aed] ring-2 ring-[#7c3aed]/20' : 'border-neutral-200'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-sm font-medium ${currentOption || (value !== 0 && value !== "") ? 'text-neutral-900' : 'text-neutral-500'} line-clamp-1`}>
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
                placeholder="Search customers..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-neutral-50 rounded-xl text-sm outline-none placeholder:text-neutral-400 text-neutral-900"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
            {allowAny && <div
              onClick={() => {
                onChange(0);
                setIsOpen(false);
                setSearch("");
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-between ${value === 0 ? 'bg-[#f3f0ff] text-[#7c3aed] font-semibold' : 'text-neutral-700 hover:bg-neutral-50'}`}
            >
              <span>Any Customer</span>
              {value === 0 && <div className="w-2 h-2 rounded-full bg-[#7c3aed]" />}
            </div>}
            
            {options.map((opt, idx) => {
              const optKey = opt.ulid ? `cust-${opt.ulid}` : opt.id !== undefined ? `cust-id-${opt.id}` : `cust-idx-${idx}`;
              const isSelected = String(optionValue(opt)) === String(value);
              return (
                <div 
                  key={optKey}
                  onClick={() => {
                    onChange(optionValue(opt));
                    if (onSelectFull) onSelectFull(opt);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-between group ${isSelected ? 'bg-[#f3f0ff] text-[#7c3aed] font-semibold' : 'text-neutral-900 hover:bg-neutral-50'}`}
                >
                  <div className="flex flex-col">
                    <span className="truncate">{opt.name}</span>
                    <span className="text-[10px] text-neutral-500">{opt.phone}</span>
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-[#7c3aed]" />
                  )}
                </div>
              );
            })}
            
            {hasMore && (
              <div ref={loadingNodeRef} className="py-3 flex min-h-2 justify-center">
                {isLoading && <BowlLoader className="w-4 h-4 text-neutral-400" />}
              </div>
            )}
            
            {!hasMore && options.length === 0 && (
              <div className="py-4 text-center text-sm text-neutral-400">
                No customers found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
