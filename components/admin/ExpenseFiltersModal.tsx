"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Filter, Search, X } from "lucide-react";
import { endpoints } from "@/lib/apiService";

export interface ExpenseFilters {
  category_ulid: string;
  date_from: string;
  date_to: string;
  min_amount: string;
  max_amount: string;
  sent_from: string;
  recorded_by: string;
  search: string;
}

interface CategoryOption {
  ulid: string;
  name: string;
  is_active?: boolean;
}

interface ExpenseFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilters: ExpenseFilters;
  paymentRecipients: string[];
  onApply: (filters: ExpenseFilters) => void;
}

const EMPTY_FILTERS: ExpenseFilters = {
  category_ulid: "",
  date_from: "",
  date_to: "",
  min_amount: "",
  max_amount: "",
  sent_from: "",
  recorded_by: "",
  search: "",
};

function monthForRange(filters: ExpenseFilters): string {
  if (!filters.date_from || !filters.date_to) return "";
  const month = filters.date_from.slice(0, 7);
  if (filters.date_to.slice(0, 7) !== month || filters.date_from !== `${month}-01`) return "";
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return filters.date_to === `${month}-${String(lastDay).padStart(2, "0")}` ? month : "";
}

export function ExpenseFiltersModal({
  isOpen,
  onClose,
  initialFilters,
  paymentRecipients,
  onApply,
}: ExpenseFiltersModalProps) {
  const [filters, setFilters] = useState(initialFilters);
  const [selectedMonth, setSelectedMonth] = useState(() => monthForRange(initialFilters));
  const [categoryName, setCategoryName] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [debouncedCategorySearch, setDebouncedCategorySearch] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryTotal, setCategoryTotal] = useState(0);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFilters(initialFilters);
      setSelectedMonth(monthForRange(initialFilters));
    }
  }, [isOpen, initialFilters]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCategorySearch(categorySearch), 300);
    return () => clearTimeout(timer);
  }, [categorySearch]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoadingCategories(true);
    setCategoryError("");
    endpoints.expenses.listCategories(false, categoryPage, 8, debouncedCategorySearch)
      .then((response: any) => {
        if (cancelled) return;
        setCategories(response.categories || []);
        setCategoryTotal(response.total_count || 0);
      })
      .catch(() => {
        if (!cancelled) setCategoryError("Could not load categories. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCategories(false);
      });
    return () => { cancelled = true; };
  }, [isOpen, categoryPage, debouncedCategorySearch]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const update = (key: keyof ExpenseFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const categoryPages = Math.max(1, Math.ceil(categoryTotal / 8));
  const validationError =
    filters.date_from && filters.date_to && filters.date_from > filters.date_to
      ? "The start date must be before the end date."
      : filters.min_amount && filters.max_amount && Number(filters.min_amount) > Number(filters.max_amount)
        ? "The minimum amount must not exceed the maximum amount."
        : "";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-filters-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-neutral-100 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#6A0FAD]/10 p-2.5 text-[#6A0FAD]"><Filter className="h-5 w-5" /></div>
            <div>
              <h2 id="expense-filters-title" className="text-xl font-black text-neutral-900">Filter expense logs</h2>
              <p className="mt-1 text-sm text-neutral-500">Combine any of these filters to narrow the results.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close filters" className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"><X className="h-5 w-5" /></button>
        </header>

        <div className="overflow-y-auto px-6 py-6 sm:px-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">Category</label>
              <div className="rounded-2xl border border-neutral-200 bg-white p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={categorySearch}
                    onChange={(event) => { setCategorySearch(event.target.value); setCategoryPage(1); }}
                    placeholder="Search all categories..."
                    className="h-10 w-full rounded-xl bg-neutral-50 pl-9 pr-3 text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-[#6A0FAD]/20"
                  />
                </div>
                <div className="mt-2 max-h-44 min-h-20 overflow-y-auto">
                  {isLoadingCategories ? (
                    <p className="py-6 text-center text-sm text-neutral-400">Loading categories…</p>
                  ) : categoryError ? (
                    <p className="py-6 text-center text-sm text-red-500">{categoryError}</p>
                  ) : categories.length === 0 ? (
                    <p className="py-6 text-center text-sm text-neutral-400">No categories match that search.</p>
                  ) : categories.map((category) => (
                    <button
                      key={category.ulid}
                      onClick={() => {
                        const selected = filters.category_ulid === category.ulid;
                        update("category_ulid", selected ? "" : category.ulid);
                        setCategoryName(selected ? "" : category.name);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${filters.category_ulid === category.ulid ? "bg-[#6A0FAD]/10 font-bold text-[#6A0FAD]" : "text-neutral-700 hover:bg-neutral-50"}`}
                    >
                      <span>{category.name}</span>
                      {!category.is_active && <span className="ml-2 text-[10px] font-bold uppercase text-neutral-400">Inactive</span>}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 text-xs text-neutral-500">
                  <span>{filters.category_ulid ? `Selected: ${categoryName || "Category"}` : `${categoryTotal} categories`}</span>
                  <div className="flex items-center gap-2">
                    <button aria-label="Previous category page" disabled={categoryPage <= 1 || isLoadingCategories} onClick={() => setCategoryPage((page) => Math.max(1, page - 1))} className="rounded-lg p-1.5 hover:bg-neutral-100 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                    <span>{categoryPage} / {categoryPages}</span>
                    <button aria-label="Next category page" disabled={categoryPage >= categoryPages || isLoadingCategories} onClick={() => setCategoryPage((page) => Math.min(categoryPages, page + 1))} className="rounded-lg p-1.5 hover:bg-neutral-100 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => {
                  const month = event.target.value;
                  setSelectedMonth(month);
                  if (month) {
                    const [year, monthNumber] = month.split("-").map(Number);
                    const monthStart = `${month}-01`;
                    const monthEnd = `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, "0")}`;
                    setFilters((current) => ({ ...current, date_from: monthStart, date_to: monthEnd }));
                  }
                }}
                className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm text-neutral-800 outline-none focus:border-[#6A0FAD]"
              />
              <p className="mt-1 text-xs text-neutral-400">Choosing a month fills the date range below.</p>
            </div>
            <div />
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">From date</label>
              <input type="date" value={filters.date_from} onChange={(event) => { setSelectedMonth(""); update("date_from", event.target.value); }} className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm text-neutral-800 outline-none focus:border-[#6A0FAD]" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">To date</label>
              <input type="date" value={filters.date_to} onChange={(event) => { setSelectedMonth(""); update("date_to", event.target.value); }} className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm text-neutral-800 outline-none focus:border-[#6A0FAD]" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">Minimum amount (₹)</label>
              <input type="number" min="0" step="0.01" value={filters.min_amount} onChange={(event) => update("min_amount", event.target.value)} placeholder="Any minimum" className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm text-neutral-800 outline-none focus:border-[#6A0FAD]" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">Maximum amount (₹)</label>
              <input type="number" min="0" step="0.01" value={filters.max_amount} onChange={(event) => update("max_amount", event.target.value)} placeholder="Any maximum" className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm text-neutral-800 outline-none focus:border-[#6A0FAD]" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">Paid from</label>
              <input list="expense-payment-recipients" value={filters.sent_from} onChange={(event) => update("sent_from", event.target.value)} placeholder="Any recipient" className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm text-neutral-800 outline-none focus:border-[#6A0FAD]" />
              <datalist id="expense-payment-recipients">
                {paymentRecipients.map((recipient) => <option key={recipient} value={recipient} />)}
              </datalist>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">Recorded by</label>
              <input value={filters.recorded_by} onChange={(event) => update("recorded_by", event.target.value)} placeholder="Search recorder name" className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm text-neutral-800 outline-none focus:border-[#6A0FAD]" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-500">Search notes and log details</label>
              <input value={filters.search} onChange={(event) => update("search", event.target.value)} placeholder="Search notes, category, recipient, or recorder" className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm text-neutral-800 outline-none focus:border-[#6A0FAD]" />
            </div>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-neutral-100 bg-neutral-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex flex-col items-start">
          <button onClick={() => { setFilters(EMPTY_FILTERS); setCategoryName(""); setSelectedMonth(""); }} className="px-2 py-2 text-sm font-bold text-neutral-500 hover:text-neutral-900">Clear all filters</button>
            {validationError && <span className="px-2 text-xs font-medium text-red-600">{validationError}</span>}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-neutral-600 hover:bg-neutral-100">Cancel</button>
            <button disabled={!!validationError} onClick={() => onApply(filters)} className="rounded-xl bg-[#6A0FAD] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#570c8d] disabled:cursor-not-allowed disabled:opacity-50">Apply filters</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export const EMPTY_EXPENSE_FILTERS = EMPTY_FILTERS;
