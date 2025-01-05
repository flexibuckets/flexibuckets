import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileStructureView } from "./FileStructureView";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, ExternalLink, FolderIcon, Loader2 } from "lucide-react";
import { FolderStructure } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface SharedFolderDownloadProps {
  folderStructure: FolderStructure;
  sharedFolderId: string;
}

type DownloadApiParamsType = {
  sharedFolderId: string;
  selectedItems: Set<string>;
  folderName?: string;
  subFolderId?: string;
};
export type DownloadApiType = (params: DownloadApiParamsType) => void;

const downloadApi = async ({
  sharedFolderId,
  selectedItems,
  folderName,
  subFolderId,
}: DownloadApiParamsType) => {
  try {
    const response = await fetch("/api/download-shared-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sharedFolderId: sharedFolderId,
        selectedItems: Array.from(selectedItems),
        subFolderId: subFolderId,
      }),
    });

    if (!response.ok) throw new Error("Download failed");

    const { urls } = await response.json();

    const zip = new JSZip();

    for (const { name, url } of urls) {
      const fileResponse = await fetch(url);
      const fileBlob = await fileResponse.blob();
      zip.file(name, fileBlob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, folderName ? `${folderName}.zip` : "shared_files.zip");

    return { success: true };
  } catch (error) {
    console.error("Error downloading items:", error);
    throw error;
  }
};

export type OpenedFolderType = FolderStructure | null;

const SharedFolderDownload: React.FC<SharedFolderDownloadProps> = ({
  folderStructure,
  sharedFolderId,
}) => {
  const [openedFolder, setOpenedFolder] = useState<OpenedFolderType>(null);

  const updateOpenedFolder = (val: OpenedFolderType) => {
    setOpenedFolder(val);
  };

  const { toast } = useToast();

  const { mutate: handleDownload, isPending: isDownloading } = useMutation({
    mutationFn: downloadApi,
    onSuccess: () => {
      toast({
        title: "Download Complete",
        description: "Downloading of files is completed.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Download Failed",
        description:
          error.message || "There was an error downloading the selected items.",
        variant: "destructive",
      });
    },
  });

  return (
    <div
      className={`bg-background border border-border rounded-lg p-6 ${
        openedFolder ? "max-w-4xl" : "max-w-md"
      } w-full`}>
      {openedFolder ? (
        <FileStructureView
          item={openedFolder}
          updateOpenedFolder={updateOpenedFolder}
          handleDownload={handleDownload}
          isDownloading={isDownloading}
          sharedFolderId={sharedFolderId}
        />
      ) : (
        <FolderCardContent
          folderStructure={folderStructure}
          isDownloading={isDownloading}
          sharedFolderId={sharedFolderId}
          handleDownload={handleDownload}
          updateOpenedFolder={updateOpenedFolder}
        />
      )}
    </div>
  );
};

const FolderCardContent = ({
  folderStructure,
  isDownloading,
  sharedFolderId,
  handleDownload,
  updateOpenedFolder,
}: {
  folderStructure: FolderStructure;
  isDownloading: boolean;
  sharedFolderId: string;
  handleDownload: DownloadApiType;
  updateOpenedFolder: (val: OpenedFolderType) => void;
}) => {
  return (
    <>
      <div className="flex items-center mb-4">
        <FolderIcon className="h-12 w-12 text-yellow-500 mr-4" />
        <div>
          <h1 className="text-2xl font-bold">{folderStructure.name}</h1>
        </div>
      </div>
      <div className="mb-4">
        <p>
          <strong>Size:</strong>{" "}
          {folderStructure.size ? formatBytes(folderStructure.size) : "-"}
        </p>
      </div>
      <div className="flex justify-between">
        <Button
          disabled={isDownloading}
          onClick={() =>
            handleDownload({
              sharedFolderId,
              folderName: folderStructure.name,
              selectedItems: new Set<string>(),
            })
          }>
          {isDownloading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Downloading
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" /> Download Folder
            </>
          )}
        </Button>
        <Button
          onClick={() => updateOpenedFolder(folderStructure)}
          variant="info">
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Folder
        </Button>
      </div>
    </>
  );
};

export default SharedFolderDownload;
