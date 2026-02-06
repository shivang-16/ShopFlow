"use client";

import React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../../../../lib/cn";

interface StatCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isUp: boolean;
  };
  iconColor?: string;
}

export function StatCard({ label, value, subtext, icon: Icon, trend, iconColor = "text-[#72D5C1]" }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-[24px] border border-gray-100 hover:shadow-xl hover:shadow-[#72D5C1]/5 transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-gray-400 text-sm font-semibold mb-1 uppercase tracking-wider">{label}</p>
          <p className="text-xs text-gray-400 font-medium">{subtext}</p>
        </div>
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-50 group-hover:bg-[#72D5C1]/10 transition-colors",
          iconColor.replace('text', 'bg').replace('[', 'text-[').replace(']', ']/20')
        )}>
          <Icon className={cn("w-6 h-6", iconColor)} />
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-3xl font-bold text-gray-800 tracking-tight">{value}</h3>
        </div>
        
        {trend && (
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold",
            trend.isUp ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
          )}>
            {trend.isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {trend.value}
          </div>
        )}
      </div>
    </div>
  );
}
