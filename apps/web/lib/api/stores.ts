import { apiGet, apiPost, apiDelete } from "../api-client";

export interface Store {
  id: string;
  name: string;
  subdomain: string;
  type: string;
  status: "PROVISIONING" | "READY" | "FAILED";
  url?: string;
  createdAt: string;
  dbName?: string;
  dbUser?: string;
  dbPassword?: string;
}

export interface PodStatus {
  name: string;
  phase: string;
  ready: boolean;
  restarts: number;
}

export interface StoreStatus {
  status: "PROVISIONING" | "READY" | "FAILED";
  pods: PodStatus[];
  message?: string;
}

export interface StoreDetails extends Store {
  k8sStatus: StoreStatus;
}

export interface AuditLog {
  id: string;
  action: string;
  entityId: string;
  entity: string;
  userId: string;
  metadata: any;
  createdAt: string;
}

export interface Metrics {
  total_stores: number;
  stores_by_status: {
    provisioning: number;
    ready: number;
    failed: number;
  };
  stores_by_type: Record<string, number>;
  avg_provisioning_time_ms: number;
  failure_rate: string;
}

export const storeApi = {
  getAll: async (): Promise<Store[]> => {
    const res = await apiGet("/api/stores");
    if (!res.ok) throw new Error(res.error || "Failed to fetch stores");
    return res.data;
  },

  getById: async (id: string): Promise<StoreDetails> => {
    const res = await apiGet(`/api/stores/${id}`);
    if (!res.ok) throw new Error(res.error || "Failed to fetch store");
    return res.data;
  },

  getStatus: async (id: string): Promise<{ id: string; status: string; k8sStatus: StoreStatus }> => {
    const res = await apiGet(`/api/stores/${id}/status`);
    if (!res.ok) throw new Error(res.error || "Failed to fetch store status");
    return res.data;
  },

  getLogs: async (id: string, podName: string): Promise<{ logs: string }> => {
    const res = await apiGet(`/api/stores/${id}/logs?podName=${podName}`);
    if (!res.ok) throw new Error(res.error || "Failed to fetch store logs");
    return res.data;
  },

  getAuditLogs: async (id: string): Promise<AuditLog[]> => {
    const res = await apiGet(`/api/stores/${id}/audit`);
    if (!res.ok) throw new Error(res.error || "Failed to fetch audit logs");
    return res.data;
  },

  create: async (name: string, type: "WOOCOMMERCE" | "MEDUSA" = "WOOCOMMERCE"): Promise<Store> => {
    const res = await apiPost("/api/stores", { name, type });
    if (!res.ok) {
      throw new Error(res.error || "Failed to create store");
    }
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    const res = await apiDelete(`/api/stores/${id}`);
    if (!res.ok) throw new Error(res.error || "Failed to delete store");
  },

  getMetrics: async (): Promise<Metrics> => {
    const res = await apiGet("/api/metrics");
    if (!res.ok) throw new Error(res.error || "Failed to fetch metrics");
    return res.data;
  },
};
