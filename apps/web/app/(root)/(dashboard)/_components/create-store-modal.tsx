"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { storeApi } from "../../../../lib/api/stores";
import { toast } from "sonner";

interface CreateStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateStoreModal({ isOpen, onClose, onSuccess }: CreateStoreModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"WOOCOMMERCE" | "MEDUSA">("WOOCOMMERCE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a store name");
      return;
    }

    setIsSubmitting(true);
    try {
      await storeApi.create(name.trim(), type);
      toast.success("Store creation started! It will take a few minutes to provision.");
      setName("");
      setType("WOOCOMMERCE");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to create store");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create New Store</h2>
        <p className="text-sm text-gray-500 mb-6">
          Set up a new ecommerce store with just a few clicks
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="storeName" className="block text-sm font-semibold text-gray-700 mb-2">
              Store Name
            </label>
            <input
              id="storeName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Store"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              disabled={isSubmitting}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              3-50 characters, letters, numbers, spaces, and hyphens only
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Store Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("WOOCOMMERCE")}
                disabled={isSubmitting}
                className={`p-4 rounded-lg border-2 transition-all ${
                  type === "WOOCOMMERCE"
                    ? "border-teal-500 bg-teal-50 text-teal-900"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                }`}
              >
                <div className="font-bold text-sm">WooCommerce</div>
                <div className="text-xs mt-1 opacity-70">WordPress + WooCommerce</div>
              </button>

              <button
                type="button"
                onClick={() => setType("MEDUSA")}
                disabled={isSubmitting}
                className={`p-4 rounded-lg border-2 transition-all ${
                  type === "MEDUSA"
                    ? "border-teal-500 bg-teal-50 text-teal-900"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                }`}
              >
                <div className="font-bold text-sm">Medusa</div>
                <div className="text-xs mt-1 opacity-70">Modern headless commerce</div>
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> Store provisioning takes 3-5 minutes. You'll be able to track
              the progress in real-time.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Store"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
