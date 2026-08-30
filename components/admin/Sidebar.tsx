"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { MAIN_MENU, BOTTOM_MENU } from "@/lib/sidebarConfig";
import { endpoints } from "@/lib/apiService";

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const handleToggle = () => setMobileOpen(prev => !prev);
    window.addEventListener("toggle-mobile-sidebar", handleToggle as EventListener);
    return () => {
      window.removeEventListener("toggle-mobile-sidebar", handleToggle as EventListener);
    };
  }, []);
  
  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Ensure sidebar is never in collapsed state on mobile screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(false);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize(); // Check initially
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  const [lowStockCount, setLowStockCount] = useState<number>(0);
  useEffect(() => {
    const fetchLowStockCount = async () => {
      try {
        const data = await endpoints.rawMaterials.getLowStockCount();
        setLowStockCount(data.count);
      } catch (err) {
        console.error("Failed to fetch low stock count", err);
      }
    };
    fetchLowStockCount();
  }, [pathname]);

  const BowlIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 12h16a8 8 0 0 1-16 0z" />
      <path d="M4 12v-1c0-1.7 1.3-3 3-3h10c1.7 0 3 1.3 3 3v1" />
    </svg>
  );

  return (
    <>
    {/* Mobile Backdrop */}
    {mobileOpen && (
      <div 
        className="md:hidden fixed inset-0 bg-black/50 z-[90] backdrop-blur-sm" 
        onClick={() => setMobileOpen(false)} 
      />
    )}
    <aside
      className={`fixed md:relative z-[100] h-screen bg-[#1c1c1c] border-r border-[#2a2a2a] flex flex-col transition-transform md:transition-all duration-300 ease-in-out
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        ${collapsed ? "md:w-[80px] w-[260px]" : "w-[260px]"}
      `}
    >
      {/* ── Header / Logo ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between h-[80px] px-6 border-b border-[#2a2a2a]">
        {!collapsed ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <Image
              src="/images/logos/PB_Probae Logo - LabWhite Horizontal.png"
              alt="Probae Logo"
              width={110}
              height={28}
              priority
              className="object-contain"
              style={{ width: "auto", height: "auto" }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <Image
              src="/images/logos/2.svg"
              alt="Probae Logo Collapsed"
              width={32}
              height={32}
              priority
              className="object-contain"
            />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileOpen(false);
              } else {
                setCollapsed(true);
              }
            }}
            className="text-neutral-500 hover:text-white transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronsLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="absolute top-6 right-[-14px] bg-[#1c1c1c] border border-[#2a2a2a] rounded-full p-0.5 text-neutral-500 hover:text-white transition-colors z-10 hidden md:block"
          aria-label="Expand sidebar"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      )}

      {/* ── Scrollable Main Menu ───────────────────────────────────── */}
      <div className="flex-1 scrollbar-none py-6 overflow-y-auto overflow-x-hidden">
        <div className="px-4 mb-2">
          {!collapsed && (
            <p className="text-[11px] font-semibold text-neutral-500 tracking-wider mb-4 px-2 uppercase">
              Menu
            </p>
          )}

          <ul className="space-y-1">
            {Object.entries(MAIN_MENU).map(([menuKey, item]) => {
              const Icon = item.label === "Bowls" ? BowlIcon : item.icon;
              const hasSub = !!item.subItems;
              const isOpen = hasSub && openMenus[menuKey] && !collapsed;

              // Check if item path matches current path, or if any sub-items match
              const isItemActive = item.path
                ? pathname === item.path || pathname.startsWith(item.path + "/")
                : hasSub
                ? Object.values(item.subItems!).some(
                    (sub) => sub.path && (pathname === sub.path || pathname.startsWith(sub.path + "/"))
                  )
                : false;

              return (
                <li key={menuKey} className="relative group">
                  <button
                    type="button"
                    title={collapsed ? item.label : undefined}
                    onClick={() => {
                      if (hasSub) {
                        setOpenMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
                      } else if (item.path) {
                        router.push(item.path);
                      }
                    }}
                    className={`flex items-center transition-colors ${
                      collapsed
                        ? "w-10 h-10 justify-center mx-auto rounded-xl p-0"
                        : "w-full justify-between px-3 py-2.5 rounded-xl"
                    } ${
                      isItemActive
                        ? "bg-[#6A0FAD] text-white font-semibold"
                        : "text-neutral-400 hover:bg-[#2a2a2a] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center">
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                      {!collapsed && (
                        <span className="text-sm font-medium">{item.label}</span>
                      )}
                    </div>

                    {!collapsed && hasSub && (
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-300 ${
                          isOpen ? "rotate-180 text-neutral-300" : "text-neutral-400"
                        }`}
                      />
                    )}

                    {!collapsed && item.badge && !hasSub && (
                      <span className="bg-white text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </button>

                  

                  {/* Collapsed sub-items */}
                  {hasSub && collapsed && openMenus[menuKey] && (
                    <div className="flex flex-col items-center gap-2 mt-2 bg-[#2a2a2a]/30 py-2 rounded-xl">
                      {Object.entries(item.subItems!).map(([subKey, sub]) => {
                        const isSubActive = sub.path
                          ? pathname === sub.path || (pathname.startsWith(sub.path + "/") && !Object.values(item.subItems!).some(s => s.path && s.path !== sub.path && pathname.startsWith(s.path)))
                          : false;
                        return (
                          <div
                            key={subKey}
                            className="relative group/sub w-full flex justify-center"
                          >
                            <button
                              type="button"
                              onClick={() => sub.path && router.push(sub.path)}
                              title={sub.label}
                              className={`w-8 h-8 rounded-xl border flex items-center justify-center hover:bg-[#2a2a2a] transition-colors ${
                                isSubActive
                                  ? "border-[#6A0FAD] bg-[#6A0FAD]/10"
                                  : "border-transparent"
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${sub.dotColor}`}
                              />
                            </button>
                            
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Sub-items */}
                  {hasSub && !collapsed && (
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                        isOpen ? "grid-rows-[1fr] opacity-100 mt-1 mb-2" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <ul className="space-y-1">
                          {Object.entries(item.subItems!).map(([subKey, sub]) => {
                            const isSubActive = sub.path
                              ? pathname === sub.path || (pathname.startsWith(sub.path + "/") && !Object.values(item.subItems!).some(s => s.path && s.path !== sub.path && pathname.startsWith(s.path)))
                              : false;
                            return (
                              <li key={subKey}>
                                <button
                                  type="button"
                                  onClick={() => sub.path && router.push(sub.path)}
                              title={sub.label}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors pl-11 ${
                                    isSubActive
                                      ? "text-white bg-[#6A0FAD]/15 font-semibold"
                                      : "text-neutral-400 hover:text-white hover:bg-[#2a2a2a]"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${sub.dotColor} ${
                                        isSubActive ? "ring-2 ring-[#6A0FAD]/30" : ""
                                      }`}
                                    />
                                    <span className="text-sm">{sub.label}</span>
                                  </div>
                                  {(() => {
                                    const currentBadge = subKey === "stockMgt" ? (lowStockCount > 0 ? lowStockCount : undefined) : sub.badge;
                                    return currentBadge !== undefined ? (
                                      <span className="bg-white text-black text-[10px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center">
                                        {currentBadge}
                                      </span>
                                    ) : null;
                                  })()}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  )}


                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* ── Bottom Section ────────────────────────────────────────────
          This is intentionally kept OUTSIDE the overflow-y-auto div.
          The Profile dropdown is in its own `relative` container so
          it can break out upward with no overflow clipping.
      ─────────────────────────────────────────────────────────────── */}
      <div className="border-t border-[#2a2a2a] px-4 py-4 flex flex-col gap-1">

        {/* Settings and other non-profile bottom items */}
        {Object.entries(BOTTOM_MENU)
          .filter(([key]) => key !== "profile")
          .map(([menuKey, item]) => {
            const isItemActive = item.path
              ? pathname === item.path || pathname.startsWith(item.path + "/")
              : false;
            return (
              <div key={menuKey} className="relative group">
                <button
                  type="button"
                  onClick={() => item.path && router.push(item.path)}
                  className={`flex items-center transition-colors ${
                    collapsed
                      ? "w-10 h-10 justify-center mx-auto rounded-xl p-0"
                      : "w-full gap-3 px-3 py-2.5 rounded-xl"
                  } ${
                    isItemActive
                      ? "bg-[#6A0FAD] text-white font-semibold"
                      : "text-neutral-400 hover:bg-[#2a2a2a] hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <item.icon className="w-[18px] h-[18px]" />
                  </div>
                  {!collapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </button>

                {/* Tooltip when collapsed */}
                {collapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[9999]">
                    <div className="bg-[#2a2a2a] border border-[#3a3a3a] text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                      {item.label}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

        {/* ── Profile button — isolated in its own relative wrapper ── */}
        <div className="relative group">
          {(() => {
            const isProfileActive = pathname === "/admin/profile" || pathname.startsWith("/admin/profile/");
            return (
              <>
                <button
                  type="button"
                  onClick={() => router.push("/admin/profile")}
                  className={`flex items-center transition-colors ${
                    collapsed
                      ? "w-10 h-10 justify-center mx-auto rounded-xl p-0"
                      : "w-full gap-3 px-3 py-2.5 rounded-xl"
                  } ${
                    isProfileActive
                      ? "bg-[#6A0FAD] text-white font-semibold"
                      : "text-neutral-400 hover:bg-[#2a2a2a] hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <BOTTOM_MENU.profile.icon className="w-[18px] h-[18px]" />
                  </div>
                  {!collapsed && (
                    <span className="text-sm font-medium">Profile</span>
                  )}
                </button>

                {/* Tooltip when collapsed */}
                {collapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[9999]">
                    <div className="bg-[#2a2a2a] border border-[#3a3a3a] text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                      Profile
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Copyright */}
        {!collapsed ? (
          <p className="text-[11px] text-neutral-500 mt-3 px-3">
            © 2026 Probae Initiative Inc.
          </p>
        ) : (
          <div className="flex justify-center mt-3">
            <p className="text-[10px] text-neutral-500 [writing-mode:vertical-lr] rotate-180 h-32">
              © 2026 Probae
            </p>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}

