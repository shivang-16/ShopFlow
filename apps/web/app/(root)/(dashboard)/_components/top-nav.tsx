"use client";

import React from "react";
import { Search, Bell, Calendar, User, ChevronDown } from "lucide-react";

export function TopNav() {
  return (
    <header className="h-20 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-8 flex items-center justify-between gap-8 border-b border-gray-100">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#72D5C1] transition-colors" />
          <input 
            type="text" 
            placeholder="Search dashboard..." 
            className="w-full h-11 pl-12 pr-4 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-[#72D5C1] focus:ring-4 focus:ring-[#72D5C1]/10 transition-all outline-none text-sm font-medium"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative w-11 h-11 flex items-center justify-center bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-all">
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>

        <button className="h-11 px-4 flex items-center gap-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-all">
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-semibold text-gray-600">Jul 2023</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>

        <div className="h-10 w-px bg-gray-100 mx-2" />

        <div className="flex items-center gap-3 pl-2 group cursor-pointer">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-gray-800">Admin User</span>
            <span className="text-xs font-medium text-gray-400">Platform Manager</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#72D5C1] to-[#5fc9b3] flex items-center justify-center text-white ring-2 ring-transparent group-hover:ring-[#72D5C1]/20 transition-all overflow-hidden border-2 border-white shadow-md">
             <User className="w-6 h-6" />
          </div>
        </div>
      </div>
    </header>
  );
}
