import React, { useState, useEffect } from "react";
import { X, Search, Loader2, Building2 } from "lucide-react";
import { Vendor } from "@/lib/types";
import { endpoints } from "@/lib/apiService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (vendor: Vendor | null) => void;
  selectedVendorUlid?: string | null;
}

export function SelectVendorModal({ isOpen, onClose, onSelect, selectedVendorUlid }: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    if (isOpen) {
      fetchVendors(page === 1);
    } else {
      setSearch("");
      setPage(1);
    }
  }, [isOpen, debouncedSearch, page]);

  const fetchVendors = async (reset: boolean = false) => {
    setIsLoading(true);
    try {
      const data = await endpoints.vendors.getVendors(page, 20, debouncedSearch);
      if (reset) {
        setVendors(data.items || []);
      } else {
        setVendors(prev => [...prev, ...(data.items || [])]);
      }
      setHasMore(data.page * data.page_size < data.total);
    } catch (error) {
      console.error("Failed to fetch vendors", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop === e.currentTarget.clientHeight;
    if (bottom && hasMore && !isLoading) {
      setPage(prev => prev + 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div 
        className="bg-white rounded-[32px] w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden relative border border-neutral-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100/50">
          <h2 className="text-xl font-extrabold text-neutral-800 tracking-tight">Select Vendor</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendors..."
              className="w-full h-12 pl-11 pr-4 bg-neutral-100/70 border border-transparent rounded-2xl focus:outline-none focus:ring-0 focus:bg-white focus:border-neutral-200 transition-all text-sm font-medium placeholder:text-neutral-400"
            />
          </div>

          {/* List */}
          <div 
            className="h-72 overflow-y-auto border border-neutral-100/50 rounded-2xl bg-[#fafafa] scrollbar-thin"
            onScroll={handleScroll}
          >
            {/* None Option */}
            <div
              onClick={() => {
                onSelect(null);
                onClose();
              }}
              className={`p-4 border-b border-neutral-100/50 cursor-pointer transition-colors flex items-center justify-between group hover:bg-white ${
                !selectedVendorUlid ? "bg-white" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center border border-neutral-200">
                  <Building2 className="w-4 h-4 text-neutral-400" />
                </div>
                <div>
                  <h4 className={`font-bold text-sm ${!selectedVendorUlid ? "text-[#6b21a8]" : "text-neutral-800"}`}>
                    None (Clear Vendor)
                  </h4>
                </div>
              </div>
              {!selectedVendorUlid && (
                <div className="w-3 h-3 rounded-full bg-[#6b21a8]" />
              )}
            </div>

            {isLoading && page === 1 ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="w-6 h-6 text-[#6b21a8] animate-spin" />
              </div>
            ) : vendors.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm font-semibold text-neutral-400">
                No vendors found.
              </div>
            ) : (
              <div className="flex flex-col pb-2">
                {vendors.map((v) => (
                  <div
                    key={v.ulid}
                    onClick={() => {
                      onSelect(v);
                      onClose();
                    }}
                    className={`p-4 border-b border-neutral-100/50 cursor-pointer transition-colors flex items-center justify-between group hover:bg-white ${
                      selectedVendorUlid === v.ulid ? "bg-white" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-neutral-200 shadow-sm">
                        <Building2 className="w-4 h-4 text-[#6b21a8]" />
                      </div>
                      <div>
                        <h4 className={`font-bold text-sm leading-tight ${selectedVendorUlid === v.ulid ? "text-[#6b21a8]" : "text-neutral-900"}`}>
                          {v.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight">
                            {v.code}
                          </span>
                          {v.description && (
                            <span className="text-[11px] text-neutral-400 font-medium line-clamp-1">
                              • {v.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {selectedVendorUlid === v.ulid && (
                      <div className="w-3 h-3 rounded-full bg-[#6b21a8]" />
                    )}
                  </div>
                ))}
                {isLoading && page > 1 && (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-5 h-5 text-[#6b21a8] animate-spin" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
