import { FileText, Download, Lock, ExternalLink } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4001';

async function getPublicFile(id: string) {
  try {
    const res = await fetch(`${API_URL}/api/files/public/${id}`, {
      cache: 'no-store',
    });
    
    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.message || 'File not found' };
    }
    
    const data = await res.json();
    return { success: true, file: data.file };
  } catch (error) {
    console.error('Error fetching public file:', error);
    return { success: false, error: 'Failed to load file' };
  }
}

export default async function PublicFilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getPublicFile(id);

  if (!result.success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {result.error || "This file is not publicly accessible."}
          </p>
        </div>
      </div>
    );
  }

  const { file } = result;
  // Stream URL - directly from backend (public endpoint, no auth needed)
  const streamUrl = `${API_URL}/api/files/public/${id}/stream`;

  const formatSize = (bytes?: number) => {
    if (bytes === undefined || bytes === null) return "—";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white dark:bg-[#1e1e1e] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText size={28} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
                {file.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatSize(file.size)} • {file.mimeType || file.type}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            This file has been shared publicly. View or download using the buttons below.
          </p>
          
          <div className="flex flex-col gap-3">
            <a 
              href={streamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              <ExternalLink size={20} />
              View File
            </a>
            <a 
              href={streamUrl}
              download={file.name}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              <Download size={20} />
              Download
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-[#171717] border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Shared via Cloudly Drive • Anyone with the link can view
          </p>
        </div>
      </div>
    </div>
  );
}

