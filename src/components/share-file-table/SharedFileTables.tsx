'use client';
import { getSharedFiles } from '@/app/actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import MobileMoreInfo, {
  MobileMoreInfoRow,
} from '../file-table/MobileMoreInfo';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '../ui/skeleton';
import SharedFileRows from './SharedFileRows';
import { getTeamSharedFiles } from '@/app/actions';
import { TeamRole } from '@prisma/client';
import TeamSharedFileRows from './TeamSharedFileRows';
import { TeamSharedContent } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';

interface SharedFilesTableProps {
  userId: string;
  teamId?: string;
  userTeamRole?: TeamRole | 'NONE';
}

const getSharedContent = ({ userId, teamId }: SharedFilesTableProps) => {
  if (teamId) {
    return getTeamSharedFiles({ userId, teamId });
  }
  return getSharedFiles(userId);
};

export function SharedFilesTable({
  userId,
  teamId,
  userTeamRole,
}: SharedFilesTableProps) {
  const { data, isLoading, isError } = useQuery({
    queryFn: () => getSharedContent({ userId, teamId }),
    queryKey: [teamId ? 'team-shared-files' : 'shared-files'],
  });
  const isMobile = useIsMobile();
  const getTableRows = () => {
    if (isLoading) {
      return <TableLoader count={3} colCount={teamId ? 6 : 5} />;
    }
    if (data) {
      const { sharedFiles, sharedFolders } = data;
      if (sharedFiles.length <= 0 && sharedFolders.length <= 0)
        return <NoRows isError={isError} />;
      return (
        <>
          {teamId ? (
            <TeamSharedFileRows
              sharedFiles={sharedFiles as TeamSharedContent['sharedFiles']}
              sharedFolders={
                sharedFolders as TeamSharedContent['sharedFolders']
              }
              userId={userId}
              userTeamRole={userTeamRole ?? 'NONE'}
              isMobile={isMobile}
            />
          ) : (
            <SharedFileRows
              sharedFiles={sharedFiles}
              sharedFolders={sharedFolders}
              isMobile={isMobile}
            />
          )}
        </>
      );
    }
    return <NoRows isError={isError} />;
  };

  return (
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
              {teamId && <TableHead>SharedBy</TableHead>}
              <TableHead>Shared On</TableHead>
              <TableHead>Expires</TableHead>
            </>
          )}
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{getTableRows()}</TableBody>
    </Table>
  );
}

export const TableLoader = ({
  count = 1,
  colCount = 6,
}: {
  count?: number;
  colCount?: number;
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <TableRow key={`table-skeleton-${index + 1}`}>
          {Array.from({ length: colCount }).map((_, index) => (
            <TableCell key={`table-col-skeleton-${index + 1}`}>
              <Skeleton className="w-full h-4" />
            </TableCell>
          ))}

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

export const NoRows = ({ isError }: { isError: boolean }) => {
  if (isError) {
    return (
      <TableRow>
        <TableCell className="text-foreground" colSpan={6}>
          Error loading shared files.
        </TableCell>
      </TableRow>
    );
  }
  return (
    <TableRow>
      <TableCell colSpan={6}>No Files are being shared currently</TableCell>
    </TableRow>
  );
};

type SharedTableMoreInfoProps = {
  type: string;
  size: string;
  sharedBy?: string;
  sharedOn: string;
  expires: string;
};
export const SharedTableMoreInfo = ({
  type,
  size,
  sharedBy,
  sharedOn,
  expires,
}: SharedTableMoreInfoProps) => {
  return (
    <TableCell>
      <MobileMoreInfo>
        <MobileMoreInfoRow heading="type" value={type} />

        <MobileMoreInfoRow heading="size" value={size} />

        {sharedBy && <MobileMoreInfoRow heading="shared by" value={sharedBy} />}

        <MobileMoreInfoRow heading="shared on" value={sharedOn} />

        <MobileMoreInfoRow heading="expires" value={expires} />
      </MobileMoreInfo>
    </TableCell>
  );
};
