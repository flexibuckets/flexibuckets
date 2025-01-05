import React from "react";
import { FolderStructure } from "@/lib/types";
import { OpenedFolderType, DownloadApiType } from "./ShareFolderDownload";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

interface SharedFolderActionProps {
  folder: FolderStructure;
  updateOpenedFolder: (val: OpenedFolderType) => void;
  handleDownload: DownloadApiType;
  sharedFolderId: string;
  isDownloading: boolean;
}

const SharedFolderAction: React.FC<SharedFolderActionProps> = ({
  folder,
  updateOpenedFolder,
  handleDownload,
  sharedFolderId,
  isDownloading,
}) => {
  return (
    <>
      {isDownloading ? (
        <Button variant="ghost" disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel
              className="flex items-center gap-x-2 cursor-pointer"
              onClick={() => updateOpenedFolder(folder)}>
              <ExternalLink className="h-4 w-4" />
              Open Folder
            </DropdownMenuLabel>
            <DropdownMenuLabel
              className="flex items-center gap-x-2 cursor-pointer"
              onClick={() =>
                handleDownload({
                  sharedFolderId,
                  folderName: folder.name,
                  subFolderId: folder.id,
                  selectedItems: new Set<string>(),
                })
              }>
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download Folder
                </>
              )}
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
};

export default SharedFolderAction;
