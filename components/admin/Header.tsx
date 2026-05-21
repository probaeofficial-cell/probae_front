"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, Search, User, KeyRound, LogOut, Check } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    try {
      await logout();
      router.push("/admin/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  // Dummy notifications
  const notifications = [
    { id: 1, text: "Low stock alert: Tomatoes", time: "10m ago", read: false },
    { id: 2, text: "New order #1024 received", time: "1h ago", read: false },
    { id: 3, text: "System maintenance scheduled", time: "2h ago", read: true },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Derive initials or avatar letter from user email
  const avatarLetter = user?.email?.charAt(0).toUpperCase() ?? "A";

  return (
    <header className="flex items-center justify-between mb-8 relative z-40">
      {/* Search Bar */}
      <div className="relative flex-1 sm:flex-initial sm:w-full max-w-[180px] sm:max-w-md mr-2 sm:mr-0">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Search your today"
          className="w-full pl-10 pr-4 py-2 rounded-full border border-neutral-300 focus:outline-none focus:border-neutral-400 text-sm placeholder:text-neutral-400 bg-transparent text-black"
        />
      </div>

      {/* Right side icons */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">

        {/* ── Notifications ───────────────────────────────────────── */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setIsNotifOpen((prev) => !prev);
              setIsProfileOpen(false);
            }}
            className="flex items-center justify-center sm:justify-start gap-2 w-9 h-9 sm:w-auto sm:h-auto px-0 sm:px-4 py-0 sm:py-1.5 rounded-full border border-neutral-300 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
            {unreadCount > 0 && (
              <span className="bg-neutral-800 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold sm:static absolute -top-1 -right-1 sm:translate-x-0 sm:translate-y-0">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-[280px] sm:w-80 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-neutral-100 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <span className="font-semibold text-neutral-800 text-sm">Notifications</span>
                <button className="text-[11px] text-neutral-500 hover:text-neutral-800 font-medium">
                  Mark all as read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 border-b border-neutral-50 last:border-0 hover:bg-neutral-50 transition-colors cursor-pointer flex gap-3 ${
                      !notif.read ? "bg-blue-50/30" : ""
                    }`}
                  >
                    <div className="mt-0.5">
                      {!notif.read ? (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      ) : (
                        <Check className="w-3 h-3 text-neutral-400" />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm ${!notif.read ? "text-neutral-800 font-medium" : "text-neutral-600"}`}>
                        {notif.text}
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-1">{notif.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 text-center border-t border-neutral-100 bg-neutral-50/50">
                <button className="text-xs text-neutral-600 hover:text-black font-medium transition-colors">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Profile Avatar with Click Dropdown ──────────────────── */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setIsProfileOpen((prev) => !prev);
              setIsNotifOpen(false);
            }}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow-md hover:scale-105 transition-transform cursor-pointer overflow-hidden"
          >
            {user?.profile_picture?.file_url ? (
              <img
                src={user.profile_picture.file_url}
                alt="Profile Avatar"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              avatarLetter
            )}
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-neutral-100 overflow-hidden z-50">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
                <p className="text-sm font-semibold text-neutral-800 truncate">
                  {user?.email?.split("@")[0] ?? "Admin"}
                </p>
                <p className="text-[11px] text-neutral-500 truncate">{user?.email ?? ""}</p>
              </div>

              {/* Actions */}
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    router.push("/admin/profile");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  <User className="w-4 h-4" />
                  View Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    router.push("/admin/settings");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  <KeyRound className="w-4 h-4" />
                  Change Password
                </button>
              </div>

              {/* Logout */}
              <div className="p-1 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
