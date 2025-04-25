"use client";

import { CompleteBucket } from "@/lib/types";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  
  TeamDropzoneContextProvider,
} from "@/context/TeamDropzoneContext";
import TeamsFileDropzone from "./TeamsFileDropzone";
import TeamsFolderDropzone from "./TeamsFolderDropzone";
import UploadView from "./UploadView";

import UploadBtn from "./UploadBtn";

interface TeamDropzoneSelectorProps {
  bucket: CompleteBucket;
  userId: string;
}

export default function TeamDropzoneSelector({
  bucket,
  userId,
}: TeamDropzoneSelectorProps) {
  return (
    <TeamDropzoneContextProvider bucket={bucket} userId={userId}>
      <Tabs defaultValue="files" className="w-full">
        <TabsList>
          <TabsTrigger value="files">File Upload</TabsTrigger>
          <TabsTrigger value="folders">Folder Upload</TabsTrigger>
        </TabsList>
        <TabsContent value="files">
          <TeamsFileDropzone />
        </TabsContent>
        <TabsContent value="folders">
          <TeamsFolderDropzone />
        </TabsContent>
      </Tabs>
      <UploadView isTeams={true} />
      <UploadBtn isTeams={true} />
    </TeamDropzoneContextProvider>
  );
}
