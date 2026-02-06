"use server";

import { apiPost } from "../../../lib/api-client";
import { revalidatePath } from "next/cache";

interface PresignedUrlResponse {
  uploadUrl: string;
  s3Key: string;
  publicUrl: string;
  fileType: string;
}

export async function getPresignedUrlAction(
  fileName: string,
  fileType: string,
  fileSize: number,
  folderId?: string
): Promise<{ success: boolean; data?: PresignedUrlResponse; error?: string }> {
  try {
    const res = await apiPost("/api/files/upload-url", {
      fileName,
      fileType,
      fileSize,
      folderId: folderId || null,
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.message || "Failed to get upload URL" };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error getting presigned URL:", error);
    return { success: false, error: "Failed to get upload URL" };
  }
}

export async function confirmUploadAction(
  name: string,
  s3Key: string,
  s3Url: string,
  mimeType: string,
  size: number,
  folderId?: string
): Promise<{ success: boolean; file?: any; error?: string }> {
  try {
    const res = await apiPost("/api/files/confirm-upload", {
      name,
      s3Key,
      s3Url,
      mimeType,
      size,
      folderId: folderId || null,
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.message || "Failed to confirm upload" };
    }

    revalidatePath("/drive");
    return { success: true, file: data.file };
  } catch (error) {
    console.error("Error confirming upload:", error);
    return { success: false, error: "Failed to confirm upload" };
  }
}
