"use client";

import React from "react";
import Link from "next/link";

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 h-16 transition-all duration-300">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/sign-in" className="flex items-center gap-2.5">
          <img 
            src="/cloudly_logo.png" 
            alt="ShoFlow" 
            className="w-13 h-9"
          />
          <span className="text-xl font-medium text-[#5f6368]">ShoFlow</span>
        </Link>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <Link 
            href="/sign-in"
            className="text-[#5f6368] font-medium hover:text-[#202124] transition-colors"
          >
            Sign in
          </Link>
          <Link 
            href="/sign-in"
            className="hidden sm:inline-flex justify-center items-center px-6 h-10 bg-[#1a73e8] text-white text-[14px] font-medium rounded-4 transition-all hover:bg-[#1867d6] rounded-md"
          >
            Go to Drive
          </Link>
        </div>
      </div>
    </header>
  );
}
