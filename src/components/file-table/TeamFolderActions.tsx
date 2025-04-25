import { CompleteTeamFolder } from "@/lib/types";
import { TeamRole } from "@prisma/client";
import React, { useCallback, useState } from "react";
import DeleteFolder from "./DeleteFolder";
import {DownloadFolder} from "./DownloadFolder";
import ShareFolder from "@/components/file-table/share/ShareFolder";
import TableAction from "../TableAction";
type TeamFolderActionsProps = {
  folder: CompleteTeamFolder;
  userTeamRole: TeamRole;
  currentUserId: string;
  teamId: string;
};
const TeamFolderActions = ({
  userTeamRole,
  folder,
  currentUserId,
  teamId,
}: TeamFolderActionsProps) => {
  const { userId, uploadedByRole } = folder;

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
        <DownloadFolder
          folderId={folder.id}
          folderName={folder.name}
          
        />
        {canControl ? (
          <>
            <ShareFolder folder={folder} teamId={teamId} />
            <DeleteFolder folder={folder} updateLoading={updateLoading} />
          </>
        ) : null}
      </>
    </TableAction>
  );
};

export default TeamFolderActions;
