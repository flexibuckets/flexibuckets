import React, { useCallback, useState } from "react";
import { CompleteTeamFile } from "@/lib/types";
import { TeamRole } from "@prisma/client";
import DeleteFile from "./DeleteFile";
import ShareFile from "@/components/file-table/share/ShareFile";
import { DownloadFile } from "./DownloadFile";
import TableAction from "@/components/TableAction";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import Link from "next/link";

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
  } = file;
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const updateLoading = useCallback(
    (val: boolean) => {
      setIsLoading(val);
    },
    [setIsLoading]
  );

  const isOwner = userTeamRole === "OWNER";
  const isAdmin = userTeamRole === "ADMIN";
  const isFileOwner = currentUserId === userId;
  const isMemberUploaded = uploadedByRole === "MEMBER";
  const canControl = isOwner || isFileOwner || (isAdmin && isMemberUploaded);

  return (
    <TableAction isLoading={isLoading}>
      <>
        <Link href={`/preview/${fileId}`}>
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </Link>

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
