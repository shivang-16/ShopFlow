"use client";

import { useEffect, useState } from "react";
import { TopNav } from "./_components/top-nav";
import { StatCard } from "./_components/stat-card";
import { StoreList } from "./_components/store-list";
import { cn } from "../../../lib/cn";
import { 
  Plus, 
  Store as StoreIcon, 
  Zap, 
  AlertCircle, 
  CheckCircle2,
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

  useEffect(() => {
    fetchStores();
    // Poll every 5 seconds for status updates
    const interval = setInterval(fetchStores, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateStore = async () => {
    // Simple prompt for now, replaced by modal later
    const name = window.prompt("Enter store name:");
    if (!name) return;

    setCreating(true);
    try {
      await storeApi.create(name, "WOOCOMMERCE");
      fetchStores(); // Refresh list immediately
    } catch (error) {
      alert("Failed to create store");
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const stats = {
    total: stores.length,
    provisioning: stores.filter(s => s.status === 'PROVISIONING').length,
    ready: stores.filter(s => s.status === 'READY').length,
    failed: stores.filter(s => s.status === 'FAILED').length
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50">
      <TopNav />
      
      <main className="flex-1 p-8 space-y-8 max-w-[1600px] mx-auto w-full">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Overview</h1>
            <p className="text-sm text-gray-400 font-medium">Monitoring your store ecosystem</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">
              Export Stats
            </button>
            <button 
              onClick={handleCreateStore}
              disabled={creating}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin text-[#72D5C1]" /> : <Plus className="w-4 h-4 text-[#72D5C1]" />}
              {creating ? "Creating..." : "Quick Action"}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard 
            label="Total Stores"
            value={stats.total.toString()}
            subtext="Active in last 30 days"
            icon={StoreIcon}
            trend={{ value: "+2", isUp: true }}
          />
          <StatCard 
            label="Provisioning"
            value={stats.provisioning.toString()}
            subtext="Currently building"
            icon={Zap}
            trend={{ value: "5 min avg", isUp: true }}
            iconColor="text-blue-500"
          />
          <StatCard 
            label="Healthy Stores"
            value={stats.ready.toString()}
            subtext="Uptime 99.9%"
            icon={CheckCircle2}
            trend={{ value: "100%", isUp: true }}
            iconColor="text-green-500"
          />
          <StatCard 
            label="Failed"
            value={stats.failed.toString()}
            subtext="Requires attention"
            icon={AlertCircle}
            trend={{ value: "-50%", isUp: false }}
            iconColor="text-red-500"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
            <StoreList stores={stores} loading={loading} onCreate={handleCreateStore} />
          </div>
          
          <div className="space-y-8">
            {/* Sales Target Style Card */}
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-gray-800">Resource Quota</h3>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">CPU Usage</span>
                    <span className="text-gray-800 font-bold">65%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#72D5C1] rounded-full w-[65%]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Memory Usage</span>
                    <span className="text-gray-800 font-bold">42%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full w-[42%]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Storage Limits</span>
                    <span className="text-gray-800 font-bold">88%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full w-[88%]" />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Auto-scaling Active</p>
                    <p className="text-xs text-gray-400 font-medium">3 nodes available</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Activity */}
            <div className="bg-[#1A1D1F] p-8 rounded-[32px] text-white">
              <h3 className="text-lg font-bold mb-6">Recent Activity</h3>
              <div className="space-y-6">
                {[
                  { msg: "Store 'Fashion' Ready", time: "2m ago", color: "bg-green-500" },
                  { msg: "Backup Completed", time: "1h ago", color: "bg-blue-500" },
                  { msg: "Deployment Started", time: "3h ago", color: "bg-[#72D5C1]" }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className={cn("w-1.5 h-10 rounded-full shrink-0", item.color)} />
                    <div>
                      <p className="text-sm font-bold text-gray-50 tracking-tight">{item.msg}</p>
                      <p className="text-xs text-gray-500 font-medium">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-8 py-4 rounded-2xl bg-white/10 hover:bg-white/15 transition-all text-sm font-bold">
                View Audit Logs
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
