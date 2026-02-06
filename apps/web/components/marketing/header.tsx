"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Header() {
  return (
    <header className="fixed top-0 w-full bg-white/95 dark:bg-[#18191a]/95 backdrop-blur-sm z-50 transition-colors">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          {/* Reusing the Google Drive Logo for consistency */}
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/d/da/Google_Drive_logo_%282020%29.svg"
            alt="Google Drive"
            className="w-8 h-8"
          />
          <span className="text-[22px] font-normal text-[#5f6368] dark:text-[#e3e3e3] mb-0.5">Google Drive</span>
        </Link>
        <div className="flex items-center gap-4">
           {/* Navigation links could go here if needed */}
        </div>
        
        <div className="flex items-center gap-4">
            <Link
                href="/sign-in"
                className="text-base font-medium text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-blue-50 dark:hover:bg-[#1e1e1e] px-6 py-2.5 rounded-sm transition-colors"
                >
                Sign in
            </Link>
             <Link
                href="/sign-up"
                className="hidden md:inline-flex items-center text-base font-medium text-[#1a73e8] dark:text-[#8ab4f8] border border-[#dadce0] dark:border-[#5f6368] px-6 py-2.5 rounded-sm hover:bg-gray-50 dark:hover:bg-[#303134] transition-colors"
              >
               Try Drive for work
            </Link>
             <Link
                href="/drive"
                className="inline-flex items-center text-base font-medium text-white bg-[#1a73e8] hover:bg-[#1867d6] px-6 py-2.5 rounded-sm transition-colors shadow-sm"
              >
               Go to Drive
            </Link>
        </div>
      </div>
    </header>
  );
}
