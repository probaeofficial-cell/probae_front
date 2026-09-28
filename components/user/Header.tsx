"use client";

import React from "react";
import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import FadeInUp from "@/components/animations/FadeInUp";

export default function Header() {
  const pathname = usePathname();

  const navLinks = [
    { name: "Home",  href: "/" },
    { name: "Menu",  href: "/menu" },
    { name: "Plans", href: "/plans" },
  ];

  return (
    <FadeInUp 
      yOffset={-40} 
      duration={1} 
      trigger="mount"
      className="fixed top-4 md:top-8 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto md:right-auto z-40 flex justify-center"
    >
      <header className="flex justify-between items-center px-4 md:px-6 py-3 md:py-4 w-full md:min-w-[800px] bg-white/95 backdrop-blur-xl border border-white/50 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 md:gap-2 cursor-pointer shrink-0">
          <Image src="/images/PB_Probae - LogoMark.png" alt="Probae Logo" width={24} height={24} className="object-contain w-5 h-5 md:w-7 md:h-7" />
          <Image src="/images/PB_Probae - Wordmark.png" alt="Probae" width={70} height={20} className="object-contain w-14 h-4 md:w-20 md:h-6 hidden sm:block" />
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-4 sm:gap-6 md:gap-10">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/');
            return (
              <Link 
                key={link.name}
                href={link.href}
                className={`text-sm md:text-base font-semibold transition-colors cursor-pointer ${
                  isActive 
                    ? "text-primary border-b-2 border-primary pb-0.5" 
                    : "text-gray-500 hover:text-gray-900 pb-0.5"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Search Icon */}
        <button className="p-2 -mr-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors shrink-0">
          <Search className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </header>
    </FadeInUp>
  );
}
