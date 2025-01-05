import React from "react";
import {
  dropzoneContext,
  DropzoneContextProvider,
} from "@/context/DropzoneContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompleteBucket } from "@/lib/types";
import FilesDropzone from "./FilesDropzone";
import UploadView from "./UploadView";
import FolderDropzone from "./FolderDropzone";
import UploadBtn from "./UploadBtn";

const DropzoneSelector = ({
  bucket,
  userId,
}: {
  bucket: CompleteBucket;
  userId: string;
}) => {
  return (
    <DropzoneContextProvider bucket={bucket} userId={userId}>
      <Tabs defaultValue="files" className="w-full">
        <TabsList>
          <TabsTrigger value="files">File Upload</TabsTrigger>
          <TabsTrigger value="folders">Folder Upload</TabsTrigger>
        </TabsList>
        <TabsContent value="files">
          <FilesDropzone />
        </TabsContent>
        <TabsContent value="folders">
          <FolderDropzone />
        </TabsContent>
      </Tabs>
      <UploadView isTeams={false} />
      <UploadBtn />
    </DropzoneContextProvider>
  );
};

export default DropzoneSelector;
