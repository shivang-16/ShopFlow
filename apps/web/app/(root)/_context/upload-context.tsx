"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { getPresignedUrlAction, confirmUploadAction } from "../_actions/upload.actions";
import { createFolderAction } from "../_actions/drive.actions";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export interface UploadItem {
  id: string;
  file: File;
  name: string;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string;
  folderName?: string;
}

interface UploadContextType {
  uploads: UploadItem[];
  isUploading: boolean;
  isPanelOpen: boolean;
  addFiles: (files: File[], targetFolderId?: string) => void;
  addFolderFiles: (files: FileList | File[]) => void;
  cancelUpload: (id: string) => void;
  clearCompleted: () => void;
  togglePanel: () => void;
}

const UploadContext = createContext<UploadContextType | null>(null);

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within UploadProvider");
  }
  return context;
}

const MAX_FILES = 10;
const MAX_FOLDER_FILES = 10;

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Extract current folder ID from URL
  const getCurrentFolderId = (): string | undefined => {
    const match = pathname.match(/\/drive\/folders\/([^/]+)/);
    return match ? match[1] : undefined;
  };

  const isUploading = uploads.some(u => u.status === "pending" || u.status === "uploading");

  // Helper function to upload to S3 with progress
  const uploadToS3WithProgress = (
    url: string,
    file: File,
    onProgress: (progress: number) => void,
    signal: AbortSignal
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => reject(new Error("Upload failed")));
      xhr.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));

      signal.addEventListener("abort", () => xhr.abort());

      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.send(file);
    });
  };

  // Core upload function for a single file
  const uploadSingleFile = async (item: UploadItem, folderId?: string) => {
    try {
      // Update status to uploading
      setUploads(prev => prev.map(u => 
        u.id === item.id ? { ...u, status: "uploading" as const } : u
      ));

      // Get presigned URL
      const urlResult = await getPresignedUrlAction(
        item.file.name,
        item.file.type || "application/octet-stream",
        item.file.size,
        folderId
      );

      if (!urlResult.success || !urlResult.data) {
        throw new Error(urlResult.error || "Failed to get upload URL");
      }

      const { uploadUrl, s3Key, publicUrl } = urlResult.data;

      // Upload to S3 with progress tracking
      const abortController = new AbortController();
      abortControllers.current.set(item.id, abortController);

      await uploadToS3WithProgress(
        uploadUrl,
        item.file,
        (progress) => {
          setUploads(prev => prev.map(u => 
            u.id === item.id ? { ...u, progress } : u
          ));
        },
        abortController.signal
      );

      // Confirm upload
      const confirmResult = await confirmUploadAction(
        item.file.name,
        s3Key,
        publicUrl,
        item.file.type || "application/octet-stream",
        item.file.size,
        folderId
      );

      if (!confirmResult.success) {
        throw new Error(confirmResult.error || "Failed to confirm upload");
      }

      // Mark as complete
      setUploads(prev => prev.map(u => 
        u.id === item.id ? { ...u, status: "complete" as const, progress: 100 } : u
      ));

      abortControllers.current.delete(item.id);
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === "AbortError") {
        setUploads(prev => prev.filter(u => u.id !== item.id));
      } else {
        setUploads(prev => prev.map(u => 
          u.id === item.id ? { ...u, status: "error" as const, error: err.message } : u
        ));
      }
      abortControllers.current.delete(item.id);
    }
  };

  // Add files to upload queue
  const addFiles = useCallback((files: File[], targetFolderId?: string) => {
    const pendingCount = uploads.filter(u => u.status === "pending" || u.status === "uploading").length;
    const slotsAvailable = MAX_FILES - pendingCount;
    const filesToAdd = files.slice(0, slotsAvailable);

    if (files.length > slotsAvailable) {
      toast.warning(`Only ${slotsAvailable} files added. Max ${MAX_FILES} files at a time.`);
    }

    if (filesToAdd.length === 0) {
      toast.error("Upload limit reached (max 10 files at a time)");
      return;
    }

    const folderId = targetFolderId ?? getCurrentFolderId();

    const newUploads: UploadItem[] = filesToAdd.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      name: file.name,
      progress: 0,
      status: "pending" as const,
    }));

    setUploads(prev => [...prev, ...newUploads]);
    setIsPanelOpen(true);

    // Start uploading each file
    (async () => {
      for (const item of newUploads) {
        await uploadSingleFile(item, folderId);
      }
      router.refresh();
    })();
  }, [uploads, pathname, router]);

  // Handle folder uploads - creates folder first, then uploads files inside
  const addFolderFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (fileArray.length === 0) return;

    if (fileArray.length > MAX_FOLDER_FILES) {
      toast.warning(`Folder has ${fileArray.length} files. Only first ${MAX_FOLDER_FILES} will be uploaded.`);
    }

    const filesToUpload = fileArray.slice(0, MAX_FOLDER_FILES);

    const firstFile = filesToUpload[0];
    if (!firstFile) {
      toast.error("No files found in folder");
      return;
    }
    
    const relativePath = (firstFile as File & { webkitRelativePath?: string }).webkitRelativePath || firstFile.name;
    const folderName = relativePath.split('/')[0] || "Uploaded Folder";
    const parentFolderId = getCurrentFolderId();

    toast.info(`Creating folder "${folderName}"...`);

    // Start async operation
    (async () => {
      try {
        const folderResult = await createFolderAction(folderName, parentFolderId);
        
        if (!folderResult.success) {
          toast.error(`Failed to create folder: ${folderResult.error}`);
          return;
        }

        const newFolderId = folderResult.folder?._id;
        
        if (!newFolderId) {
          toast.error("Failed to get folder ID");
          return;
        }

        toast.success(`Folder "${folderName}" created. Uploading ${filesToUpload.length} files...`);

        const newUploads: UploadItem[] = filesToUpload.map(file => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          name: file.name,
          progress: 0,
          status: "pending" as const,
          folderName,
        }));

        setUploads(prev => [...prev, ...newUploads]);
        setIsPanelOpen(true);

        // Upload each file with the new folder ID
        for (const item of newUploads) {
          await uploadSingleFile(item, newFolderId);
        }
        
        router.refresh();
      } catch (error) {
        console.error("Error creating folder for upload:", error);
        toast.error("Failed to create folder for upload");
      }
    })();
  }, [pathname, router]);

  const cancelUpload = useCallback((id: string) => {
    const controller = abortControllers.current.get(id);
    if (controller) {
      controller.abort();
    }
    setUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setUploads(prev => prev.filter(u => u.status !== "complete" && u.status !== "error"));
  }, []);

  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev);
  }, []);

  return (
    <UploadContext.Provider value={{
      uploads,
      isUploading,
      isPanelOpen,
      addFiles,
      addFolderFiles,
      cancelUpload,
      clearCompleted,
      togglePanel,
    }}>
      {children}
    </UploadContext.Provider>
  );
}
