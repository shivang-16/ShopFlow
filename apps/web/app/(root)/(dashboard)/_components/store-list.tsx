"use client";

import { CheckCircle2, Store as StoreIcon } from "lucide-react";
import { Store } from "../../../../lib/api/stores";

interface StoreListProps {
  stores: Store[];
  loading: boolean;
  onCreate?: () => void;
}

export function StoreList({ stores, loading }: StoreListProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="border-b border-gray-50">
          <tr>
            <th className="pl-6 py-4 w-10">
              <div className="w-5 h-5 rounded border border-gray-200" />
            </th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product</th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price</th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stock</th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Revenue</th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {loading ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                Loading stores...
              </td>
            </tr>
          ) : stores.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                No stores found.
              </td>
            </tr>
          ) : (
            stores.map((store) => (
              <tr key={store.id} className="hover:bg-teal-50/30 transition-colors group">
                <td className="pl-6 py-4">
                  <div className="w-5 h-5 rounded border border-emerald-500 bg-emerald-500 flex items-center justify-center">
                     <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center transition-colors border border-gray-100">
                      <StoreIcon className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 tracking-tight">{store.name}</p>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter italic">ID: {store.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-gray-700">$14.81</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-gray-700">883</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-gray-700">$349.00</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 px-2 py-1 rounded bg-emerald-50 border border-emerald-100 w-fit">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[10px] font-bold text-emerald-600 uppercase">In Stock</span>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
