import { CompleteFile} from "@/lib/types";
import React, { useState } from "react";
import ShareDialog from "./ShareDialog";
import { useShareFile } from "@/hooks/mutations/useShareFile";

type ShareFileProps = {
  file: CompleteFile;
};

const ShareFile = ({ file }: ShareFileProps) => {
  const { sharedFile: sharedResponse } = file;
  const urlPrefix = `${process.env.NEXT_PUBLIC_APP_URL}/shared`;
  const [downloadUrl, setDownloadUrl] = useState<string>(() => {
    if (!sharedResponse) return "";
    if (
      sharedResponse.expiresAt &&
      sharedResponse.expiresAt.getTime() < new Date().getTime()
    ) {
      return "";
    }
    const tempDownloadUrl = `${urlPrefix}/${sharedResponse.downloadUrl}`;
    return tempDownloadUrl;
  });

  const updateDownloadUrl = (shortUrl: string) => {
    setDownloadUrl(`${urlPrefix}/${shortUrl}`);
  };

  const mutation = useShareFile({ updateDownloadUrl });

  return (
    <ShareDialog
      mutation={mutation}
      downloadUrl={downloadUrl}
      dialogType="File"
      id={file.id}
      name={file.name}
      sharedResponse={file.sharedFile}
      fileSize={file.size}
    />
  );
};

export default ShareFile;
