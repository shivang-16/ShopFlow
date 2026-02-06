"use client";

import { CheckCircle2, Store as StoreIcon, Loader2, XCircle, Trash2, ExternalLink } from "lucide-react";
import { Store } from "../../../../lib/api/stores";
import { toast } from "sonner";

interface StoreListProps {
  stores: Store[];
  loading: boolean;
  onDelete?: (id: string) => void;
}

function getStatusBadge(status: Store["status"]) {
  switch (status) {
    case "READY":
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 w-fit">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Ready</span>
        </div>
      );
    case "PROVISIONING":
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-50 border border-yellow-200 w-fit">
          <Loader2 className="w-3.5 h-3.5 text-yellow-600 animate-spin" />
          <span className="text-xs font-bold text-yellow-700 uppercase tracking-wide">Provisioning</span>
        </div>
      );
    case "FAILED":
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 w-fit">
          <XCircle className="w-3.5 h-3.5 text-red-600" />
          <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Failed</span>
        </div>
      );
  }
}

export function StoreList({ stores, loading, onDelete }: StoreListProps) {
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    toast.loading("Deleting store...");
    try {
      onDelete?.(id);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete store");
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="border-b border-gray-100">
          <tr>
            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Store</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Type</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">URL</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Created</th>
            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {loading ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading stores...
              </td>
            </tr>
          ) : stores.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center">
                <StoreIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No stores found</p>
                <p className="text-sm text-gray-400 mt-1">Create your first store to get started</p>
              </td>
            </tr>
          ) : (
            stores.map((store) => (
              <tr key={store.id} className="hover:bg-teal-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                      <StoreIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{store.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{store.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-semibold text-gray-700">
                    {store.type === "WOOCOMMERCE" ? "WooCommerce" : "Medusa"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {store.status === "READY" ? (
                    <a
                      href={`http://${store.subdomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 group/link"
                    >
                      {store.subdomain}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400">{store.subdomain}</span>
                  )}
                </td>
                <td className="px-6 py-4">{getStatusBadge(store.status)}</td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">
                    {new Date(store.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleDelete(store.id, store.name)}
                    className="text-red-500 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded-lg"
                    title="Delete store"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
