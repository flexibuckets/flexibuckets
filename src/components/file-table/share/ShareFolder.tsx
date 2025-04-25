import React, { useState } from 'react';
import { CompleteFolder, CompleteTeamFolder } from '@/lib/types';
import ShareDialog from './ShareDialog';
import { useShareFolder } from '@/hooks/mutations/useShareFolder';

interface ShareFolderProps {
  folder: CompleteFolder | CompleteTeamFolder;
  teamId?: string;
}

const ShareFolder: React.FC<ShareFolderProps> = ({ folder, teamId }) => {
  const { sharedFolder: sharedResponse } = folder;

  const urlPrefix = `${process.env.NEXT_PUBLIC_APP_URL}/shared/folder`;
  const [downloadUrl, setDownloadUrl] = useState<string>(() => {
    if (!sharedResponse) return '';
    if (
      sharedResponse.expiresAt &&
      sharedResponse.expiresAt.getTime() < new Date().getTime()
    ) {
      return '';
    }
    const tempDownloadUrl = `${urlPrefix}/${sharedResponse.downloadUrl}`;
    return tempDownloadUrl;
  });

  const updateDownloadUrl = (shortUrl: string) => {
    setDownloadUrl(`${urlPrefix}/${shortUrl}`);
  };
  const mutation = useShareFolder({ updateDownloadUrl });

  return (
    <ShareDialog
      mutation={mutation}
      downloadUrl={downloadUrl}
      dialogType="Folder"
      id={folder.id}
      name={folder.name}
      sharedResponse={folder.sharedFolder}
      fileSize={folder.size || '0'}
      teamId={teamId}
    />
  );
};

export default ShareFolder;
