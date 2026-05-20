"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { MAIN_MENU, BOTTOM_MENU } from "@/lib/sidebarConfig";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [rawMaterialsOpen, setRawMaterialsOpen] = useState(true);

  // Custom Bowl Icon to match the design better if needed, or stick to a lucide icon
  const BowlIcon = (props: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 12h16a8 8 0 0 1-16 0z" />
      <path d="M4 12v-1c0-1.7 1.3-3 3-3h10c1.7 0 3 1.3 3 3v1" />
    </svg>
  );

  return (
    <aside
      className={`relative h-screen bg-[#1c1c1c] border-r border-[#2a2a2a] flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? "w-[80px]" : "w-[260px]"
      }`}
    >
      {/* Header / Logo */}
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

      {/* Expand button when collapsed (optional based on preference, or just click the P logo) */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="absolute top-6 right-[-14px] bg-[#1c1c1c] border border-[#2a2a2a] rounded-full p-0.5 text-neutral-500 hover:text-white transition-colors z-10 hidden md:block"
          aria-label="Expand sidebar"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      )}

      {/* Scrollable Menu Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none py-6">
        {/* Menu Section */}
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
              
              return (
                <li key={menuKey} className="relative group">
                  <button
                    onClick={() => {
                      if (hasSub && !collapsed) {
                        setRawMaterialsOpen(!rawMaterialsOpen);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                      item.active && !collapsed
                        ? "bg-[#7c26d9] text-white"
                        : "text-neutral-400 hover:bg-[#2a2a2a] hover:text-white"
                    } ${collapsed ? "justify-center" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center ${collapsed ? "w-10 h-10 rounded-xl" : ""} ${
                        collapsed && item.active ? "bg-[#7c26d9] text-white" : ""
                      }`}>
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                      {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                    </div>

                    {!collapsed && hasSub && (
                      isOpen ? <ChevronUp className="w-4 h-4 text-neutral-300" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                    
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
                      {Object.entries(item.subItems!).map(([subKey, sub]) => (
                        <li key={subKey}>
                          <button className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-[#2a2a2a] transition-colors pl-11">
                            <div className="flex items-center gap-3">
                              <span className={`w-1.5 h-1.5 rounded-full ${sub.dotColor}`}></span>
                              <span className="text-sm">{sub.label}</span>
                            </div>
                            {sub.badge && (
                              <span className="bg-white text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                {sub.badge}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Sub-items for collapsed state (showing just dots) */}
                  {hasSub && collapsed && (
                    <div className="flex flex-col items-center gap-2 mt-2">
                      {Object.entries(item.subItems!).map(([subKey, sub]) => (
                        <div key={subKey} className="relative group/sub w-full flex justify-center">
                          <button className="w-8 h-8 rounded-xl border border-[#2a2a2a] flex items-center justify-center hover:bg-[#2a2a2a] transition-colors">
                            <span className={`w-2 h-2 rounded-full ${sub.dotColor}`}></span>
                          </button>
                          
                          {/* Tooltip for sub-item */}
                          <div className="absolute left-12 top-1/2 -translate-y-1/2 bg-[#2a2a2a] border border-[#3a3a3a] text-white text-xs font-medium px-2.5 py-1.5 rounded-lg opacity-0 group-hover/sub:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                            {sub.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="px-4 py-6 border-t border-[#2a2a2a]">
        <ul className="space-y-1 mb-8">
          {Object.entries(BOTTOM_MENU).map(([menuKey, item]) => (
            <li key={menuKey} className="relative group">
              <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral-400 hover:bg-[#2a2a2a] hover:text-white transition-colors ${collapsed ? "justify-center" : ""}`}>
                <div className={`flex items-center justify-center ${collapsed ? "w-10 h-10 rounded-xl hover:bg-[#2a2a2a]" : ""}`}>
                  <item.icon className="w-[18px] h-[18px]" />
                </div>
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </button>

              {collapsed && (
                <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-[#2a2a2a] border border-[#3a3a3a] text-white text-xs font-medium px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                  {item.label}
                </div>
              )}
            </li>
          ))}
        </ul>

        {!collapsed ? (
          <div className="px-3">
            <p className="text-[11px] text-neutral-500">
              © 2026 Probae Initiative Inc.
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            <p className="text-[10px] text-neutral-500 [writing-mode:vertical-lr] rotate-180 h-32">
              © 2026 Probae
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
