import React, { useCallback, useState } from 'react';
import { CompleteTeamFile } from '@/lib/types';
import { TeamRole } from '@prisma/client';
import DeleteFile from './DeleteFile';
import ShareFile from '@/components/file-table/share/ShareFile';
import { DownloadFile } from './DownloadFile';
import TableAction from '@/components/TableAction';
import { Button } from '../ui/button';
import { Eye } from 'lucide-react';
import FilePreviewDialog, { isPreviewable } from '@/components/preview/FilePreviewDialog';

type TeamFileActionsProps = {
  file: CompleteTeamFile;
  userTeamRole: TeamRole;
  currentUserId: string;
  teamId: string;
};

const TeamFileActions = ({
  userTeamRole,
  file,
  currentUserId,
  teamId,
}: TeamFileActionsProps) => {
  const {
    id: fileId,
    name: fileName,
    s3CredentialId,
    userId,
    uploadedByRole,
    type,
  } = file;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const updateLoading = useCallback(
    (val: boolean) => {
      setIsLoading(val);
    },
    [setIsLoading]
  );

  const isOwner = userTeamRole === 'OWNER';
  const isAdmin = userTeamRole === 'ADMIN';
  const isFileOwner = currentUserId === userId;
  const isMemberUploaded = uploadedByRole === 'MEMBER';
  const canControl = isOwner || isFileOwner || (isAdmin && isMemberUploaded);
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

        {canControl ? (
          <>
            <ShareFile file={file} teamId={teamId} />
            <DeleteFile
              updateLoading={updateLoading}
              fileId={fileId}
              fileName={fileName}
              s3CredentialId={s3CredentialId}
            />
          </>
        ) : null}
      </>
    </TableAction>
  );
};

export default TeamFileActions;
