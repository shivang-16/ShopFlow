"use client";

import { CheckCircle2, Store as StoreIcon, Loader2, XCircle, Trash2, ExternalLink, KeyRound, Copy, Check, RotateCw } from "lucide-react";
import { Store } from "../../../../lib/api/stores";
import { toast } from "sonner";
import { useState } from "react";
import React from "react";

interface StoreListProps {
  stores: Store[];
  loading: boolean;
  onDelete?: (id: string) => void;
  onRetry?: (id: string) => void;
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

export function StoreList({ stores, loading, onDelete, onRetry }: StoreListProps) {
  const [showCredentials, setShowCredentials] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    const toastId = toast.loading("Deleting store...");
    
    try {
      await onDelete?.(id);
      toast.dismiss(toastId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete store";
      toast.error(message, { id: toastId });
      setDeletingId(null);
    }
    // Don't clear deletingId on success immediately to show feedback until removed from list
    // Or clear it? If parent re-fetches, it might be fine.
    // Ideally parent removes it from list.
    // But if parent does router.refresh(), component might remount?
    // Let's clear it on error only? Or check if still in list?
    // Keep it simple: leave it true on success until component unmounts or updates.
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    const toastId = toast.loading("Restarting provisioning...");
    
    try {
      if (onRetry) {
        await onRetry(id);
        toast.success("Retry started successfully", { id: toastId });
      }
    } catch (error) {
       const message = error instanceof Error ? error.message : "Failed to retry provisioning";
       toast.error(message, { id: toastId });
    } finally {
      setRetryingId(null);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getAdminUrl = (subdomain: string, type: string) => {
    // Backend already appends /app/login for Medusa
    // For WooCommerce, we need to append /wp-admin if not already present
    if (type === "MEDUSA") {
      return subdomain; // Already has /app/login from backend
    } else if (type === "WOOCOMMERCE") {
      // Check if /wp-admin is already in the URL
      return subdomain.includes("/wp-admin") ? subdomain : `${subdomain}/wp-admin`;
    }
    return subdomain;
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
              <React.Fragment key={store.id}>
                <tr className="hover:bg-teal-50/30 transition-colors group">
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
                        href={store.subdomain}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1.5 group/link hover:underline"
                      >
                        <span>Visit Store</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400 font-medium">Provisioning...</span>
                    )}
                  </td>
                <td className="px-6 py-4">{getStatusBadge(store.status)}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-gray-600">
                      {new Date(store.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {store.status === "FAILED" && store.errorMessage && (
                      <span className="text-xs text-red-600 font-medium" title={store.errorMessage}>
                        {store.errorMessage.length > 50 ? store.errorMessage.substring(0, 50) + "..." : store.errorMessage}
                      </span>
                    )}
                  </div>
                </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {store.status === "READY" && (
                        <button
                          onClick={() => setShowCredentials(showCredentials === store.id ? null : store.id)}
                          className="text-teal-600 hover:text-teal-700 transition-colors p-2 hover:bg-teal-50 rounded-lg"
                          title="View credentials"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                      )}
                      
                      {store.status === "FAILED" && (
                        <button
                          onClick={() => handleRetry(store.id)}
                          className="text-orange-500 hover:text-orange-700 transition-colors p-2 hover:bg-orange-50 rounded-lg disabled:opacity-50"
                          title="Retry provisioning"
                          disabled={retryingId === store.id}
                        >
                          {retryingId === store.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RotateCw className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(store.id, store.name)}
                        className="text-red-500 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete store"
                        disabled={deletingId === store.id}
                      >
                        {deletingId === store.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
                {showCredentials === store.id && store.status === "READY" && (
                  <tr className="bg-teal-50/50 border-t border-teal-100">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="bg-white rounded-xl p-6 border border-teal-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <KeyRound className="w-5 h-5 text-teal-600" />
                          <h4 className="font-bold text-gray-900">Admin Credentials</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Admin URL</label>
                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                              <a 
                                href={getAdminUrl(store.subdomain, store.type)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-teal-600 hover:text-teal-700 font-mono flex-1 hover:underline truncate"
                              >
                                {getAdminUrl(store.subdomain, store.type)}
                              </a>
                              <button
                                onClick={() => copyToClipboard(getAdminUrl(store.subdomain, store.type), "Admin URL")}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                              >
                                {copiedField === "Admin URL" ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                              {store.type === "MEDUSA" ? "Email" : "Username"}
                            </label>
                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                              <span className="text-sm text-gray-900 font-mono flex-1">
                                {store.type === "MEDUSA" ? "admin@medusa.local" : "admin"}
                              </span>
                              <button
                                onClick={() => copyToClipboard(
                                  store.type === "MEDUSA" ? "admin@medusajs.com" : "admin",
                                  store.type === "MEDUSA" ? "Email" : "Username"
                                )}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                              >
                                {copiedField === (store.type === "MEDUSA" ? "Email" : "Username") ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Password</label>
                          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                            <span className="text-sm text-gray-900 font-mono flex-1">{store.wpAdminPassword || "Not available"}</span>
                            <button
                              onClick={() => copyToClipboard(store.wpAdminPassword || "", "Password")}
                              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                              disabled={!store.wpAdminPassword}
                            >
                              {copiedField === "Password" ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                          <p className="text-xs text-blue-700">
                            <strong>Note:</strong> Please change the default password after your first login for security.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
