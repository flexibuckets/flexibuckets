import React, { useCallback, useState } from "react";
import DeleteFolder from "./DeleteFolder";
import { DownloadFolder } from "./DownloadFolder";
import ShareFolder from "@/components/file-table/share/ShareFolder";
import { CompleteFolder } from "@/lib/types";
import TableAction from "../TableAction";

const FolderActions = ({ folder }: { folder: CompleteFolder }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const updateLoading = useCallback(
    (val: boolean) => {
      setIsLoading(val);
    },
    [setIsLoading]
  );
  return (
    <TableAction isLoading={isLoading}>
      <>
        <DownloadFolder
          folderId={folder.id}
          folderName={folder.name}
        />
        <ShareFolder folder={folder} />
        <DeleteFolder folder={folder} updateLoading={updateLoading} />
      </>
    </TableAction>
  );
};

export default FolderActions;
