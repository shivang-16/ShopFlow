"use client";

import React from "react";
import { useUpload, UploadItem } from "../_context/upload-context";
import { X, ChevronDown, ChevronUp, FileText, Check, AlertCircle, Loader2 } from "lucide-react";

export function UploadPanel() {
  const { uploads, isPanelOpen, togglePanel, cancelUpload, clearCompleted } = useUpload();

  if (uploads.length === 0) return null;

  const pendingCount = uploads.filter(u => u.status === "pending" || u.status === "uploading").length;
  const completeCount = uploads.filter(u => u.status === "complete").length;

  const getStatusIcon = (item: UploadItem) => {
    switch (item.status) {
      case "complete":
        return <Check size={16} className="text-green-500" />;
      case "error":
        return <AlertCircle size={16} className="text-red-500" />;
      case "uploading":
        return <Loader2 size={16} className="text-blue-500 animate-spin" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="fixed bottom-0 right-0 w-full sm:w-[360px] sm:bottom-4 sm:right-4 bg-white dark:bg-[#1e1e1e] rounded-t-xl sm:rounded-lg shadow-xl border-t sm:border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#2d2d2d] cursor-pointer"
        onClick={togglePanel}
      >
        <span className="font-medium text-gray-800 dark:text-gray-200">
          {pendingCount > 0 
            ? `Uploading ${pendingCount} item${pendingCount > 1 ? "s" : ""}` 
            : `${completeCount} upload${completeCount > 1 ? "s" : ""} complete`
          }
        </span>
        <div className="flex items-center gap-2">
          {completeCount > 0 && pendingCount === 0 && (
            <button 
              onClick={(e) => { e.stopPropagation(); clearCompleted(); }}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear
            </button>
          )}
          <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
            {isPanelOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); clearCompleted(); }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* File List */}
      {isPanelOpen && (
        <div className="max-h-[300px] overflow-y-auto">
          {uploads.map((item) => (
            <div key={item.id} className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.status === "uploading" && (
                        <button 
                          onClick={() => cancelUpload(item.id)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                      {getStatusIcon(item)}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  {(item.status === "uploading" || item.status === "pending") && (
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                      <div 
                        className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  
                  {item.error && (
                    <p className="text-xs text-red-500 mt-1">{item.error}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
