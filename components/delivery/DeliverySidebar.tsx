"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, Truck, LogOut } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export function DeliverySidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setMobileOpen(prev => !prev);
    window.addEventListener("toggle-mobile-sidebar", handleToggle as EventListener);
    return () => window.removeEventListener("toggle-mobile-sidebar", handleToggle as EventListener);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isActive = pathname === "/delivery";

  const handleLogout = async () => {
    await logout();
    router.push("/delivery/login");
  };

  function SidebarContent() {
    return (
      <aside className={`flex flex-col h-full bg-[#141414] border-r border-[#2a2a2a] transition-all duration-300 ease-in-out ${collapsed ? "w-[70px]" : "w-[230px]"}`}>
        {/* Logo */}
        <div className={`flex items-center p-4 border-b border-[#2a2a2a] h-[64px] shrink-0 ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="w-7 h-7 bg-[#6A0FAD] rounded-lg flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <span className="text-white font-bold text-sm leading-none">Probae</span>
              <span className="block text-[10px] text-neutral-500 font-medium">Delivery Portal</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          <div className="relative group">
            <button
              onClick={() => router.push("/delivery")}
              className={`flex items-center transition-colors ${
                collapsed ? "w-10 h-10 justify-center mx-auto rounded-xl p-0" : "w-full gap-3 px-3 py-2.5 rounded-xl"
              } ${isActive ? "bg-[#6A0FAD] text-white font-semibold" : "text-neutral-400 hover:bg-[#2a2a2a] hover:text-white"}`}
            >
              <div className="flex items-center justify-center shrink-0">
                <Truck className="w-[18px] h-[18px]" />
              </div>
              {!collapsed && <span className="text-sm font-medium">My Deliveries</span>}
            </button>
            {collapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[9999]">
                <div className="bg-[#2a2a2a] border border-[#3a3a3a] text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">My Deliveries</div>
              </div>
            )}
          </div>
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-[#2a2a2a] space-y-2">
          {!collapsed && user && (
            <div className="px-3 py-2.5 bg-[#1e1e1e] rounded-xl mb-2">
              <p className="text-white text-sm font-bold truncate">{user.full_name || user.email}</p>
              <p className="text-neutral-500 text-[10px] mt-0.5">Delivery Agent</p>
            </div>
          )}

          <div className="relative group">
            <button
              onClick={handleLogout}
              className={`flex items-center transition-colors ${
                collapsed ? "w-10 h-10 justify-center mx-auto rounded-xl p-0" : "w-full gap-3 px-3 py-2.5 rounded-xl"
              } text-neutral-400 hover:bg-red-900/30 hover:text-red-400`}
            >
              <div className="flex items-center justify-center shrink-0">
                <LogOut className="w-[18px] h-[18px]" />
              </div>
              {!collapsed && <span className="text-sm font-medium">Logout</span>}
            </button>
            {collapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[9999]">
                <div className="bg-[#2a2a2a] border border-[#3a3a3a] text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">Logout</div>
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed(v => !v)}
            className={`flex items-center transition-colors text-neutral-400 hover:bg-[#2a2a2a] hover:text-white ${
              collapsed ? "w-10 h-10 justify-center mx-auto rounded-xl p-0" : "w-full gap-3 px-3 py-2.5 rounded-xl"
            }`}
          >
            <div className="flex items-center justify-center shrink-0">
              {collapsed ? <ChevronsRight className="w-[18px] h-[18px]" /> : <ChevronsLeft className="w-[18px] h-[18px]" />}
            </div>
            {!collapsed && <span className="text-sm font-medium">Collapse</span>}
          </button>

          {!collapsed && <p className="text-[11px] text-neutral-500 mt-2 px-3">© 2026 Probae</p>}
        </div>
      </aside>
    );
  }

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <div className="hidden md:flex h-full">
        <SidebarContent />
      </div>
      <div className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent />
      </div>
    </>
  );
}
