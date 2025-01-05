import React, { useContext } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Clock, FileCheck, FolderIcon, Loader2, Trash } from 'lucide-react';
import { Folder } from '@/lib/types';
import FileIcon from './FileIcon';
import { cn } from '@/lib/utils';
import { dropzoneContext } from '@/context/DropzoneContext';

interface FolderSheetProps {
  folder: Folder;
  closeSheet: () => void;
}

const FolderSheet: React.FC<FolderSheetProps> = ({
  folder,
  closeSheet,
}) => {
  const { removeFileFromFolder, removeSubfolder } = useContext(
    dropzoneContext
  );

  // Recursive function to render folders and files
  const renderFolderStructure = (currentFolder: Folder) => {
    return (
      <div className="ml-4 mt-2">
        {/* Display all subfolders */}
        {currentFolder.folders.map((subFolder) => (
          <div key={subFolder.id}>
            <div className="flex items-center space-x-2">
              <FolderIcon className="text-foreground" />
              <span className="text-foreground font-semibold max-w-[20ch] truncate">
                {subFolder.name}
              </span>
              {/* Remove Subfolder Button */}
              <button
                onClick={() => removeSubfolder(currentFolder.id, subFolder.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash className="h-4 w-4" />
              </button>
            </div>
            {/* Recursively render subfolders and files */}
            {renderFolderStructure(subFolder)}
          </div>
        ))}

        {/* Display all files in the current folder */}
        {currentFolder.files.map((file) => (
          <div key={file.id} className="flex items-center space-x-2 my-2">
            <button
              disabled={true}
              className={cn(
                'focus:outline-none p-2',
                file.status === 'uploading' && 'text-blue-500',
                file.status === 'uploaded' && 'text-green-500',
                file.status === 'inQueue' && 'text-yellow-500'
              )}
            >
              {file.status === 'uploading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : file.status === 'uploaded' ? (
                <FileCheck className="h-4 w-4" />
              ) : file.status === 'inQueue' ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <FileIcon fileType={file.file.type} />
              )}
            </button>
            <span className="text-foreground/80 text-sm max-w-[20ch] truncate">
              {file.file.name}
            </span>
            {/* Remove File Button */}
            {file.status === null ? (
              <button
                onClick={() => removeFileFromFolder(currentFolder.id, file.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Sheet open={!!folder} onOpenChange={closeSheet}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{folder.name}</SheetTitle>
        </SheetHeader>
        {/* Scrollable folder structure */}
        <div className="bg-muted rounded-md h-[calc(100vh-7rem)] mt-2 overflow-y-auto p-4">
          {renderFolderStructure(folder)}
        </div>
      </SheetContent>
    </Sheet>
  );
};
export default FolderSheet;
