'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import FilePreview, { isPreviewable } from '@/components/preview/FilePreview';

interface FilePreviewDialogProps {
  fileId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FileData {
  id: string;
  name: string;
  type: string;
  size: number | string;
  url: string;
}

const FilePreviewDialog = ({
  fileId,
  open,
  onOpenChange,
}: FilePreviewDialogProps) => {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && fileId) {
      setLoading(true);
      setError(null);
      setFileData(null);
      fetch(`/api/files/${fileId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch file');
          return res.json();
        })
        .then((data) => {
          setFileData(data);
        })
        .catch(() => {
          setError('Failed to load file preview');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setFileData(null);
      setError(null);
    }
  }, [open, fileId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">
            {fileData?.name || 'File Preview'}
          </DialogTitle>
          <DialogDescription>
            {fileData
              ? `${fileData.type} • Preview`
              : 'Loading file preview...'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="text-destructive">{error}</p>
          </div>
        ) : fileData ? (
          <FilePreview file={fileData} showHeader={false} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewDialog;
export { isPreviewable };
