"use client";

import { useEffect, useState } from "react";
import { TopNav } from "./_components/top-nav";
import { StoreList } from "./_components/store-list";
import { CreateStoreModal } from "./_components/create-store-modal";
import { cn } from "../../../lib/cn";
import { 
  Plus, 
  Store as StoreIcon, 
  Users,
  Calendar,
  ChevronDown,
  Search,
  TrendingUp,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { storeApi, Store } from "../../../lib/api/stores";
import { toast } from "sonner";

export default function Home() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStores = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await storeApi.getAll();
      setStores(data);
    } catch (error) {
      console.error("Failed to load stores", error);
      toast.error("Failed to load stores");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await storeApi.delete(id);
      toast.success("Store deleted successfully");
      fetchStores(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete store");
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStores(false);
  };

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    const hasProvisioning = stores.some(s => s.status === "PROVISIONING");
    if (!hasProvisioning) return;

    const interval = setInterval(() => {
      fetchStores(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [stores]);

  const stats = {
    total: stores.length,
    ready: stores.filter(s => s.status === "READY").length,
    provisioning: stores.filter(s => s.status === "PROVISIONING").length,
    failed: stores.filter(s => s.status === "FAILED").length,
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F9FAFB]">
      <TopNav />
      
      <main className="flex-1 p-8 space-y-8 max-w-[1600px] mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Store Dashboard</h1>
            <p className="text-sm text-gray-500 font-medium tracking-tight">Manage your ecommerce stores</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              Refresh
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#10B981] text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
            >
              <Plus className="w-4 h-4 text-white" />
              Create Store
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-bold text-gray-500 tracking-tight">Total Stores</span>
              <StoreIcon className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{stats.total}</h3>
          </div>

          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-bold text-gray-700 tracking-tight">Ready</span>
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{stats.ready}</h3>
          </div>

          <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-bold text-gray-700 tracking-tight">Provisioning</span>
              <Loader2 className="w-6 h-6 text-yellow-600 animate-spin" />
            </div>
            <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{stats.provisioning}</h3>
          </div>

          <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-bold text-gray-700 tracking-tight">Failed</span>
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{stats.failed}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
           <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Your Stores</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {stats.provisioning > 0 && (
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Auto-refreshing every 5 seconds
                  </span>
                )}
              </div>
           </div>
           
           <div className="p-0">
             <StoreList stores={stores} loading={loading} onDelete={handleDelete} />
           </div>
        </div>
      </main>

      <CreateStoreModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchStores(false)}
      />
    </div>
  );
}
