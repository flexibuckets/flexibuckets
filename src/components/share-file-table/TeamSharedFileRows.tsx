import { TeamSharedContent } from '@/lib/types';
import { TeamRole } from '@prisma/client';
import React, { useState } from 'react';
import { NoRows, SharedTableMoreInfo } from './SharedFileTables';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteSharedItem } from '@/app/actions';
import TableAction from '../TableAction';
import { TableCell, TableRow } from '../ui/table';
import { formatBytes } from '@/lib/utils';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { FolderIcon, Link, Copy, Trash } from 'lucide-react';
import FileIcon from '../file-upload/FileIcon';

type TeamSharedFileRowsProps = TeamSharedContent & {
  userId: string;
  userTeamRole: TeamRole | 'NONE';
  isMobile: boolean;
};

const TeamSharedFileRows = ({
  sharedFiles,
  sharedFolders,
  userId,
  userTeamRole,
  isMobile,
}: TeamSharedFileRowsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingRow, setDeletingRow] = useState<string | null>(null);

  const { mutate: mutateFileFromShare } = useMutation({
    mutationFn: deleteSharedItem,
    onMutate: ({ id }) => {
      setDeletingRow(id);
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ['team-shared-files'] });
      toast({
        title: `The ${type} unshared successfully`,
        description: `The ${type} is no longer publicly accessible.`,
        variant: 'default',
      });
    },
    onError: (_, { type }) => {
      toast({
        title: 'Error',
        description: `Failed to unshare the ${type}file. Please try again.`,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setDeletingRow(null);
    },
  });

  const removeFileFromShare = (id: string, type: 'file' | 'folder') => {
    mutateFileFromShare({ id, type });
  };

  const files: SharedItem[] = sharedFiles.map((sharedFile) => ({
    id: sharedFile.fileId,
    name: sharedFile.file.name,
    itemType: sharedFile.file.type,
    size: sharedFile.file.size,
    sharedBy: sharedFile.sharedBy,
    sharedByRole: sharedFile.sharedByRole,
    createdAt: sharedFile.createdAt,
    expiresAt: sharedFile.expiresAt,
    downloadUrl: sharedFile.downloadUrl,
    itemOwner: sharedFile.file.userId,
    itemShareOwner: sharedFile.sharedById,
    isDeleting: deletingRow === sharedFile.fileId,
  }));

  const folders: SharedItem[] = sharedFolders.map((sharedFolder) => ({
    id: sharedFolder.folderId,
    name: sharedFolder.folder.name,
    itemType: 'folder',
    size: sharedFolder.folder.size ?? 0,
    sharedBy: sharedFolder.sharedBy,
    sharedByRole: sharedFolder.sharedByRole,
    createdAt: sharedFolder.createdAt,
    expiresAt: sharedFolder.expiresAt,
    downloadUrl: sharedFolder.downloadUrl,
    itemOwner: sharedFolder.folder.userId,
    itemShareOwner: sharedFolder.sharedById,
    isDeleting: deletingRow === sharedFolder.folderId,
  }));

  const sharedItems = [...folders, ...files];
  if (userTeamRole === 'NONE') {
    return <NoRows isError={true} />;
  }
  return (
    <>
      {sharedItems.map((item) => (
        <SharedTableRow
          isMobile={isMobile}
          key={item.id}
          item={item}
          userId={userId}
          userTeamRole={userTeamRole}
          deleteFunction={removeFileFromShare}
        />
      ))}
    </>
  );
};

type SharedItem = {
  id: string;
  name: string;
  itemType: string;
  size: string;
  sharedBy: string;
  sharedByRole: TeamRole;
  createdAt: Date;
  expiresAt: Date | null;
  downloadUrl: string;
  itemOwner: string;
  itemShareOwner: string;
  isDeleting: boolean;
};

type SharedTableRowProps = {
  item: SharedItem;
  isMobile: boolean;
  deleteFunction: (id: string, type: 'file' | 'folder') => void;
  userId: string;
  userTeamRole: TeamRole | 'NONE';
};

const SharedTableRow = ({
  item,
  deleteFunction,
  userId,
  userTeamRole,
  isMobile,
}: SharedTableRowProps) => {
  const {
    id,
    name,
    itemType,
    size,
    createdAt,
    expiresAt,
    downloadUrl,
    isDeleting,
    sharedBy,
    sharedByRole,
    itemOwner,
    itemShareOwner,
  } = item;
  const isOwner = userTeamRole === 'OWNER';
  const isAdmin = userTeamRole === 'ADMIN';
  const isShareOwner = itemShareOwner === userId;
  const isItemOwener = itemOwner === userId;
  const isMemberUploaded = sharedByRole === 'MEMBER';
  const canControl =
    isOwner || isShareOwner || isItemOwener || (isAdmin && isMemberUploaded);
  return (
    <TableRow key={id}>
      <TableCell className={`${isMobile ? 'flex items-center gap-x-2' : ''}`}>
        {isMobile ? (
          itemType === 'folder' ? (
            <FolderIcon className="h-4 w-4" />
          ) : (
            <FileIcon fileType={itemType} />
          )
        ) : null}
        {name}
      </TableCell>
      {isMobile ? (
        <SharedTableMoreInfo
          type={
            itemType === 'folder'
              ? 'Folder'
              : (itemType.split('/').at(-1) as string)
          }
          size={formatBytes(size.toString())}
          sharedBy={sharedBy}
          sharedOn={formatDistanceToNow(new Date(createdAt), {
            addSuffix: true,
          })}
          expires={
            expiresAt
              ? formatDistanceToNow(new Date(expiresAt), {
                  addSuffix: true,
                })
              : 'Never'
          }
        />
      ) : (
        <>
          <TableCell>
            <div className="flex items-center">
              {itemType === 'folder' ? (
                <>
                  <FolderIcon className="h-4 w-4 mr-2" />
                  Folder
                </>
              ) : (
                <>
                  <FileIcon fileType={itemType} />
                  {itemType.split('/').at(-1)}
                </>
              )}
            </div>
          </TableCell>
          <TableCell>{formatBytes(size.toString())}</TableCell>
          <TableCell>{sharedBy}</TableCell>
          <TableCell>
            {formatDistanceToNow(new Date(createdAt), {
              addSuffix: true,
            })}
          </TableCell>
          <TableCell>
            {expiresAt
              ? formatDistanceToNow(new Date(expiresAt), {
                  addSuffix: true,
                })
              : 'Never'}
          </TableCell>
        </>
      )}
      <TableCell>
        <TableAction isLoading={isDeleting}>
          <>
            <DropdownMenuItem
              onClick={() =>
                window.open(
                  `${process.env.NEXT_PUBLIC_APP_URL}/${downloadUrl}`,
                  '_blank'
                )
              }
            >
              <Link className="mr-2 h-4 w-4" />
              <span>Open link</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                navigator.clipboard.writeText(
                  `${process.env.NEXT_PUBLIC_APP_URL}/${downloadUrl}`
                )
              }
            >
              <Copy className="mr-2 h-4 w-4" />
              <span>Copy link</span>
            </DropdownMenuItem>
            {canControl ? (
              <DropdownMenuItem
                onClick={() =>
                  deleteFunction(id, itemType === 'folder' ? 'folder' : 'file')
                }
              >
                <Trash className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            ) : null}
          </>
        </TableAction>
      </TableCell>
    </TableRow>
  );
};

export default TeamSharedFileRows;
