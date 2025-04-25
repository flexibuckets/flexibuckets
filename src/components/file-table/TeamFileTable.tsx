'use client';

import { useTeamFiles } from '@/hooks/use-team-files';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Check, FolderIcon, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import FileBreadCrumbs from './FileBreadCrumbs';
import { BreadcrumbPage } from '../ui/breadcrumb';
import FileIcon from '../file-upload/FileIcon';
import { formatBytes } from '@/lib/utils';
import { format } from 'date-fns';
import FolderNameButton from './FolderNameButton';
import TeamFileActions from './TeamFileActions';
import {
  CompleteBucket,
  CompleteTeamFile,
  CompleteTeamFolder,
} from '@/lib/types';
import AccessDenied from '../dashboard/AccessDenied';
import { Skeleton } from '../ui/skeleton';
import { useMemo } from 'react';
import TeamFolderActions from './TeamFolderActions';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileMoreInfo, { MobileMoreInfoRow } from './MobileMoreInfo';

interface TeamFileTableProps {
  bucket: CompleteBucket;
  currentUserId: string;
}

export default function TeamFileTable({
  bucket,
  currentUserId,
}: TeamFileTableProps) {
  const { id: s3CredentialId, name: bucketName, teamBucket } = bucket;
  const isMobile = useIsMobile();
  const {
    data,
    isLoading,
    deleteFile,
    searchQuery,
    updateSearchQuery,
    parentId,
    isRefetching,
    isError,
  } = useTeamFiles({ s3CredentialId, userId: currentUserId });

  if (isError) {
    return (
      <span className="text-destructive text-lg">
        Something Went Wrong Please try again Later
      </span>
    );
  }
  if (!teamBucket) {
    return <AccessDenied />;
  }

  const { userRole, teamId } = useMemo(() => teamBucket, []);

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
          <TeamFileTableMoreInfo item={item} />
        ) : (
          <>
            <TableCell className="flex items-center gap-x-2 ">
              <FileIcon fileType={item.type} />
              <span className="max-w-[16ch] truncate">{item.type}</span>
            </TableCell>
            <TableCell>{formatBytes(item.size || '0')}</TableCell>
            <TableCell>{item.uploadedBy}</TableCell>
            <TableCell>
              {format(new Date(item.updatedAt), 'dd/MM/yyyy p')}
            </TableCell>
          </>
        )}

        <TableCell>
          <TeamFileActions
            teamId={teamId}
            file={item}
            userTeamRole={userRole}
            currentUserId={currentUserId}
          />
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
          {isMobile && <FolderIcon className="h-4 w-4" />}
          <FolderNameButton folderId={item.id} folderName={item.name} />
        </TableCell>

        {isMobile ? (
          <TeamFileTableMoreInfo item={item} />
        ) : (
          <>
            <TableCell className="flex items-center gap-x-2 ">
              <FolderIcon className="h-4 w-4" />
              <span className="max-w-[16ch] truncate">Folder</span>
            </TableCell>
            <TableCell>{formatBytes(item.size || '0')}</TableCell>
            <TableCell>{item.uploadedBy}</TableCell>
            <TableCell>
              {format(new Date(item.updatedAt), 'dd/MM/yyyy p')}
            </TableCell>
          </>
        )}

        <TableCell>
          <TeamFolderActions
            folder={item}
            teamId={teamId}
            userTeamRole={userRole}
            currentUserId={currentUserId}
          />
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
            isTeams={true}
            bucketId={s3CredentialId}
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
          onChange={(e) => updateSearchQuery(e.target.value)}
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
                <TableHead>Uploaded By</TableHead>
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
              <TableCell colSpan={5}>No Files or Folders Found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}

const TableLoader = ({ count = 1 }: { count?: number }) => {
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

const TeamFileTableMoreInfo = ({
  item,
}: {
  item: CompleteTeamFile | CompleteTeamFolder;
}) => {
  return (
    <MobileMoreInfo>
      <MobileMoreInfoRow
        heading="type"
        value={isFile(item) ? item.type : 'Folder'}
      />
      <MobileMoreInfoRow heading="size" value={formatBytes(item.size || '0')} />
      <MobileMoreInfoRow heading="uploaded by" value={item.uploadedBy} />
      <MobileMoreInfoRow
        heading="updated At"
        value={format(new Date(item.updatedAt), 'dd/MM/yyyy p')}
      />
    </MobileMoreInfo>
  );
};

const isFile = (
  item: CompleteTeamFile | CompleteTeamFolder
): item is CompleteTeamFile => {
  return 'type' in item;
};
