'use client';

import { CompleteBucket } from '@/lib/types';
import TeamFileTable from '@/components/file-table/TeamFileTable';
import TeamDropzoneSelector from '@/components/file-upload/TeamDropzoneSelector';
import { BucketPermission } from '@prisma/client';
import {useParentId }from '@/hooks/use-parentId';
import FileBreadCrumbs from '@/components/file-table/FileBreadCrumbs';
import { BreadcrumbPage } from '@/components/ui/breadcrumb';
import { DeleteBucket } from './delete-bucket';

interface TeamBucketFileSystemProps {
  userId: string;
  bucket: CompleteBucket;
  permissions: BucketPermission;
}

export function TeamBucketFileSystem({
  bucket,
  userId,
  permissions,
}: TeamBucketFileSystemProps) {
  const canUpload =
    permissions === 'READ_WRITE' || permissions === 'FULL_ACCESS';
  const { parentId } = useParentId();
  return (
    <div className="p-6 bg-background text-foreground flex flex-col gap-y-4">
      <div className="w-full flex flex-row justify-between">
        {parentId ? (
          <FileBreadCrumbs
            parentId={parentId}
            bucketName={bucket.name}
            bucketId={bucket.id}
            isTeams={true}
          />
        ) : (
          <BreadcrumbPage className="capitalize md:text-xl">
            {bucket.name}
          </BreadcrumbPage>
        )}
        {canUpload && (
          <DeleteBucket
            bucketName={bucket.name}
            bucketId={bucket.id}
            userId={userId}
          />
        )}
      </div>

      {/* File drop zone - only show if user has upload permissions */}
      {canUpload && <TeamDropzoneSelector bucket={bucket} userId={userId} />}

      {/* File list with user info */}
      <TeamFileTable bucket={bucket} currentUserId={userId} />
    </div>
  );
}
