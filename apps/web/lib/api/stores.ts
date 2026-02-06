import { apiGet, apiPost, apiDelete } from "../api-client";

export interface Store {
  id: string;
  name: string;
  subdomain: string;
  type: string;
  status: "PROVISIONING" | "READY" | "FAILED";
  url?: string;
  createdAt: string;
}

export const storeApi = {
  getAll: async (): Promise<Store[]> => {
    const res = await apiGet("/stores");
    if (!res.ok) throw new Error("Failed to fetch stores");
    return res.json();
  },

  create: async (name: string, type: "WOOCOMMERCE" | "MEDUSA" = "WOOCOMMERCE"): Promise<Store> => {
    const res = await apiPost("/stores", { name, type });
    if (!res.ok) throw new Error("Failed to create store");
    return res.json();
  },

  delete: async (id: string): Promise<void> => {
    const res = await apiDelete(`/stores/${id}`);
    if (!res.ok) throw new Error("Failed to delete store");
  }
};
