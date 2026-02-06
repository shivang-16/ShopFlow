"use client";

import { useEffect, useState } from "react";
import { TopNav } from "./_components/top-nav";
import { StoreList } from "./_components/store-list";
import { cn } from "../../../lib/cn";
import { 
  Plus, 
  Store as StoreIcon, 
  Users,
  Calendar,
  ChevronDown,
  Search,
  TrendingUp,
  Loader2
} from "lucide-react";
import { storeApi, Store } from "../../../lib/api/stores";

export default function Home() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);

  const fetchStores = async () => {
    try {
      const data = await storeApi.getAll();
      setStores(data);
    } catch (error) {
      console.error("Failed to load stores", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStore = async () => {
    const name = window.prompt("Enter store name:");
    if (!name) return;

    setCreating(true);
    try {
      await storeApi.create(name, "WOOCOMMERCE");
      fetchStores();
    } catch (error) {
      alert("Failed to create store");
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[#F9FAFB]">
      <TopNav />
      
      <main className="flex-1 p-8 space-y-8 max-w-[1600px] mx-auto w-full">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Your Store at a Glance</h1>
            <p className="text-sm text-gray-500 font-medium tracking-tight">Real-time snapshot of revenue, orders, and customers</p>
          </div>
          <button 
            onClick={handleCreateStore}
            disabled={creating}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#10B981] text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Plus className="w-4 h-4 text-white" />}
            {creating ? "Creating..." : "Create Store"}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-6">
              <span className="text-sm font-bold text-gray-900 tracking-tight">Revenue Today</span>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">$</div>
              </div>
            </div>
            <h3 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">$12,840</h3>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-500 tracking-tight">
              <span>+5,50%</span>
              <span className="text-gray-400 font-medium ml-1 tracking-normal">from Yesterday</span>
            </div>
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl group-hover:bg-blue-100/50 transition-colors" />
          </div>

          <div className="bg-[#ECFDF5] p-6 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-6">
              <span className="text-sm font-bold text-gray-900 tracking-tight">Orders Complete</span>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
                <StoreIcon className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
            <h3 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">287</h3>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 tracking-tight">
              <span>+6,20%</span>
              <span className="text-gray-400 font-medium ml-1 tracking-normal">from Yesterday</span>
            </div>
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-emerald-50 rounded-full blur-3xl group-hover:bg-emerald-100 transition-colors opacity-50" />
          </div>

          <div className="bg-[#EFF6FF] p-6 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-6">
              <span className="text-sm font-bold text-gray-900 tracking-tight">Returning Customer</span>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                <Users className="w-5 h-5 text-blue-500 drop-shadow-sm" />
              </div>
            </div>
            <h3 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">84</h3>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 tracking-tight">
              <span>+8,20%</span>
              <span className="text-gray-400 font-medium ml-1 tracking-normal">from Yesterday</span>
            </div>
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-blue-50 rounded-full blur-3xl group-hover:bg-blue-100 transition-colors opacity-50" />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Charts Section */}
          <div className="xl:col-span-2 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Orders Analyticsc</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Income</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Expense</span>
                  </div>
                </div>
              </div>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-900 hover:bg-gray-100 transition-all">
                <Calendar className="w-4 h-4 text-gray-400" />
                This Year
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {/* Custom SVG Chart */}
            <div className="relative h-[300px] w-full mt-12 bg-gradient-to-t from-gray-50/50 to-transparent rounded-xl overflow-hidden">
               <svg viewBox="0 0 800 300" className="w-full h-full">
                  {/* Grid Lines */}
                  {[0, 1, 2, 3].map((i) => (
                    <line key={i} x1="0" y1={300 - i * 75} x2="800" y2={300 - i * 75} stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4 4" />
                  ))}
                  
                  {/* Income Path */}
                  <path 
                    d="M0 250 Q 100 240, 200 220 T 400 150 T 600 200 T 800 100" 
                    fill="none" 
                    stroke="#10B981" 
                    strokeWidth="4" 
                    strokeLinecap="round"
                    className="drop-shadow-[0_8px_16px_rgba(16,185,129,0.3)]"
                  />
                  {/* Expense Path */}
                  <path 
                    d="M0 280 Q 150 260, 300 240 T 500 220 T 700 240 T 800 260" 
                    fill="none" 
                    stroke="#3B82F6" 
                    strokeWidth="4" 
                    strokeLinecap="round"
                    className="drop-shadow-[0_8px_16px_rgba(59,130,246,0.3)]"
                  />
                  
                  {/* Data Point Tooltip Mockup */}
                  <circle cx="400" cy="150" r="6" fill="#10B981" stroke="white" strokeWidth="3" />
                  <rect x="380" y="70" width="80" height="40" rx="8" fill="#1F2937" />
                  <text x="420" y="88" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">$523.000</text>
                  <text x="420" y="102" textAnchor="middle" fill="#9CA3AF" fontSize="10">July 4</text>
               </svg>
               
               {/* Month Labels */}
               <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                 {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => <span key={m}>{m}</span>)}
               </div>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-1">
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Top Sales</h3>
                <div className="w-4 h-4 rounded-full border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400">?</div>
              </div>
              <button className="text-[#0D9488] text-sm font-bold hover:underline">See Details</button>
            </div>
            
            <div className="space-y-8 flex-1">
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <TrendingUp className="w-5 h-5 text-blue-500" />
                       <span className="text-3xl font-black text-gray-900 tracking-tighter">10,432</span>
                       <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">+512</span>
                    </div>
                  </div>
                  
                  {/* Bar Chart Mockup */}
                  <div className="flex gap-1 items-end h-[60px]">
                    {[40, 60, 30, 80, 50, 90, 70, 45, 65, 55, 75, 85, 45, 60, 95, 70, 50, 40, 60, 80, 90, 70].map((h, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "flex-1 rounded-t-sm transition-all hover:scale-110 cursor-pointer",
                          i % 2 === 0 ? "bg-blue-500/20" : "bg-[#10B981]/20",
                          i === 14 && "bg-blue-500"
                        )} 
                        style={{ height: `${h}%` }} 
                      />
                    ))}
                  </div>
               </div>
               
               <div className="space-y-6 pt-4 border-t border-gray-50">
                  {[
                    { label: "Smartphones", units: "300 Units", color: "bg-emerald-500" },
                    { label: "Laptops", units: "500 Units", color: "bg-blue-500" },
                    { label: "Smart TVs", units: "237 Units", color: "bg-cyan-500" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-3">
                         <div className={cn("w-2 h-4 rounded-sm", item.color)} />
                         <div>
                            <p className="text-sm font-bold text-gray-900 tracking-tight">{item.label}</p>
                            <p className="text-xs text-gray-400 font-medium">{item.units}</p>
                         </div>
                      </div>
                      <Plus className="w-4 h-4 text-gray-300 group-hover:text-gray-900 transition-colors" />
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>

        {/* Store List / Products Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
           <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Products</h3>
              <div className="flex items-center gap-4">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search Product..." 
                      className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none w-64 focus:bg-white transition-all"
                    />
                 </div>
                 <button className="px-4 py-2 border border-gray-100 rounded-lg text-sm font-bold text-gray-900 flex items-center gap-2 hover:bg-gray-50">
                    All Status
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                 </button>
                 <button className="px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-teal-500/20 hover:bg-teal-700 transition-all">
                    Add New Product
                    <div className="w-4 h-4 rounded-full border border-white/30 flex items-center justify-center">+</div>
                 </button>
              </div>
           </div>
           
           <div className="p-0">
             <StoreList stores={stores} loading={loading} />
           </div>
        </div>
      </main>
    </div>
  );
}
