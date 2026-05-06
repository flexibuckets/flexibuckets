import { CompleteFile } from '@/lib/types';
import React, { useCallback, useState } from 'react';
import DeleteFile from './DeleteFile';
import ShareFile from '@/components/file-table/share/ShareFile';
import { DownloadFile } from './DownloadFile';
import TableAction from '../TableAction';
import { Button } from '../ui/button';
import { Eye } from 'lucide-react';
import FilePreviewDialog, { isPreviewable } from '@/components/preview/FilePreviewDialog';

interface FileActionsProps {
  file: CompleteFile;
}

const FileActions = ({ file }: FileActionsProps) => {
  const { id: fileId, name: fileName, s3CredentialId, type } = file;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const updateLoading = useCallback((val: boolean) => {
    setIsLoading(val);
  }, []);

  const canPreview = isPreviewable(type, fileName);

  return (
    <TableAction isLoading={isLoading}>
      <>
        {canPreview && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <FilePreviewDialog
              fileId={fileId}
              open={previewOpen}
              onOpenChange={setPreviewOpen}
            />
          </>
        )}

        <DownloadFile fileId={fileId} />

        <ShareFile file={file} />

        <DeleteFile
          updateLoading={updateLoading}
          fileId={fileId}
          fileName={fileName}
          s3CredentialId={s3CredentialId}
        />
      </>
    </TableAction>
  );
};

export default FileActions;
