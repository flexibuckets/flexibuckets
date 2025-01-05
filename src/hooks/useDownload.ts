import { useDownloadStore } from '@/store/downloadStore';
import { useToast } from '@/hooks/use-toast';
import { downloadFile, downloadFolder } from '@/lib/client/downloadUtils';

export function useDownload(fileId?: string) {
  const { toast } = useToast();
  const { setDownloadState, resetDownload, downloads, isAnyDownloadActive } = useDownloadStore();
  
  const downloadInfo = fileId ? downloads[fileId] : undefined;
  const isDownloading = downloadInfo?.isDownloading ?? false;
  const progress = downloadInfo?.progress ?? 0;

  const handleFileDownload = async (downloadFileId: string) => {
    if (downloads[downloadFileId]?.isDownloading) {
      toast({
        title: "Download in Progress",
        description: "This file is already being downloaded.",
      });
      return;
    }

    if (isAnyDownloadActive()) {
      toast({
        title: "Download in Progress",
        description: "Please wait for the current download to complete.",
      });
      return;
    }
    
    setDownloadState(downloadFileId, true, 0);
    try {
      await downloadFile(downloadFileId, {
        onProgress: (progress) => {
          setDownloadState(downloadFileId, true, progress);
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Download Failed",
            description: error.message,
          });
        }
      });
      
      toast({
        title: "Download Complete",
        description: "File has been downloaded successfully. Please save it to your computer.",
      });
    } finally {
      resetDownload(downloadFileId);
    }
  };

  const handleFolderDownload = async (folderId: string, folderName: string) => {
    if (downloads[folderId]?.isDownloading) {
      toast({
        title: "Download in Progress",
        description: "This folder is already being downloaded.",
      });
      return;
    }

    if (isAnyDownloadActive()) {
      toast({
        title: "Download in Progress",
        description: "Please wait for the current download to complete.",
      });
      return;
    }
    
    setDownloadState(folderId, true, 0);
    try {
      await downloadFolder(folderId, folderName, {
        onProgress: (progress) => {
          setDownloadState(folderId, true, progress);
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Download Failed",
            description: error.message,
          });
        }
      });
      
      toast({
        title: "Download Complete",
        description: `${folderName}.zip has been downloaded successfully.`,
      });
    } finally {
      resetDownload(folderId);
    }
  };

  return {
    isDownloading,
    progress,
    handleFileDownload,
    handleFolderDownload
  };
}