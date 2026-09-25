"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, Search, User, KeyRound, LogOut, Check, Menu } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { UserAvatar } from "./UserAvatar";
import { endpoints } from "@/lib/apiService";
import { formatTimeAgo } from "@/lib/timeUtils";

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Load system settings for R2 URL stitching
  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });

  useEffect(() => {
    async function fetchSystemSettings() {
      try {
        const data = await endpoints.settings.getSystemSettings();
        if (data && data.R2_BASE_URL !== undefined) {
          setSystemSettings({ R2_BASE_URL: data.R2_BASE_URL });
        }
      } catch (error) {
        console.error("Error fetching system settings in Header:", error);
      }
    }
    if (user) {
      fetchSystemSettings();
    }
  }, [user]);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    try {
      await logout();
      const loginRoute = user?.role === "delivery" ? "/delivery/login" : "/admin/login";
      router.push(loginRoute);
    } catch (err) {
      console.error("Logout failed", err);
      console.log("inside error");
    }
  };

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user || (user.role !== "admin" && user.role !== "delivery")) return;
    try {
      const res = await endpoints.notifications.get();
      setNotifications(res.notifications);
      setUnreadCount(res.unread_count);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 15 seconds
    const intervalId = setInterval(fetchNotifications, 15000);
    return () => clearInterval(intervalId);
  }, [user?.role]);

  const handleMarkRead = async (ulid: string) => {
    try {
      await endpoints.notifications.markRead(ulid);
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await endpoints.notifications.markAllRead();
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  // Derive initials or avatar letter from user email
  const avatarLetter = user?.email?.charAt(0).toUpperCase() ?? "A";

  const SEARCH_ROUTES = [
    { name: "Dashboard", path: "/admin/dashboard", keywords: "home main dashboard analytics" },
    { name: "Daily Orders", path: "/admin/orders", keywords: "orders daily queue dispatch list" },
    { name: "Customers", path: "/admin/customers", keywords: "clients users people customers list directory" },
    { name: "Create Customer", path: "/admin/customers/new", keywords: "new add create customer client" },
    { name: "Subscriptions", path: "/admin/subscriptions", keywords: "active subscriptions plans renewals" },
    { name: "Plans & Tiers", path: "/admin/plans", keywords: "plans tiers setup configure pricing" },
    { name: "Bowls & Menu", path: "/admin/bowls", keywords: "food bowls menu recipes dishes meals" },
    { name: "Ingredients", path: "/admin/ingredients", keywords: "raw materials ingredients stock inventory" },
    { name: "Menu Rotation", path: "/admin/menu-rotation", keywords: "menu rotate schedule calendar" },
    { name: "Users & Staff", path: "/admin/users", keywords: "staff admins drivers users team" },
    { name: "Deliveries & Drivers", path: "/admin/delivery", keywords: "delivery drivers dispatch routing maps" },
    { name: "System Settings", path: "/admin/settings", keywords: "system settings configuration config profile password rules" },
    { name: "Finance & Accounts", path: "/admin/finance", payment: "money accounting finance ledger revenue tax" },
    { name: "KDS: Prep", path: "/admin/kds/prep", keywords: "kitchen display prep cooking station" },
    { name: "KDS: Assembly", path: "/admin/kds/assembly", keywords: "kitchen display assembly station" },
    { name: "KDS: Packaging", path: "/admin/kds/packaging", keywords: "kitchen display packaging station" },
    { name: "KDS: Dispatch", path: "/admin/kds/dispatch", keywords: "kitchen display dispatch station" },
    { name: "Message Templates", path: "/admin/message-templates", keywords: "whatsapp email templates messages sms communications" },
  ];

  const filteredRoutes = searchQuery.trim() === "" 
    ? [] 
    : SEARCH_ROUTES.filter(r => 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (r.keywords || "").toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8); // show max 8 results

  return (
    <header className="flex items-center justify-between mb-8 relative z-40">
      {/* Mobile Hamburger */}
      <button
        type="button"
        className="md:hidden mr-3 text-neutral-600 hover:text-black transition-colors"
        onClick={() => window.dispatchEvent(new CustomEvent("toggle-mobile-sidebar"))}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Search Bar */}
      <div className="relative flex-1 sm:flex-initial sm:w-full max-w-[180px] sm:max-w-md mr-2 sm:mr-0" ref={searchRef}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSearchResults(true);
          }}
          onFocus={() => setShowSearchResults(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filteredRoutes.length > 0) {
              setShowSearchResults(false);
              setSearchQuery("");
              router.push(filteredRoutes[0].path);
            }
          }}
          placeholder="Search your today"
          className="w-full pl-10 pr-4 py-2 rounded-full border border-neutral-300 focus:outline-none focus:border-[#6A0FAD] focus:ring-1 focus:ring-[#6A0FAD] text-sm placeholder:text-neutral-400 bg-transparent text-black transition-all"
        />
        
        {showSearchResults && searchQuery.trim() !== "" && (
          <div className="absolute top-full left-0 mt-2 w-full sm:w-[350px] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-neutral-100 overflow-hidden z-50">
            {filteredRoutes.length > 0 ? (
              <div className="py-2">
                <div className="px-4 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Navigate to</div>
                {filteredRoutes.map((route, idx) => (
                  <button
                    key={route.path}
                    onClick={() => {
                      setShowSearchResults(false);
                      setSearchQuery("");
                      router.push(route.path);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-[#6A0FAD] transition-colors flex flex-col"
                  >
                    <span className="font-bold">{route.name}</span>
                    <span className="text-[10px] text-neutral-400 uppercase font-medium mt-0.5">{route.path}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-neutral-500 font-medium">
                No matching pages found
              </div>
            )}
          </div>
        )}
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
                <button onClick={handleMarkAllRead} className="text-[11px] text-neutral-500 hover:text-neutral-800 font-medium">
                  Mark all as read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-neutral-500">No new notifications</div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleMarkRead(notif.ulid)}
                      className={`px-4 py-3 border-b border-neutral-50 last:border-0 hover:bg-neutral-50 transition-colors cursor-pointer flex gap-3 ${
                        !notif.is_read ? "bg-blue-50/30" : ""
                      }`}
                    >
                      <div className="mt-0.5">
                        {!notif.is_read ? (
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                        ) : (
                          <Check className="w-3 h-3 text-neutral-400" />
                        )}
                      </div>
                      <div>
                        <p className={`text-sm ${!notif.is_read ? "text-neutral-800 font-medium" : "text-neutral-600"}`}>
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-neutral-400 mt-1">{formatTimeAgo(notif.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
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
            <UserAvatar user={user} r2BaseUrl={systemSettings?.R2_BASE_URL} className="w-full h-full" />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-neutral-100 overflow-hidden z-50">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
                <p className="text-sm font-semibold text-neutral-800 truncate">
                  {user?.full_name ?? user?.email?.split("@")[0] ?? "Admin"}
                </p>
                <p className="text-[11px] text-neutral-500 truncate">{user?.email ?? ""}</p>
              </div>

              {/* Actions */}
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    const profilePath = user?.role === "delivery" ? "/delivery/profile" : "/admin/profile";
                    router.push(profilePath);
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
                    // Delivery settings not implemented, fallback to profile or admin settings
                    const settingsPath = user?.role === "delivery" ? "/delivery/profile" : "/admin/settings";
                    router.push(settingsPath);
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
