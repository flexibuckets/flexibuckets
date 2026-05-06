'use client';

import { useState, useEffect } from 'react';
import FilePreview, { isPreviewable } from '@/components/preview/FilePreview';
import { Button } from '@/components/ui/button';
import { Eye, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Link from 'next/link';

interface SharedFilePreviewProps {
  fileName: string;
  fileType: string;
  fileSize: string;
  shortUrl: string;
  s3CredentialId: string;
  s3Key: string;
}

export default function SharedFilePreview({
  fileName,
  fileType,
  fileSize,
  shortUrl,
  s3CredentialId,
  s3Key,
}: SharedFilePreviewProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canPreview = isPreviewable(fileType, fileName);

  useEffect(() => {
    if (previewOpen && !presignedUrl) {
      setLoading(true);
      fetch(`/api/shared/preview/${shortUrl}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to get preview URL');
          return res.json();
        })
        .then((data) => {
          setPresignedUrl(data.url);
        })
        .catch(() => {
          setPresignedUrl(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [previewOpen, presignedUrl, shortUrl]);

  return (
    <>
      <div className="flex gap-2">
        {canPreview && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
        )}
        <Button asChild className={canPreview ? '' : 'w-full'}>
          <Link target="_blank" href={`/api/download/${shortUrl}`}>
            <Download className="mr-2 h-4 w-4" /> Download
          </Link>
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{fileName}</DialogTitle>
            <DialogDescription>
              {fileType} • Shared file preview
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : presignedUrl ? (
            <FilePreview
              file={{
                name: fileName,
                type: fileType,
                size: fileSize,
                url: presignedUrl,
              }}
              showHeader={false}
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-destructive">Failed to load preview</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
