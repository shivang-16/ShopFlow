import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import S3 from "../aws/s3";

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "shopflow-docs";

interface SignedUrlParams {
  key: string;
  contentType?: string;
  expiresIn?: number;
}

/**
 * Generate a presigned URL for uploading a file to S3
 */
export const getPutObjectSignedUrl = async (params: SignedUrlParams): Promise<string> => {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: params.key,
      ContentType: params.contentType || "application/octet-stream",
    });
    const signedUrl = await getSignedUrl(S3, command, { 
      expiresIn: params.expiresIn || 3600 // 1 hour default
    });
    return signedUrl;
  } catch (error) {
    console.error("[S3] Error generating PUT signed URL:", error);
    throw error;
  }
};

/**
 * Generate a presigned URL for downloading a file from S3
 * URLs expire in 5 minutes for security - requires re-authentication to get new URL
 */
export const getObjectSignedUrl = async (params: SignedUrlParams): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: params.key,
    });
    const signedUrl = await getSignedUrl(S3, command, { 
      expiresIn: params.expiresIn || 300 // 5 minutes default for security
    });
    return signedUrl;
  } catch (error) {
    console.error("[S3] Error generating GET signed URL:", error);
    throw error;
  }
};

/**
 * Delete an object from S3
 */
export const deleteObject = async (key: string): Promise<void> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await S3.send(command);
    console.log(`[S3] Deleted object: ${key}`);
  } catch (error) {
    console.error("[S3] Error deleting object:", error);
    throw error;
  }
};

/**
 * Get object stream from S3 for proxying files
 * Returns the stream and metadata
 */
export const getObjectStream = async (key: string) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const response = await S3.send(command);
    return {
      stream: response.Body,
      contentType: response.ContentType || "application/octet-stream",
      contentLength: response.ContentLength,
    };
  } catch (error) {
    console.error("[S3] Error getting object stream:", error);
    throw error;
  }
};

/**
 * Generate S3 key for a document
 */
export const generateS3Key = (userId: string, fileName: string, folderId?: string): string => {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const folderPath = folderId ? `${folderId}/` : "";
  return `users/${userId}/${folderPath}${timestamp}-${sanitizedFileName}`;
};

/**
 * Get the public URL for an S3 object (if bucket is public)
 */
export const getPublicUrl = (key: string): string => {
  const region = process.env.AWS_REGION || "ap-south-1";
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
};

/**
 * Determine document type from MIME type
 */
export const getDocumentType = (mimeType: string): string => {
  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
  };

  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return "archive";

  return mimeMap[mimeType] || "other";
};
