import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useDownload } from '@/hooks/useDownload';
import { CircularProgress } from '@/components/ui/circular-progress';
import { useDownloadStore } from '@/store/downloadStore';

interface DownloadFileProps {
  fileId: string;
}

export function DownloadFile({ fileId }: DownloadFileProps) {
  const { isDownloading, progress, handleFileDownload } = useDownload(fileId);
  const isAnyDownloadActive = useDownloadStore((state) =>
    state.isAnyDownloadActive()
  );

  return (
    <Button
      onClick={() => handleFileDownload(fileId)}
      disabled={isAnyDownloadActive}
      size="sm"
      title={
        isAnyDownloadActive && !isDownloading
          ? 'Another download is in progress'
          : undefined
      }
    >
      {isDownloading ? (
        <>
          <CircularProgress
            progress={progress}
            className="mr-2"
            size={16}
            strokeWidth={2}
          />
          {Math.round(progress)}%
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          {isAnyDownloadActive ? 'Wait' : 'Download'}
        </>
      )}
    </Button>
  );
}
