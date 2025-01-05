import React from "react";
import { useRouter } from "next/navigation";
import useParentId from "@/hooks/use-parentId";
import { Button } from "../ui/button";

const FolderNameButton = ({
  folderId,
  folderName,
}: {
  folderId: string;
  folderName: string;
}) => {
  const { updateParentId } = useParentId();
  const router = useRouter();

  const handleFolderClick = (id: string) => {
    updateParentId(id);
    const params = new URLSearchParams(window.location.search);
    params.set("parentId", id);
    router.push(`?${params.toString()}`);
  };
  return (
    <Button
      onClick={() => handleFolderClick(folderId)}
      variant="link"
      className="px-0">
      {folderName}
    </Button>
  );
};

export default FolderNameButton;
