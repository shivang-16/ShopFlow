"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { storeApi, StoreDetails, AuditLog, PodStatus } from "../../../../../lib/api/stores";
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Trash2,
  CheckCircle2,
  Loader2,
  XCircle,
  Server,
  Database,
  Clock,
  Activity,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export default function StoreDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [store, setStore] = useState<StoreDetails | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStore = async () => {
    try {
      const [storeData, logs] = await Promise.all([
        storeApi.getById(storeId),
        storeApi.getAuditLogs(storeId),
      ]);
      setStore(storeData);
      setAuditLogs(logs);
    } catch (error: any) {
      toast.error(error.message || "Failed to load store");
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!store) return;
    if (!confirm(`Are you sure you want to delete "${store.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await storeApi.delete(storeId);
      toast.success("Store deleted successfully");
      router.push("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete store");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  useEffect(() => {
    fetchStore();
  }, [storeId]);

  useEffect(() => {
    if (store?.status === "PROVISIONING") {
      const interval = setInterval(fetchStore, 5000);
      return () => clearInterval(interval);
    }
  }, [store?.status]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F9FAFB]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!store) {
    return null;
  }

  const getStatusBadge = () => {
    switch (store.status) {
      case "READY":
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">Ready</span>
          </div>
        );
      case "PROVISIONING":
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-50 border border-yellow-200">
            <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />
            <span className="text-sm font-bold text-yellow-700">Provisioning</span>
          </div>
        );
      case "FAILED":
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-200">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-bold text-red-700">Failed</span>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 bg-[#F9FAFB] min-h-screen">
      <div className="max-w-7xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="p-2 hover:bg-white rounded-lg transition-colors border border-gray-200"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{store.name}</h1>
              <p className="text-sm text-gray-500 mt-1">Store ID: {store.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200 font-semibold"
            >
              <Trash2 className="w-4 h-4" />
              Delete Store
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Store Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-500">Store Name</label>
                  <p className="text-base font-medium text-gray-900 mt-1">{store.name}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-500">Type</label>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {store.type === "WOOCOMMERCE" ? "WooCommerce" : "Medusa"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-500">Store URL</label>
                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href={`http://${store.subdomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                      {store.subdomain}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => copyToClipboard(store.subdomain, "URL")}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-500">Created</label>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {new Date(store.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {store.dbPassword && (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5 text-teal-600" />
                  Database Credentials
                </h2>
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg font-mono text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Database:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900">{store.dbName}</span>
                      <button onClick={() => copyToClipboard(store.dbName || "", "Database name")}>
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Username:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900">{store.dbUser}</span>
                      <button onClick={() => copyToClipboard(store.dbUser || "", "Username")}>
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Password:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900">••••••••••••</span>
                      <button onClick={() => copyToClipboard(store.dbPassword || "", "Password")}>
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-teal-600" />
                Kubernetes Status
              </h2>
              {store.k8sStatus.pods.length === 0 ? (
                <p className="text-sm text-gray-500">{store.k8sStatus.message || "No pods found"}</p>
              ) : (
                <div className="space-y-3">
                  {store.k8sStatus.pods.map((pod) => (
                    <div key={pod.name} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900">{pod.name}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            pod.ready
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {pod.phase}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span>Ready: {pod.ready ? "Yes" : "No"}</span>
                        <span>Restarts: {pod.restarts}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600" />
                Activity Log
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {auditLogs.length === 0 ? (
                  <p className="text-sm text-gray-500">No activity logs</p>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{log.action}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
