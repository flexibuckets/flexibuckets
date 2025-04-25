'use client'

import { useState } from "react";
import { CompleteBucket } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "./use-toast";
import { uploadTeamFileAction } from "@/app/actions";

interface UseTeamFileUploadProps {
  bucket: CompleteBucket;
  userId: string;
  onProgress?: (progress: number) => void;
}

export function useTeamFileUpload({ bucket, userId, onProgress }: UseTeamFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    try {
      const totalSize = files.reduce((acc, file) => acc + file.size, 0);
      let uploadedSize = 0;

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucketId', bucket.id);
        formData.append('userId', userId);

        const { presignedUrl } = await uploadTeamFileAction(formData);

        // Upload file with progress tracking
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const fileProgress = (event.loaded / event.total) * file.size;
              uploadedSize += fileProgress;
              onProgress?.(Math.min((uploadedSize / totalSize) * 100, 100));
            }
          };
          xhr.onload = () => xhr.status === 200 ? resolve(null) : reject();
          xhr.onerror = () => reject();
          xhr.open('PUT', presignedUrl);
          xhr.send(file);
        });

        uploadedSize += file.size;
        onProgress?.((uploadedSize / totalSize) * 100);
      }

      queryClient.invalidateQueries({ queryKey: ["team-files", bucket.id] });
      toast({
        title: "Success",
        description: `${files.length} file${files.length === 1 ? "" : "s"} uploaded successfully`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload files",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFiles, isUploading };
}