"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import type { Badge } from "@/lib/api/sections/badges";
import { getMediaUrl } from "@/lib/utils";

interface BadgeSelectProps {
  badges: Badge[];
  value: string;
  onChange: (ulid: string) => void;
  placeholder?: string;
}

export default function BadgeSelect({ badges, value, onChange, placeholder = "Select a badge" }: BadgeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedBadge = badges.find(badge => badge.ulid === value);
  const filteredBadges = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return badges;
    return badges.filter(badge => `${badge.name} ${badge.description || ""}`.toLowerCase().includes(query));
  }, [badges, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative mt-1 w-full" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(open => !open)}
        className={`flex w-full items-center justify-between rounded-xl border bg-neutral-50 p-3 text-left transition-colors ${isOpen ? "border-violet-500 ring-2 ring-violet-500/20" : "border-neutral-200"}`}
      >
        <span className={`flex min-w-0 items-center gap-3 truncate ${selectedBadge ? "text-neutral-900" : "text-neutral-500"}`}>
          {selectedBadge && <img src={getMediaUrl(selectedBadge.image_filename) || ""} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />}
          <span className="truncate">{selectedBadge ? `${selectedBadge.name} · ${selectedBadge.points} points` : placeholder}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[300] mt-2 max-h-80 w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
          <div className="border-b border-neutral-100 p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                autoFocus
                value={search}
                onChange={event => setSearch(event.target.value)}
                onClick={event => event.stopPropagation()}
                placeholder="Search badges…"
                className="h-10 w-full rounded-xl bg-neutral-50 pl-9 pr-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
              />
            </div>
          </div>
          <div role="listbox" className="max-h-60 overflow-y-auto p-1">
            {filteredBadges.length ? filteredBadges.map(badge => (
              <button
                key={badge.ulid}
                type="button"
                role="option"
                aria-selected={badge.ulid === value}
                onClick={() => { onChange(badge.ulid); setIsOpen(false); setSearch(""); }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${badge.ulid === value ? "bg-violet-50 text-violet-800" : "text-neutral-900 hover:bg-neutral-50"}`}
              >
                <img src={getMediaUrl(badge.image_filename) || ""} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{badge.name}</span>
                  <span className="block truncate text-xs text-violet-700">{badge.points} points</span>
                  {badge.description && <span className="block truncate text-xs text-neutral-500">{badge.description}</span>}
                </span>
                {badge.ulid === value && <Check className="h-4 w-4 shrink-0" />}
              </button>
            )) : <p className="px-3 py-6 text-center text-sm text-neutral-500">No badges found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
