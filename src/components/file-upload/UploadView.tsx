import {dropzoneContext } from "@/context/DropzoneContext";
import { FileWithId, Folder } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Clock,
  FileCheck,
  FolderCheck,
  FolderIcon,
  Loader2,
  Trash,
} from "lucide-react";
import React, { useContext} from "react";
import FileIcon from "./FileIcon";
import FolderSheet from "./FolderSheet";
import * as mime from 'mime-types';

const UploadView = ({ isTeams }: { isTeams: boolean }) => {
  const {
    files,
    folders,
    removeFile,
    totalCount,
    removeFolder,
    folderCount,
    fileCount,
    selectedFolderId,
    updateSelectedFolder,
  } = useContext( dropzoneContext);

  const fileList = files.map(({ id, file, status }: FileWithId) => {
    const mimeType = mime.lookup(file.name) || file.type;
    
    return (
      <div
        key={id}
        className={cn(
          "flex items-center justify-between space-x-2 p-2 bg-secondary/80 hover:bg-secondary rounded-md mb-2 max-w-lg",
          { "animate-pulse": status === "uploading" }
        )}>
        <div className="flex items-center space-x-2 ">
          <FileIcon fileType={mimeType} />
          <span className="text-sm max-w-[20ch] overflow-hidden truncate">
            {file.name}
          </span>
        </div>
        <button
          disabled={status !== null}
          className={cn(
            "focus:outline-none p-2",
            status === "uploading" && "text-blue-500",
            status === "uploaded" && "text-green-500",
            status === "inQueue" && "text-yellow-500",
            status === null && "text-red-500 hover:text-red-700"
          )}
          onClick={() => removeFile(id)}>
          {status === "uploading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === "uploaded" ? (
            <FileCheck className="h-4 w-4" />
          ) : status === "inQueue" ? (
            <Clock className="h-4 w-4 animate-spin" />
          ) : (
            <Trash className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  });

  const folderList = folders.map((folder: Folder) => {
    const { id, name, status } = folder;
    return (
      <div
        key={id}
        className={cn(
          "flex items-center justify-between space-x-2 p-2 bg-secondary/80 hover:bg-secondary rounded-md mb-2 max-w-lg",
          { "animate-pulse": status === "uploading" }
        )}>
        <button
          onClick={() => updateSelectedFolder(folder.id)}
          className="flex items-center space-x-2  hover:underline">
          <FolderIcon />
          <span className="text-sm max-w-[20ch] overflow-hidden truncate">
            {name}
          </span>
        </button>
        <button
          disabled={status !== null}
          className={cn(
            "focus:outline-none p-2",
            status === "uploading" && "text-blue-500",
            status === "uploaded" && "text-green-500",
            status === "inQueue" && "text-yellow-500",
            status === null && "text-red-500 hover:text-red-700"
          )}
          onClick={() => removeFolder(id)}>
          {status === "uploading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === "uploaded" ? (
            <FolderCheck className="h-4 w-4" />
          ) : status === "inQueue" ? (
            <Clock className="h-4 w-4 animate-spin" />
          ) : (
            <Trash className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  });

  const selectedFolder = folders.find(({ id }) => id === selectedFolderId);
  return (
    <>
      <div className="w-full space-y-2">
        {totalCount <= 0 ? (
          <p>No Files or Folders Selected to upload</p>
        ) : (
          <div className="text-sm space-y-2">
            <div>
              Folders: {folderCount}{" "}
              <span className="italic">
                {"(click on folder name to open folder view)"}
              </span>
            </div>
            <span>Files: {fileCount}</span>
          </div>
        )}

        <div className="w-full grid  md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 overflow-y-auto max-h-48">
          {folderList}
          {fileList}
        </div>
      </div>
      {selectedFolder ? (
        <FolderSheet
          folder={selectedFolder}
          closeSheet={() => updateSelectedFolder("")}
        />
      ) : null}
    </>
  );
};

export default UploadView;
