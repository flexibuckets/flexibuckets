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
import { Check, FolderIcon, Loader2 } from 'lucide-react';
import FileIcon from '../file-upload/FileIcon';
import FileActions from './FileActions';

import { format } from 'date-fns';

import {useParentId }from '@/hooks/use-parentId';
import FolderNameButton from './FolderNameButton';
import FileBreadCrumbs from './FileBreadCrumbs';
import { BreadcrumbPage } from '../ui/breadcrumb';
import FolderActions from './FolderActions';
import useDebounce from '@/hooks/useDebounce';
import { Input } from '../ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileMoreInfo, { MobileMoreInfoRow } from './MobileMoreInfo';
import { CompleteFile, CompleteFolder } from '@/lib/types';

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
      <TableRow key={item.id}>
        <TableCell className={`${isMobile ? 'flex items-center gap-x-2' : ''}`}>
          {isMobile && <FileIcon fileType={item.type} />}
          {item.name}
        </TableCell>
        {isMobile ? (
          <TableCell>
            <FileTableMoreInfo item={item} />
          </TableCell>
        ) : (
          <>
            <TableCell className="flex items-center gap-x-2 ">
              <FileIcon fileType={item.type} />
              <span className="max-w-[16ch] truncate">{item.type}</span>
            </TableCell>
            <TableCell>{formatBytes(item.size || '0')}</TableCell>
            <TableCell>
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
    .map((item) => (
      <TableRow key={item.id}>
        <TableCell className={`${isMobile ? 'flex items-center gap-x-2' : ''}`}>
          {isMobile && <FolderIcon className="h-4 w-4 text-primary" />}
          <FolderNameButton folderId={item.id} folderName={item.name} />
        </TableCell>
        {isMobile ? (
          <TableCell>
            <FileTableMoreInfo item={item} />
          </TableCell>
        ) : (
          <>
            <TableCell className="flex items-center gap-x-2 ">
              <FolderIcon className="h-4 w-4" />
              <span className="max-w-[16ch] truncate">Folder</span>
            </TableCell>
            <TableCell>{formatBytes(item.size || '0')}</TableCell>
            <TableCell>
              {format(new Date(item.updatedAt), 'dd/MM/yyyy p')}
            </TableCell>
          </>
        )}
        <TableCell>
          <FolderActions folder={{ ...item }} />
        </TableCell>
      </TableRow>
    ));
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
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search in current folder . . ."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
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
          ) : data ? (
            <>
              {folderRows ? folderRows : null}
              {fileRows ? fileRows : null}
            </>
          ) : (
            <TableRow>
              <TableCell colSpan={5}>No Files or Folders Found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
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
