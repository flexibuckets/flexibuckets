import { CompleteFile } from '@/lib/types';
import React, { useCallback, useState } from 'react';
import DeleteFile from './DeleteFile';
import ShareFile from '@/components/file-table/share/ShareFile';
import { DownloadFile } from './DownloadFile'; // Changed to named import

import TableAction from '../TableAction';

interface FileActionsProps {
  file: CompleteFile;
}

const FileActions = ({ file }: FileActionsProps) => {
  const { id: fileId, name: fileName, s3CredentialId } = file;
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const updateLoading = useCallback((val: boolean) => {
    setIsLoading(val);
  }, []);

  return (
    <TableAction isLoading={isLoading}>
      <>
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
