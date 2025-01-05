import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useDownload } from '@/hooks/useDownload';
import { Progress } from '@/components/ui/progress';

interface DownloadFolderProps {
  folderId: string;
  folderName: string;
}

export function DownloadFolder({ folderId, folderName }: DownloadFolderProps) {
  const { isDownloading, progress, handleFolderDownload } = useDownload();

  return (
    <Button
      onClick={() => handleFolderDownload(folderId, folderName)}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Downloading... {progress}%
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" /> Download
        </>
      )}
    </Button>
  );
}
