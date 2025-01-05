import { SharedContent } from '@/lib/types';
import React, { useState } from 'react';
import { TableCell, TableRow } from '../ui/table';
import { formatBytes } from '@/lib/utils';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { Link, Copy, Trash, FolderIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import FileIcon from '../file-upload/FileIcon';
import { deleteSharedItem } from '@/app/actions';
import TableAction from '../TableAction';
import { SharedTableMoreInfo } from './SharedFileTables';
type SharedItem = {
  id: string;
  name: string;
  itemType: string;
  size: string;
  createdAt: Date;
  expiresAt: Date | null;
  downloadUrl: string;
  isDeleting: boolean;
};

type SharedFileRowsProps = SharedContent & { isMobile: boolean };

const SharedFileRows = ({
  sharedFiles,
  sharedFolders,
  isMobile,
}: SharedFileRowsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingRow, setDeletingRow] = useState<string | null>(null);

  const { mutate: mutateFileFromShare } = useMutation({
    mutationFn: deleteSharedItem,
    onMutate: ({ id }) => {
      setDeletingRow(id);
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ['shared-files'] });
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

  const files = sharedFiles.map((sharedFile) => ({
    id: sharedFile.fileId,
    name: sharedFile.file.name,
    itemType: sharedFile.file.type,
    size: sharedFile.file.size,
    createdAt: sharedFile.createdAt,
    expiresAt: sharedFile.expiresAt,
    downloadUrl: sharedFile.downloadUrl,
    isDeleting: deletingRow === sharedFile.fileId,
  }));

  const folders = sharedFolders.map((sharedFolder) => ({
    id: sharedFolder.folderId,
    name: sharedFolder.folder.name,
    itemType: 'folder',
    size: sharedFolder.folder.size ?? 0, // Ensure size is a number, default to 0 if undefined
    createdAt: sharedFolder.createdAt,
    expiresAt: sharedFolder.expiresAt,
    downloadUrl: sharedFolder.downloadUrl,
    isDeleting: deletingRow === sharedFolder.folderId,
  }));

  const sharedItems = [...files, ...folders];
  return (
    <>
      {sharedItems.map((item) => (
        <SharedTableRow
          key={item.id}
          item={item}
          deleteFunction={removeFileFromShare}
          isMobile={isMobile}
        />
      ))}
    </>
  );
};

type SharedTableRowProps = {
  item: SharedItem;
  deleteFunction: (id: string, type: 'file' | 'folder') => void;
  isMobile: boolean;
};

const SharedTableRow = ({
  item,
  deleteFunction,
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
  } = item;

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
          type={itemType === 'folder' ? 'Folder' : itemType}
          size={formatBytes(size.toString())}
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
            <div className="flex items-center gap-x-2">
              {itemType === 'folder' ? (
                <>
                  <FolderIcon className="h-4 w-4" />
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
            <DropdownMenuItem
              onClick={() =>
                deleteFunction(id, itemType === 'folder' ? 'folder' : 'file')
              }
            >
              <Trash className="mr-2 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </>
        </TableAction>
      </TableCell>
    </TableRow>
  );
};

export default SharedFileRows;
