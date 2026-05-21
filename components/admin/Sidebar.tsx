"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { MAIN_MENU, BOTTOM_MENU } from "@/lib/sidebarConfig";
import { useAuth } from "@/lib/AuthContext";

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [rawMaterialsOpen, setRawMaterialsOpen] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { logout } = useAuth();
  
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-expand sections when an active sub-item is detected
  useEffect(() => {
    if (MAIN_MENU.rawMaterials?.subItems) {
      const hasActiveSub = Object.values(MAIN_MENU.rawMaterials.subItems).some(
        (sub) => sub.path && (pathname === sub.path || pathname.startsWith(sub.path + "/"))
      );
      if (hasActiveSub) {
        setRawMaterialsOpen(true);
      }
    }
  }, [pathname]);

  const handleLogout = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // 1. Prevent the click from bubbling up and causing weird layout glitches
    e.preventDefault();
    e.stopPropagation();

    console.log("✅ Logout triggered! Firing API...");

    try {
      // 2. Wait for the logout API/redirect to fully complete FIRST
      await logout();
      
      // 3. Only close the dropdown AFTER it's successful
      setProfileDropdownOpen(false);
    } catch (error) {
      console.error("❌ Logout API call failed:", error);
    }
  };

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
    <aside
      className={`relative z-50 h-screen bg-[#1c1c1c] border-r border-[#2a2a2a] flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? "w-[80px]" : "w-[260px]"
      }`}
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
            />
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-black font-bold text-xl leading-none">
              P
            </div>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none py-6">
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
              const isOpen = hasSub && rawMaterialsOpen && !collapsed;

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
                    onClick={() => {
                      if (hasSub && !collapsed) {
                        setRawMaterialsOpen(!rawMaterialsOpen);
                      } else if (!hasSub && item.path) {
                        router.push(item.path);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                      isItemActive && !collapsed
                        ? "bg-[#7c26d9] text-white font-semibold"
                        : "text-neutral-400 hover:bg-[#2a2a2a] hover:text-white"
                    } ${collapsed ? "justify-center" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center ${
                          collapsed ? "w-10 h-10 rounded-xl" : ""
                        } ${
                          collapsed && isItemActive
                            ? "bg-[#7c26d9] text-white"
                            : ""
                        }`}
                      >
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                      {!collapsed && (
                        <span className="text-sm font-medium">{item.label}</span>
                      )}
                    </div>

                    {!collapsed && hasSub &&
                      (isOpen ? (
                        <ChevronUp className="w-4 h-4 text-neutral-300" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-400" />
                      ))}

                    {!collapsed && item.badge && !hasSub && (
                      <span className="bg-white text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </button>

                  {/* Tooltip for collapsed state */}
                  {collapsed && (
                    <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-white text-black text-xs font-semibold px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}

                  {/* Sub-items */}
                  {hasSub && isOpen && !collapsed && (
                    <ul className="mt-1 mb-2 space-y-1">
                      {Object.entries(item.subItems!).map(([subKey, sub]) => {
                        const isSubActive = sub.path
                          ? pathname === sub.path || pathname.startsWith(sub.path + "/")
                          : false;
                        return (
                          <li key={subKey}>
                            <button
                              type="button"
                              onClick={() => sub.path && router.push(sub.path)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors pl-11 ${
                                isSubActive
                                  ? "text-white bg-[#7c26d9]/15 font-semibold"
                                  : "text-neutral-400 hover:text-white hover:bg-[#2a2a2a]"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${sub.dotColor} ${
                                    isSubActive ? "ring-2 ring-[#7c26d9]/30" : ""
                                  }`}
                                />
                                <span className="text-sm">{sub.label}</span>
                              </div>
                              {sub.badge && (
                                <span className="bg-white text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                  {sub.badge}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* Collapsed sub-items */}
                  {hasSub && collapsed && (
                    <div className="flex flex-col items-center gap-2 mt-2">
                      {Object.entries(item.subItems!).map(([subKey, sub]) => {
                        const isSubActive = sub.path
                          ? pathname === sub.path || pathname.startsWith(sub.path + "/")
                          : false;
                        return (
                          <div
                            key={subKey}
                            className="relative group/sub w-full flex justify-center"
                          >
                            <button
                              type="button"
                              onClick={() => sub.path && router.push(sub.path)}
                              className={`w-8 h-8 rounded-xl border flex items-center justify-center hover:bg-[#2a2a2a] transition-colors ${
                                isSubActive
                                  ? "border-[#7c26d9] bg-[#7c26d9]/10"
                                  : "border-[#2a2a2a]"
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${sub.dotColor}`}
                              />
                            </button>
                            <div className="absolute left-12 top-1/2 -translate-y-1/2 bg-[#2a2a2a] border border-[#3a3a3a] text-white text-xs font-medium px-2.5 py-1.5 rounded-lg opacity-0 group-hover/sub:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                              {sub.label}
                            </div>
                          </div>
                        );
                      })}
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    isItemActive
                      ? "bg-[#7c26d9] text-white font-semibold"
                      : "text-neutral-400 hover:bg-[#2a2a2a] hover:text-white"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <div
                    className={`flex items-center justify-center ${
                      collapsed ? "w-10 h-10 rounded-xl" : ""
                    } ${
                      collapsed && isItemActive
                        ? "bg-[#7c26d9] text-white"
                        : ""
                    }`}
                  >
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
        <div className="relative" ref={profileRef}>
          {(() => {
            const isProfileActive = pathname === "/admin/profile" || pathname.startsWith("/admin/profile/");
            return (
              <>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen((prev) => !prev)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    isProfileActive
                      ? "bg-[#7c26d9] text-white font-semibold"
                      : "text-neutral-400 hover:bg-[#2a2a2a] hover:text-white"
                  } ${
                    collapsed ? "justify-center" : ""
                  } ${profileDropdownOpen ? "bg-[#2a2a2a] text-white" : ""}`}
                >
                  <div
                    className={`flex items-center justify-center ${
                      collapsed ? "w-10 h-10 rounded-xl" : ""
                    } ${
                      collapsed && isProfileActive
                        ? "bg-[#7c26d9] text-white"
                        : ""
                    }`}
                  >
                    <BOTTOM_MENU.profile.icon className="w-[18px] h-[18px]" />
                  </div>
                  {!collapsed && (
                    <span className="text-sm font-medium">Profile</span>
                  )}
                </button>

                {/* ── Profile Dropdown ──────────────────────────────────────
                    Positioned ABOVE the button via bottom-full.
                    z-[9999] ensures it sits on top of everything.
                    The parent `relative` div is the positioning anchor —
                    NOT the aside or any overflow-clipping ancestor.
                ─────────────────────────────────────────────────────────── */}
                {profileDropdownOpen && (
                  <div
                    className={`
                      absolute z-[9999]
                      ${collapsed ? "left-full top-0 ml-2" : "bottom-full left-0 mb-1 w-full"}
                      bg-[#242424] border border-[#3a3a3a] rounded-xl shadow-2xl overflow-hidden
                      min-w-[160px]
                    `}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        router.push("/admin/profile");
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-neutral-200 hover:bg-[#2f2f2f] hover:text-white transition-colors"
                    >
                      View Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        router.push("/admin/settings");
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-neutral-200 hover:bg-[#2f2f2f] hover:text-white transition-colors"
                    >
                      Change Password
                    </button>
                    <div className="h-[1px] bg-[#3a3a3a]" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-[#2f2f2f] hover:text-red-300 transition-colors font-semibold"
                    >
                      Log Out
                    </button>
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
  );
}

