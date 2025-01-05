"use client";

import { CompleteBucket } from "@/lib/types"; // Ensure this type is updated
import FileTable from "../file-table/FileTable";
import DropzoneSelector from "../file-upload/DropzoneSelector";

interface BucketFileSystemProps {
  userId: string;
  bucket: CompleteBucket;
}

export function BucketFileSystem({ bucket, userId }: BucketFileSystemProps) {
  return (
    <div className="p-6 bg-background text-foreground flex flex-col gap-y-4">
      {/* File drop zone */}
      <DropzoneSelector bucket={bucket} userId={userId} />

      {/* File list */}
      <FileTable
        userId={userId}
        s3CredentialId={bucket.id}
        bucketName={bucket.name}
      />
    </div>
  );
}
