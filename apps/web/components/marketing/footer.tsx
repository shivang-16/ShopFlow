import React from "react";
import { Youtube, Twitter, Facebook } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#f8f9fa] dark:bg-[#18191a] border-t border-[#dadce0] dark:border-[#444746] pt-12 pb-8">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
           <div className="flex items-center gap-6">
             <span className="text-[#5f6368] dark:text-[#9aa0a6] flex items-center gap-2">
               <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png" alt="Google" className="w-6 h-6 opacity-70" />
               <span className="text-xl font-medium tracking-tight">Google</span>
             </span>
             <a href="#" className="text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e3e3e3] text-sm">Privacy</a>
             <a href="#" className="text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e3e3e3] text-sm">Terms</a>
             <a href="#" className="text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e3e3e3] text-sm">About Google</a>
           </div>
           
           <div className="flex items-center gap-6">
              <a href="#" className="text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e3e3e3]"><Youtube size={20} /></a>
              <a href="#" className="text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e3e3e3]"><Twitter size={20} /></a>
              <a href="#" className="text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e3e3e3]"><Facebook size={20} /></a>
           </div>
        </div>
      </div>
    </footer>
  );
}
