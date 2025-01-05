import React, {useState } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { FolderStructure } from "@/lib/types";
import { OpenedFolderType, DownloadApiType } from "./ShareFolderDownload";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FolderIcon, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import FileIcon from "../file-upload/FileIcon";

import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import SharedFolderAction from "./SharedFolderAction";
import ShareFolderBreadcrumbs from "./ShareFolderBreadcrumbs";

interface FileStructureProps {
  item: FolderStructure;
  updateOpenedFolder: (val: OpenedFolderType) => void;
  handleDownload: DownloadApiType;
  isDownloading: boolean;
  sharedFolderId: string;
}

export const FileStructureView: React.FC<FileStructureProps> = ({
  item,
  updateOpenedFolder,
  handleDownload,
  isDownloading,
  sharedFolderId,
}) => {
  const [selectedItems, setSelectedItems] = useState<Set<FolderStructure>>(
    new Set()
  );
  const [blipItemId, setBlipItemId] = useState<string>("");

  const selectedItemsArray: FolderStructure[] = Array.from(selectedItems);

  const toggleSelection = (val: FolderStructure) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(val)) {
        newSet.delete(val);
      } else {
        newSet.add(val);
      }
      return newSet;
    });
  };

  const onDownload = () => {
    handleDownload({
      sharedFolderId,
      selectedItems: new Set<string>(
        Array.from(selectedItems).map(({ id }) => id)
      ),
    });
  };

  const sortedChildren = item.children?.slice().sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === "folder" ? -1 : 1;
  });

  const handleSelectedListItemClick = (child: FolderStructure) => {
    if (item.id !== child.parentFolder?.id)
      updateOpenedFolder(child.parentFolder);

    setBlipItemId(child.id);

    // Remove the ID from the set after a delay (e.g., 500ms)
    setTimeout(() => {
      setBlipItemId("");
    }, 500);
  };
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => updateOpenedFolder(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Folder?
        </Button>
        <Button
          disabled={isDownloading || selectedItems.size === 0}
          onClick={onDownload}>
          {isDownloading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Downloading
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" /> Download Selected (
              {selectedItems.size})
            </>
          )}
        </Button>
      </div>
      <ShareFolderBreadcrumbs
        currentOpenedFolder={item}
        updateOpenedFolder={updateOpenedFolder}
      />
      <ScrollArea className="h-[50vh]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedChildren?.map((child) => (
              <TableRow
                key={child.id}
                className={`${blipItemId === child.id ? "animate-blip" : ""}`}>
                <TableCell>
                  <div className="flex items-center">
                    {child.type === "folder" ? (
                      <button
                        className="text-left hover:underline flex items-center"
                        onClick={() => updateOpenedFolder(child)}>
                        <FolderIcon className="mr-2 h-4 w-4" />
                        {child.name}
                      </button>
                    ) : (
                      <span>{child.name}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {child.type === "folder" ? (
                    "-"
                  ) : (
                    <div className="flex items-center gap-x-2">
                      <FileIcon fileType={child.type} />
                      {child.type.split("/")[1]}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {child.size ? formatBytes(child.size) : "-"}
                </TableCell>
                <TableCell>
                  {child.type === "folder" ? (
                    // **Use SharedFolderAction for folders**
                    <SharedFolderAction
                      folder={child}
                      updateOpenedFolder={updateOpenedFolder}
                      handleDownload={handleDownload}
                      sharedFolderId={sharedFolderId}
                      isDownloading={isDownloading}
                    />
                  ) : (
                    // **Checkbox for files only**
                    <span className="px-2">
                      <Checkbox
                        checked={selectedItemsArray.some(
                          ({ id }) => id === child.id
                        )}
                        onCheckedChange={() => toggleSelection(child)}
                      />
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      {selectedItems.size > 0 ? (
        <ScrollArea>
          <div className="flex w-max space-x-4 p-4">
            {selectedItemsArray.map((child) => {
              return (
                <div
                  key={child.id}
                  onClick={() => handleSelectedListItemClick(child)}
                  className="flex items-center gap-x-2 p-2 bg-secondary/80 hover:bg-secondary rounded-md max-w-md truncate text-sm cursor-pointer">
                  <FileIcon fileType={child.type} />
                  {child.s3Key?.split("/").slice(1).join("/")}
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <div className="flex justify-center items-center space-x-4 p-4">
          <div className="p-2 bg-secondary/80 rounded-md  text-sm">
            You can select files from multiple folders.
          </div>
        </div>
      )}
    </>
  );
};
