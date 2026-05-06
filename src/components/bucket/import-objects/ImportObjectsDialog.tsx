'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  Download,
  FolderIcon,
  FileIcon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface ImportPreview {
  totalObjects: number;
  totalFolders: number;
  totalSize: number;
  sampleFiles: { name: string; size: number; lastModified?: Date }[];
}

interface ImportObjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  s3CredentialId: string;
  bucketName: string;
}

export function ImportObjectsDialog({
  open,
  onOpenChange,
  s3CredentialId,
  bucketName,
}: ImportObjectsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    importedFiles: number;
    importedFolders: number;
    skipped: number;
  } | null>(null);

  const handleScan = async () => {
    setIsScanning(true);
    setPreview(null);
    setImportResult(null);

    try {
      const response = await fetch(
        `/api/buckets/import-objects?s3CredentialId=${s3CredentialId}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan bucket');
      }

      setPreview(data);
    } catch (error) {
      toast({
        title: 'Scan failed',
        description:
          error instanceof Error ? error.message : 'Could not scan bucket',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);

    try {
      const response = await fetch('/api/buckets/import-objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3CredentialId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setImportResult(data);

      queryClient.invalidateQueries({ queryKey: ['bucket-files'] });
      queryClient.invalidateQueries({ queryKey: ['user-buckets'] });

      toast({
        title: 'Import completed',
        description: `${data.importedFiles} file(s) and ${data.importedFolders} folder(s) imported successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Import failed',
        description:
          error instanceof Error ? error.message : 'Failed to import objects',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setPreview(null);
    setImportResult(null);
    setIsScanning(false);
    setIsImporting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Import Existing Files
          </DialogTitle>
          <DialogDescription>
            Scan <span className="font-medium">{bucketName}</span> for files that
            already exist in the bucket but are not yet tracked in FlexiBuckets.
          </DialogDescription>
        </DialogHeader>

        {importResult ? (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Import complete</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Files imported</span>
              <Badge variant="success">{importResult.importedFiles}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Folders created</span>
              <Badge variant="secondary">{importResult.importedFolders}</Badge>
            </div>
            {importResult.skipped > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Already tracked</span>
                <Badge variant="outline">{importResult.skipped}</Badge>
              </div>
            )}
          </div>
        ) : !preview ? (
          <div className="py-4 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Download className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Click the button below to scan your bucket for existing files and folders.
              Only objects not already tracked by FlexiBuckets will be imported.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-md border p-3 space-y-2">
              <div className="text-sm font-medium">Scan Results</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <FileIcon className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-lg font-semibold">{preview.totalObjects}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Files</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <FolderIcon className="h-3.5 w-3.5 text-yellow-500" />
                    <span className="text-lg font-semibold">{preview.totalFolders}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Folders</span>
                </div>
                <div className="text-center">
                  <div className="mb-1">
                    <span className="text-lg font-semibold">
                      {formatBytes(preview.totalSize.toString())}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">Total size</span>
                </div>
              </div>
            </div>

            {preview.sampleFiles.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-sm font-medium">
                  Sample files {preview.totalObjects > 20 ? '(showing first 20)' : ''}
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {preview.sampleFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs text-muted-foreground rounded border px-2 py-1"
                    >
                      <span className="truncate max-w-[280px]">{f.name}</span>
                      <span>{formatBytes(f.size.toString())}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.totalObjects === 0 && (
              <div className="flex items-center gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 px-3 py-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0" />
                <span className="text-sm text-yellow-600 dark:text-yellow-400">
                  No untracked files found in this bucket.
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {importResult ? (
            <Button onClick={handleClose}>Done</Button>
          ) : !preview ? (
            <Button onClick={handleScan} disabled={isScanning}>
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning bucket...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Scan Bucket
                </>
              )}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting || preview.totalObjects === 0}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Import {preview.totalObjects} file(s)
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
