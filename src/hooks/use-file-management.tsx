import { FileStatus, FileWithId, Folder } from "@/lib/types";
import { useState } from "react";

import useParentId from "@/hooks/use-parentId";

export const updateFilesInFolder = (
  folder: Folder,
  folderId: string,
  setToState: FileStatus,
  fileIds: string[]
): Folder => {
  // If the folder is the target folder, update its files
  if (folder.id === folderId) {
    return {
      ...folder,
      files: folder.files.map((f) =>
        fileIds.includes(f.id) ? { ...f, status: setToState } : f
      ),
    };
  }

  // If the folder has subfolders, recursively update them
  if (folder.folders && folder.folders.length > 0) {
    return {
      ...folder,
      folders: folder.folders.map((subFolder) =>
        updateFilesInFolder(subFolder, folderId, setToState, fileIds)
      ),
    };
  }

  return folder; // If no changes, return the folder as is
};

export const getParentKey = async (folderId: string): Promise<string> => {
  try {
    const response = await fetch("/api/get-parent-key", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ folderId }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    return data.folderPath; // This assumes your API returns the folderPath in JSON
  } catch (error) {
    console.error("Failed to fetch parent key:", error);
    return "";
  }
};

// Helper function to count files and calculate size in a folder recursively
const countFilesInFolder = (folder: Folder): number => {
  return (
    folder.files.length +
    folder.folders.reduce(
      (count, subFolder) => count + countFilesInFolder(subFolder),
      0
    )
  );
};

const calculateFolderSize = (folder: Folder): number => {
  return (
    folder.files.reduce((sum, file) => sum + file.file.size, 0) +
    folder.folders.reduce(
      (sum, subFolder) => sum + calculateFolderSize(subFolder),
      0
    )
  );
};
export function useFileManagement() {
  const [files, setFiles] = useState<FileWithId[]>([]);
  const { parentId: routeParent } = useParentId();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [totalFileCount, setTotalFileCount] = useState(0);
  const [totalUploadSize, setTotalUploadSize] = useState(0);
  const updateSelectedFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
  };

  const addFiles = (newFiles: FileWithId[]) => {
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    setTotalFileCount((prevCount) => prevCount + newFiles.length);
    setTotalUploadSize(
      (prevSize) =>
        prevSize + newFiles.reduce((sum, file) => sum + file.file.size, 0)
    );
  };

  const removeFile = (fileId: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));
  };

  const updateFileState = (fileIds: string[], setToState: FileStatus) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        fileIds.includes(file.id) ? { ...file, status: setToState } : file
      )
    );
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const addFolders = (newFolders: Folder[]) => {
    setFolders((prevFolders) => [...prevFolders, ...newFolders]);
    const newFileCount = newFolders.reduce(
      (count, folder) => count + countFilesInFolder(folder),
      0
    );
    setTotalFileCount((prevCount) => prevCount + newFileCount);
    const newSize = newFolders.reduce(
      (sum, folder) => sum + calculateFolderSize(folder),
      0
    );
    setTotalUploadSize((prevSize) => prevSize + newSize);
  };

  const removeFolder = (folderId: string) => {
    setFolders((prevFolders) =>
      prevFolders.filter((folder) => folder.id !== folderId)
    );
  };

  const updateFolderState = (folderIds: string[], setToState: FileStatus) => {
    setFolders((prevFolders) =>
      prevFolders.map((folder) =>
        folderIds.includes(folder.id)
          ? { ...folder, status: setToState }
          : folder
      )
    );
  };

  const updateFolderFileState = (
    rootId: string,
    folderId: string,
    fileIds: string[],
    setToState: FileStatus
  ) => {
    setFolders((prevFolders) =>
      prevFolders.map((folder) =>
        folder.id === rootId
          ? updateFilesInFolder(folder, folderId, setToState, fileIds) // Recursively update the target folder
          : folder
      )
    );
  };

  const setAllFolderFilesState = (setToState: FileStatus) => {
    const updateFolderFiles = (folder: Folder): Folder => {
      // Update the status of all files in the current folder to "inQueue"
      const updatedFiles = folder.files.map((file) => ({
        ...file,
        status: setToState,
      }));

      // Recursively update files in all subfolders
      const updatedSubfolders = folder.folders.map((subfolder) =>
        updateFolderFiles(subfolder)
      );

      // Return the updated folder with updated files and subfolders
      return {
        ...folder,
        files: updatedFiles,
        folders: updatedSubfolders,
      };
    };

    // Update the state by mapping through all root folders
    setFolders((prevFolders) =>
      prevFolders.map((folder) => updateFolderFiles(folder))
    );
  };

  const clearFolders = () => {
    setFolders([]);
  };

  const removeFileFromFolder = (folderId: string, fileId: string) => {
    const updatedFolders = folders
      .map((folder) => updateFolderRemoveFile(folder, folderId, fileId))
      .filter((folder): folder is Folder => folder !== null); // Filter out any null folders
    setFolders(updatedFolders);
  };

  const updateFolderRemoveFile = (
    folder: Folder,
    folderId: string,
    fileId: string
  ): Folder | null => {
    let updatedFolder = { ...folder };

    if (folder.id === folderId) {
      updatedFolder.files = folder.files.filter((file) => file.id !== fileId);
    } else {
      updatedFolder.folders = folder.folders
        .map((subFolder) => updateFolderRemoveFile(subFolder, folderId, fileId))
        .filter((subFolder): subFolder is Folder => subFolder !== null);
    }

    // Check if the folder is empty (no files and no subfolders)
    if (
      updatedFolder.files.length === 0 &&
      updatedFolder.folders.length === 0
    ) {
      return null; // Folder is empty and should be removed
    }

    return updatedFolder;
  };

  // Function to remove a subfolder from a folder
  const removeSubfolder = (parentFolderId: string, folderId: string) => {
    const updatedFolders = folders
      .map((folder) =>
        updateFolderRemoveFolder(folder, parentFolderId, folderId)
      )
      .filter((folder): folder is Folder => folder !== null); // Filter out any null folders
    setFolders(updatedFolders);
  };

  const updateFolderRemoveFolder = (
    folder: Folder,
    parentFolderId: string,
    folderId: string
  ): Folder | null => {
    let updatedFolder = { ...folder };

    if (folder.id === parentFolderId) {
      updatedFolder.folders = folder.folders.filter(
        (subFolder) => subFolder.id !== folderId
      );
    } else {
      updatedFolder.folders = folder.folders
        .map((subFolder) =>
          updateFolderRemoveFolder(subFolder, parentFolderId, folderId)
        )
        .filter((subFolder): subFolder is Folder => subFolder !== null);
    }

    // Check if the folder is empty (no files and no subfolders)
    if (
      updatedFolder.files.length === 0 &&
      updatedFolder.folders.length === 0
    ) {
      return null; // Folder is empty and should be removed
    }

    return updatedFolder;
  };

  const setAllStateToNull = () => {
    updateFileState(
      files.map((f) => f.id),
      null
    );
    updateFolderState(
      folders.map((f) => f.id),
      null
    );
    setAllFolderFilesState(null);
  };

  const fileCount = files.length;
  const folderCount = folders.length;
  const totalCount = fileCount + folderCount;

  return {
    files,
    setFiles,
    routeParent,
    folders,
    setFolders,
    isUploading,
    setIsUploading,
    selectedFolderId,
    setSelectedFolderId,
    totalFileCount,
    setTotalFileCount,
    totalUploadSize,
    setTotalUploadSize,
    updateSelectedFolder,
    addFiles,
    removeFile,
    updateFileState,
    clearFiles,
    addFolders,
    removeFolder,
    updateFolderState,
    updateFolderFileState,
    setAllFolderFilesState,
    clearFolders,
    removeFileFromFolder,
    removeSubfolder,
    setAllStateToNull,
    fileCount,
    folderCount,
    totalCount,
  };
}
