"use client";

import { CompleteBucket } from "@/lib/types";
import FileTable from "../file-table/FileTable";
import DropzoneSelector from "../file-upload/DropzoneSelector";
import { ImportObjectsDialog } from "./import-objects";
import { useState } from "react";
import { Button } from "../ui/button";
import { Download } from "lucide-react";

interface BucketFileSystemProps {
  userId: string;
  bucket: CompleteBucket;
}

export function BucketFileSystem({ bucket, userId }: BucketFileSystemProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  return (
    <div className="p-6 bg-background text-foreground flex flex-col gap-y-4">
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setImportDialogOpen(true)}
        >
          <Download className="h-4 w-4 mr-2" />
          Import Existing Files
        </Button>
      </div>

      <DropzoneSelector bucket={bucket} userId={userId} />

      <FileTable
        userId={userId}
        s3CredentialId={bucket.id}
        bucketName={bucket.name}
      />

      <ImportObjectsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        s3CredentialId={bucket.id}
        bucketName={bucket.name}
      />
    </div>
  );
}
