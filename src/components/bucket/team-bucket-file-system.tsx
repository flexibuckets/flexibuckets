'use client';

import { CompleteBucket } from '@/lib/types';
import TeamFileTable from '@/components/file-table/TeamFileTable';
import TeamDropzoneSelector from '@/components/file-upload/TeamDropzoneSelector';
import { BucketPermission } from '@prisma/client';
import {useParentId }from '@/hooks/use-parentId';
import FileBreadCrumbs from '@/components/file-table/FileBreadCrumbs';
import { BreadcrumbPage } from '@/components/ui/breadcrumb';
import { DeleteBucket } from './delete-bucket';
import { ImportObjectsDialog } from './import-objects';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Download } from 'lucide-react';

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
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  return (
    <div className="p-6 bg-background text-foreground flex flex-col gap-y-4">
      <div className="w-full flex flex-row justify-between items-center">
        <div>
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
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportDialogOpen(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Import Files
          </Button>
          {canUpload && (
            <DeleteBucket
              bucketName={bucket.name}
              bucketId={bucket.id}
              userId={userId}
            />
          )}
        </div>
      </div>

      {canUpload && <TeamDropzoneSelector bucket={bucket} userId={userId} />}

      <TeamFileTable bucket={bucket} currentUserId={userId} />

      <ImportObjectsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        s3CredentialId={bucket.id}
        bucketName={bucket.name}
      />
    </div>
  );
}
