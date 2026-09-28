"use client";

import React from "react";
import { Home, Utensils, BarChart2, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Plans", href: "/onboarding", icon: Utensils },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-6 py-4 flex justify-evenly items-center z-50 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.04)] max-w-md mx-auto w-full md:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
        const Icon = item.icon;

        return (
          <Link key={item.name} href={item.href} className={`flex flex-col items-center gap-1 cursor-pointer group transition-opacity ${isActive ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}>
            <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-gray-500 group-hover:text-gray-900'}`}>
              <Icon className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <span className={`text-[10px] font-bold ${isActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-900'}`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
