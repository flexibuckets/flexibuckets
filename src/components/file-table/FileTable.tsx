import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBucketFiles } from '@/app/actions';
import { Skeleton } from '../ui/skeleton';

import { formatBytes } from '@/lib/utils';
import {
  Check,
  FolderIcon,
  FolderPlus,
  Loader2,
  FileIcon as FileIconLucide,
} from 'lucide-react';
import FileIcon from '../file-upload/FileIcon';
import FileActions from './FileActions';

import { format } from 'date-fns';

import { useParentId } from '@/hooks/use-parentId';
import FolderNameButton from './FolderNameButton';
import FileBreadCrumbs from './FileBreadCrumbs';
import { BreadcrumbPage } from '../ui/breadcrumb';
import FolderActions from './FolderActions';
import useDebounce from '@/hooks/useDebounce';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileMoreInfo, { MobileMoreInfoRow } from './MobileMoreInfo';
import { CompleteFile, CompleteFolder } from '@/lib/types';
import { CreateFolderDialog } from './create-folder';
import { Badge } from '../ui/badge';

const FileTable = ({
  bucketName,
  ...props
}: {
  userId: string;
  s3CredentialId: string;
  bucketName: string;
}) => {
  const { parentId } = useParentId();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data, isError, isRefetching, isLoading, refetch } = useQuery({
    queryFn: () =>
      getBucketFiles({ ...props, parentId, searchQuery: debouncedSearchQuery }),
    queryKey: ['bucket-files', debouncedSearchQuery],
  });

  useEffect(() => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['breadcrumbs'] });
  }, [parentId]);
  if (isError) {
    return (
      <span className="text-destructive text-lg">
        Something Went Wrong Please try again Later
      </span>
    );
  }
  const fileRows = data?.files
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .map((item) => (
      <TableRow key={item.id} className="group">
        <TableCell className={`${isMobile ? 'flex items-center gap-x-2' : ''}`}>
          {isMobile && <FileIcon fileType={item.type} />}
          <span className="font-medium">{item.name}</span>
        </TableCell>
        {isMobile ? (
          <TableCell>
            <FileTableMoreInfo item={item} />
          </TableCell>
        ) : (
          <>
            <TableCell className="flex items-center gap-x-2">
              <FileIcon fileType={item.type} />
              <span className="max-w-[16ch] truncate text-muted-foreground">{item.type}</span>
            </TableCell>
            <TableCell className="text-muted-foreground">{formatBytes(item.size || '0')}</TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(item.updatedAt), 'dd/MM/yyyy p')}
            </TableCell>
          </>
        )}

        <TableCell>
          <FileActions file={item} />
        </TableCell>
      </TableRow>
    ));

  const folderRows = data?.folders
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .map((item) => {
      const itemCount = (item as CompleteFolder & { _count?: { files: number; children: number } })._count
        ? (item as CompleteFolder & { _count: { files: number; children: number } })._count.files +
          (item as CompleteFolder & { _count: { files: number; children: number } })._count.children
        : 0;
      return (
        <TableRow key={item.id} className="group bg-muted/30 hover:bg-muted/50">
          <TableCell className={`${isMobile ? 'flex items-center gap-x-2' : ''}`}>
            {isMobile && <FolderIcon className="h-4 w-4 text-primary" />}
            <div className="flex items-center gap-2">
              <FolderNameButton folderId={item.id} folderName={item.name} />
              {itemCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </Badge>
              )}
            </div>
          </TableCell>
          {isMobile ? (
            <TableCell>
              <FileTableMoreInfo item={item} />
            </TableCell>
          ) : (
            <>
              <TableCell className="flex items-center gap-x-2">
                <FolderIcon className="h-4 w-4 text-primary" />
                <span className="max-w-[16ch] truncate text-muted-foreground">Folder</span>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatBytes(item.size || '0')}</TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(item.updatedAt), 'dd/MM/yyyy p')}
              </TableCell>
            </>
          )}
          <TableCell>
            <FolderActions folder={{ ...item }} />
          </TableCell>
        </TableRow>
      );
    });
  return (
    <>
      <div className="flex justify-between items-center">
        {parentId ? (
          <FileBreadCrumbs
            parentId={parentId}
            bucketName={bucketName}
            bucketId={props.s3CredentialId}
          />
        ) : (
          <BreadcrumbPage>{bucketName}</BreadcrumbPage>
        )}
        {isRefetching || isLoading ? (
          <div className="flex items-center pt-2  text-blue-900">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking for
            updates..
          </div>
        ) : (
          <div className="flex items-center pt-2  text-success-foreground">
            <Check className="h-4 w-4 mr-2" /> Files upto date
          </div>
        )}
      </div>
      <div className="mb-4 flex items-center gap-2">
        <Input
          type="text"
          placeholder="Search in current folder . . ."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreateFolderOpen(true)}
        >
          <FolderPlus className="h-4 w-4 mr-2" />
          New Folder
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            {isMobile ? (
              <TableHead>Info</TableHead>
            ) : (
              <>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Modified</TableHead>
              </>
            )}

            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableLoader count={3} />
          ) : data && (data.folders.length > 0 || data.files.length > 0) ? (
            <>
              {folderRows ? folderRows : null}
              {fileRows ? fileRows : null}
            </>
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-32 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileIconLucide className="h-8 w-8" />
                  <p>No files or folders found</p>
                  <p className="text-xs">Upload files or create a folder to get started</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        s3CredentialId={props.s3CredentialId}
        bucketName={bucketName}
      />
    </>
  );
};

export const TableLoader = ({ count = 1 }: { count?: number }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <TableRow key={`table-skeletion-${index + 1}`}>
          <TableCell>
            <Skeleton className="w-full h-4" />
          </TableCell>
          <TableCell>
            <Skeleton className="w-full h-4" />
          </TableCell>
          <TableCell>
            <Skeleton className="w-full h-4" />
          </TableCell>
          <TableCell>
            <Skeleton className="w-full h-4" />
          </TableCell>
          <TableCell className="flex gap-x-1">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="w-4 h-4" />
            <Skeleton className="w-4 h-4" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};
export default FileTable;

const FileTableMoreInfo = ({
  item,
}: {
  item: CompleteFile | CompleteFolder;
}) => {
  return (
    <MobileMoreInfo>
      <MobileMoreInfoRow
        heading="type"
        value={isFile(item) ? item.type : 'Folder'}
      />
      <MobileMoreInfoRow heading="size" value={formatBytes(item.size || '0')} />
      <MobileMoreInfoRow
        heading="updated At"
        value={format(new Date(item.updatedAt), 'dd/MM/yyyy p')}
      />
    </MobileMoreInfo>
  );
};

const isFile = (item: CompleteFile | CompleteFolder): item is CompleteFile => {
  return 'type' in item;
};
