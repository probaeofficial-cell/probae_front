"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Bell, Search, User, KeyRound, LogOut, Check } from "lucide-react";

export function Header() {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  // Dummy notifications
  const notifications = [
    { id: 1, text: "Low stock alert: Tomatoes", time: "10m ago", read: false },
    { id: 2, text: "New order #1024 received", time: "1h ago", read: false },
    { id: 3, text: "System maintenance scheduled", time: "2h ago", read: true },
  ];

  return (
    <header className="flex items-center justify-between mb-8 relative z-50">
      {/* Search Bar */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input 
          type="text" 
          placeholder="Search your today" 
          className="w-full pl-10 pr-4 py-2 rounded-full border border-neutral-300 focus:outline-none focus:border-neutral-400 text-sm placeholder:text-neutral-400 bg-transparent text-black"
        />
      </div>
      
      {/* Right side icons */}
      <div className="flex items-center gap-4">
        
        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-neutral-300 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <Bell className="w-4 h-4" />
            Notifications <span className="bg-neutral-800 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">3</span>
          </button>

          {/* Notifications Modal / Popover */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-neutral-100 overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200 z-50">
              <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <span className="font-semibold text-neutral-800 text-sm">Notifications</span>
                <button className="text-[11px] text-neutral-500 hover:text-neutral-800 font-medium">Mark all as read</button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`px-4 py-3 border-b border-neutral-50 last:border-0 hover:bg-neutral-50 transition-colors cursor-pointer flex gap-3 ${!notif.read ? 'bg-blue-50/30' : ''}`}>
                    <div className="mt-0.5">
                      {!notif.read ? (
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      ) : (
                        <Check className="w-3 h-3 text-neutral-400" />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm ${!notif.read ? 'text-neutral-800 font-medium' : 'text-neutral-600'}`}>{notif.text}</p>
                      <p className="text-[10px] text-neutral-400 mt-1">{notif.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 text-center border-t border-neutral-100 bg-neutral-50/50">
                <button className="text-xs text-neutral-600 hover:text-black font-medium transition-colors">View all notifications</button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar with Hover Dropdown */}
        <div className="relative group">
          <div className="w-9 h-9 rounded-full bg-yellow-400 overflow-hidden border border-neutral-200 cursor-pointer">
            <img src="https://i.pravatar.cc/150?img=11" alt="User Avatar" className="w-full h-full object-cover" />
          </div>

          {/* Profile Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-neutral-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 transition-all duration-200 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
              <p className="text-sm font-semibold text-neutral-800">Admin User</p>
              <p className="text-[11px] text-neutral-500">admin@probae.com</p>
            </div>
            <div className="p-1">
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-xl transition-colors">
                <User className="w-4 h-4" />
                View Profile
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-xl transition-colors">
                <KeyRound className="w-4 h-4" />
                Change Password
              </button>
            </div>
            <div className="p-1 border-t border-neutral-100">
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
