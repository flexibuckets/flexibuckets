"use client";

import {
  createFolder,
  createManyFiles,
  updateBatchFolderSize,
} from "@/app/actions";
import { CompleteBucket, FileStatus, FileWithId, Folder } from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createContext, ReactNode } from "react";
import { handleUpload } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/utils";
import { getParentKey, useFileManagement } from "@/hooks/use-file-management";

export type DropzoneContext = {
  files: FileWithId[];
  addFiles: (newFiles: FileWithId[]) => void;
  removeFile: (fileId: string) => void;
  updateFileState: (fileIds: string[], setToState: FileStatus) => void;
  clearFiles: () => void;
  fileCount: number;

  folders: Folder[];
  addFolders: (newFolders: Folder[]) => void;
  removeFolder: (folderId: string) => void;
  folderCount: number;

  bucket: CompleteBucket;
  userId: string;
  isUploading: boolean;
  batchUpload: () => Promise<void>;
  totalCount: number;

  selectedFolderId: string;
  updateSelectedFolder: (folderId: string) => void;
  removeFileFromFolder: (folderId: string, fileId: string) => void;
  removeSubfolder: (parentFolderId: string, folderId: string) => void;

  totalFileCount: number;
  totalUploadSize: number;
};

const defaultBucket: CompleteBucket = {
  id: "",
  userId: "",
  accessKey: "",
  secretKey: "",
  bucket: "",
  region: "",
  provider: null,
  endpointUrl: "",
  teamBucket: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  filesCount: 0,
  size: "",
  name: "",
};

export const dropzoneContext = createContext<DropzoneContext>({
  files: [],
  addFiles: () => {},
  removeFile: () => {},
  clearFiles: () => {},
  updateFileState: () => {},
  folders: [],
  addFolders: () => {},
  removeFolder: () => {},
  userId: "",
  bucket: defaultBucket,
  isUploading: false,
  batchUpload: async () => {},
  fileCount: 0,
  folderCount: 0,
  totalCount: 0,
  selectedFolderId: "",
  updateSelectedFolder: () => {},
  totalFileCount: 0,
  totalUploadSize: 0,
  removeFileFromFolder: () => {},
  removeSubfolder: () => {},
});

export const DropzoneContextProvider = ({
  children,
  bucket,
  userId,
}: {
  children: ReactNode;
  bucket: CompleteBucket;
  userId: string;
}) => {
  const fileManagement = useFileManagement();
  const {
    files,
    updateFileState,
    setSelectedFolderId,
    setIsUploading,
    clearFiles,
    clearFolders,
    totalFileCount,
    totalUploadSize,
    folders,
    updateFolderState,
    setAllFolderFilesState,
    routeParent,
    setAllStateToNull,
    updateFolderFileState,
  } = fileManagement;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate: addFilesToDb } = useMutation({
    mutationFn: createManyFiles,
    onSuccess: (_, variables) => {
      const updateFiles = files
        .filter((file) => variables.some((v) => v.name === file.file.name))
        .map((file) => file.id);
      updateFileState(updateFiles, "uploaded");
    },
  });

  const { mutate: createFolderInDb } = useMutation({
    mutationFn: createFolder,
    onError: (err) => {
      console.log(err);
    },
  });

  const { mutate: updateFolderSizes } = useMutation({
    mutationFn: updateBatchFolderSize,
    onSuccess: () => {
      setSelectedFolderId("");
      setIsUploading(false);
      queryClient.invalidateQueries({ queryKey: ["bucket-files"] });
      queryClient.invalidateQueries({ queryKey: ["total-file-size"] });
      clearFiles();
      clearFolders();
    },
    onError: () => {
      toast({
        title: "Error Updating Folder Sizes",
        variant: "destructive",
        description:
          "Total size of folders is not being calculated but Files and folders are uploaded successfully. You just won't be able to see size for certain folder/files.",
      });
    },
  });

  const batchUpload = async () => {
    setIsUploading(true);

    try {
      const batchSize = 5;

      if (folders.length > 0) {
        const fileIds = files.map((file) => file.id);
        updateFileState(fileIds, "inQueue");
        updateFolderState([folders[0].id], "uploading");
        setAllFolderFilesState("inQueue");
      }

      const remaingFolderIds = folders.slice(1).map(({ id }) => id);
      updateFolderState(remaingFolderIds, "inQueue");
      let parentKey = "";

      if (routeParent) {
        parentKey = await getParentKey(routeParent);
        if (!parentKey) {
          setAllStateToNull();
          toast({
            title: "Folder trying to upload in not found.",
            description:
              "Go back to root directory to upload folders and files.",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }
      }

      const folderSizeMap = new Map<string, number>();

      const uploadFolderRecursive = async (
        rootId: string,
        folder: Folder,
        parentId: string | null,
        folderParentKey?: string
      ) => {
        try {
          let totalSize = 0;

          createFolderInDb({
            id: folder.id,
            folderName: folder.name,
            userId,
            parentFolderId: parentId ? parentId : undefined,
            s3CredentialId: bucket.id,
          });

          if (folder.files.length > 0) {
            for (let i = 0; i < folder.files.length; i += batchSize) {
              const fileBatch = folder.files.slice(i, i + batchSize);
              const fileIds = fileBatch.map((file) => file.id);
              updateFolderFileState(rootId, folder.id, fileIds, "uploading");

              try {
                await handleUpload({
                  creds: {
                    accessKey: bucket.accessKey,
                    bucketName: bucket.name,
                    endpointUrl: bucket.endpointUrl,
                    secretKey: bucket.secretKey,
                    region: bucket.region,
                  },
                  files: fileBatch.map((f) => ({
                    file: f.file,
                    key: folderParentKey
                      ? `${folderParentKey}/${folder.name}/${f.file.name}`
                      : `${folder.name}/${f.file.name}`,
                    size: f.file.size,
                  })),
                });

                addFilesToDb(
                  fileBatch.map((file) => ({
                    id: file.id,
                    userId,
                    name: file.file.name,
                    type: file.file.type,
                    s3Key: folderParentKey
                      ? `${folderParentKey}/${folder.name}/${file.file.name}`
                      : `${folder.name}/${file.file.name}`,
                    size: file.file.size.toString(),
                    s3CredentialId: bucket.id,
                    folderId: folder.id,
                  }))
                );
                updateFolderFileState(rootId, folder.id, fileIds, "uploaded");

                totalSize += fileBatch.reduce(
                  (sum, file) => sum + file.file.size,
                  0
                );
              } catch (error) {
                toast({
                  variant: "destructive",
                  title: "Error uploading files.",
                  description:
                    error instanceof Error
                      ? error.message
                      : `Error uploading some of the files in the folder.`,
                });
                updateFolderFileState(rootId, folder.id, fileIds, null);
              }
            }
          }

          for (const subFolder of folder.folders) {
            const subFolderSize =
              (await uploadFolderRecursive(
                rootId,
                subFolder,
                folder.id,
                folderParentKey
                  ? `${folderParentKey}/${folder.name}`
                  : folder.name
              )) || 0;

            totalSize += subFolderSize;
          }

          folderSizeMap.set(folder.id, totalSize);

          return totalSize;
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error creating folder.",
            description:
              error instanceof Error
                ? error.message
                : `Could not create folder ${folder.name}.`,
          });
          return 0;
        }
      };

      for (const rootFolder of folders) {
        updateFolderState([rootFolder.id], "uploading");
        await uploadFolderRecursive(
          rootFolder.id,
          rootFolder,
          routeParent,
          parentKey
        );
        updateFolderState([rootFolder.id], "uploaded");
      }

      let totalUploadedFileSize = 0;

      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);

        const fileIds = batch.map((file) => file.id);
        updateFileState(fileIds, "uploading");

        try {
          await handleUpload({
            creds: {
              accessKey: bucket.accessKey,
              bucketName: bucket.name,
              endpointUrl: bucket.endpointUrl,
              secretKey: bucket.secretKey,
              region: bucket.region,
            },
            files: batch.map((f) => ({
              file: f.file,
              key: parentKey ? `${parentKey}/${f.file.name}` : `${f.file.name}`,
              size: f.file.size,
            })),
          });

          addFilesToDb(
            batch.map((file) => ({
              id: file.id,
              userId,
              name: file.file.name,
              type: file.file.type,
              s3Key: parentKey
                ? `${parentKey}/${file.file.name}`
                : `${file.file.name}`,
              size: file.file.size.toString(),
              s3CredentialId: bucket.id,
              folderId: routeParent ?? undefined,
            }))
          );
          updateFileState(fileIds, "uploaded");

          totalUploadedFileSize += batch.reduce(
            (sum, file) => sum + file.file.size,
            0
          );
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error uploading file.",
            description:
              error instanceof Error
                ? error.message
                : `Error uploading some of the files from the current batch`,
          });
          updateFileState(fileIds, null);
        }
      }

      if (routeParent) {
        const folderSizes = folders.reduce(
          (sum, folder) => sum + (folderSizeMap.get(folder.id) || 0),
          0
        );
        const fileSizes = totalUploadedFileSize;
        folderSizeMap.set(routeParent, folderSizes + fileSizes);
      }

      const foldersWithSizes = Array.from(folderSizeMap.entries()).map(
        ([folderId, size]) => ({
          folderId,
          size: size.toString(),
        })
      );

      updateFolderSizes({ foldersWithSizes });
    } catch (error) {
      setIsUploading(false);
      toast({
        title: "Upload Error",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <dropzoneContext.Provider
      value={{
        files,
        addFiles: fileManagement.addFiles,
        removeFile: fileManagement.removeFile,
        updateFileState,
        clearFiles,
        fileCount: files.length,
        folders,
        addFolders: fileManagement.addFolders,
        removeFolder: fileManagement.removeFolder,
        folderCount: folders.length,
        bucket,
        userId,
        isUploading: fileManagement.isUploading,
        batchUpload,
        totalCount: files.length + folders.length,
        selectedFolderId: fileManagement.selectedFolderId,
        updateSelectedFolder: fileManagement.updateSelectedFolder,
        removeFileFromFolder: fileManagement.removeFileFromFolder,
        removeSubfolder: fileManagement.removeSubfolder,
        totalFileCount,
        totalUploadSize,
      }}
    >
      {children}
    </dropzoneContext.Provider>
  );
};
