import { FolderStructure } from "@/lib/types";
import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "../ui/button";
import { OpenedFolderType } from "./ShareFolderDownload";

type ShareFolderBreadcrumbsType = {
  currentOpenedFolder: FolderStructure;
  updateOpenedFolder: (val: OpenedFolderType) => void;
};
const ShareFolderBreadcrumbs = ({
  currentOpenedFolder,
  updateOpenedFolder,
}: ShareFolderBreadcrumbsType) => {
  const breadcrumbs: FolderStructure[] = [];
  let current = currentOpenedFolder;

  while (true) {
    breadcrumbs.push(current);
    if (current.parentFolder) current = current.parentFolder;
    else break;
  }

  const handleBreadcrumbClick = (folder: FolderStructure) => {
    updateOpenedFolder(folder);
  };
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <>
            {breadcrumbs.reverse().map((folder, index) => (
              <BreadcrumbItem key={folder.id}>
                {index === breadcrumbs.length - 1 ? (
                  <>
                    <BreadcrumbPage>
                      <Button disabled className="p-0 text-base" variant="link">
                        {folder.name}
                      </Button>
                    </BreadcrumbPage>
                  </>
                ) : (
                  <>
                    <BreadcrumbLink asChild>
                      <Button
                        onClick={() => handleBreadcrumbClick(folder)}
                        className="p-0 text-base"
                        variant="link">
                        {folder.name}
                      </Button>
                    </BreadcrumbLink>
                    <BreadcrumbSeparator />
                  </>
                )}
              </BreadcrumbItem>
            ))}
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default ShareFolderBreadcrumbs;
