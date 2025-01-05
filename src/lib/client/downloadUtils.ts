import JSZip from "jszip";
import { saveAs } from "file-saver";
import { getFileDownloadUrl, getFolderDownloadUrls } from "@/app/actions/download";

interface DownloadOptions {
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

export async function downloadFile(
  fileId: string,
  options?: DownloadOptions
) {
  try {
    const { url, fileName } = await getFileDownloadUrl(fileId);
    options?.onProgress?.(0);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Download failed");
    
    const blob = await response.blob();
    saveAs(blob, fileName);
    options?.onProgress?.(100);

    await fetch('/api/webhooks/file-access', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    options?.onError?.(error as Error);
    throw error;
  }
}

export async function downloadFolder(
  folderId: string,
  folderName: string,
  options?: DownloadOptions
) {
  try {
    const { urls } = await getFolderDownloadUrls(folderId);
    const zip = new JSZip();
    let processedFiles = 0;
    const totalFiles = urls.length;

    options?.onProgress?.(0);

    for (const { path, url, name } of urls) {
      const response = await fetch(url);
      const blob = await response.blob();
      zip.file(`${path}${name}`, blob);
      
      processedFiles++;
      options?.onProgress?.(Math.floor((processedFiles / totalFiles) * 100));
    }

    const content = await zip.generateAsync({ 
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });
    
    saveAs(content, `${folderName}.zip`);
  } catch (error) {
    options?.onError?.(error as Error);
    throw error;
  }
}