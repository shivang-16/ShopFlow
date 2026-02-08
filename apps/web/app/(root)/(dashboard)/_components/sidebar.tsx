"use client";

import React from "react";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Store
} from "lucide-react";
import { cn } from "../../../../lib/cn";
import { usePathname } from "next/navigation";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  // { icon: Store, label: "My Store", href: "/stores" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-100 flex-col fixed left-0 top-0 overflow-y-auto hidden lg:flex">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#72D5C1] rounded-xl flex items-center justify-center">
            <Store className="text-white w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-gray-800 leading-none">ShoFlow</span>
            <span className="text-xs text-gray-400 font-medium">Provisioning</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-[#72D5C1] text-white shadow-lg shadow-[#72D5C1]/20" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5",
                isActive ? "text-white" : "text-gray-400 group-hover:text-gray-900"
              )} />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Support</p>
          <button className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Help Center
          </button>
        </div>
      </div>
    </div>
  );
}
