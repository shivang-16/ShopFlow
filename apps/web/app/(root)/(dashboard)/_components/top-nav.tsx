"use client";

import React from "react";
import { Search, Bell, ChevronDown, Home as HomeIcon, Package } from "lucide-react";

export function TopNav() {
  return (
    <header className="h-20 bg-[#F9FAFB] z-30 px-8 flex items-center justify-between gap-8 border-b border-gray-100 uppercase font-bold text-xs tracking-widest text-gray-400">
      <div className="flex items-center gap-2">
        <HomeIcon className="w-3.5 h-3.5" />
        <span>Dashboards</span>
        <span className="text-gray-300">/</span>
        <Package className="w-3.5 h-3.5 ml-1" />
        <span className="text-gray-800 tracking-tight">Data</span>
      </div>

      <div className="flex-1 max-w-2xl px-12 capitalize font-medium text-sm tracking-normal">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#72D5C1] transition-colors" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full h-10 pl-11 pr-4 bg-white border border-gray-100 rounded-xl focus:border-[#72D5C1] focus:ring-4 focus:ring-[#72D5C1]/5 transition-all outline-none text-sm font-medium shadow-sm"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
            <span>⌘</span>
            <span>+</span>
            <span>F</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative w-10 h-10 flex items-center justify-center bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#72D5C1] rounded-full border-2 border-white" />
        </button>

        <button className="h-10 px-4 flex items-center gap-2 bg-[#72D5C1] rounded-xl hover:bg-[#5fc9b3] transition-all shadow-lg shadow-[#72D5C1]/20 group capitalize font-bold text-sm tracking-normal">
          <span className="text-white">Export</span>
          <ChevronDown className="w-4 h-4 text-white group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>
    </header>
  );
}
