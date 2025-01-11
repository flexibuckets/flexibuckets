import { dropzoneContext } from "@/context/DropzoneContext";
import { Folder } from "@/lib/types";
import React, { useCallback, useContext } from "react";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import * as mime from 'mime-types';

const FolderDropzone = () => {
  const { folders, addFolders, isUploading, updateSelectedFolder } =
    useContext(dropzoneContext);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (isMobile) {
        // Folder uploads are not supported on mobile devices
        toast({
          variant: "destructive",
          title: "Folder upload not supported on mobile",
          description:
            "Please use a desktop browser to upload folders. You can still upload individual files from your mobile device.",
        });
        return;
      }
      const newFolders: Folder[] = [];

      acceptedFiles.forEach((file) => {
        //@ts-expect-error - FileSystemEntry type not fully supported in TypeScript
        const splitedName = file.path.split("/") as string[];

        //getting name of file from path since it's always last
        const fileName = splitedName.pop();

        //if empty string is start of path then shifting the array
        if (splitedName[0] === "") splitedName.shift();

        //shifting the array to get root folder
        const rootFolderName = splitedName.shift();

        //throw error if folder couldn't be added
        if (!rootFolderName) {
          toast({
            variant: "destructive",
            title: "Error adding folder.",
            description: `Something went wrong with this folder. Please try again later. If the issue persists, try contacting us.`,
          });
          return;
        }

        //function to find or create a folder in the given folder list
        const findOrCreateFolder = (
          folders: Folder[],
          folderName: string
        ): Folder => {
          let folder = folders.find(({ name }) => name === folderName);
          if (!folder) {
            folder = {
              id: uuidv4(),
              name: folderName,
              files: [],
              folders: [],
              status: null,
            };
            folders.push(folder);
          }
          return folder;
        };

        // Find or create the root folder
        let currentFolder = findOrCreateFolder(newFolders, rootFolderName);

        // Traverse or create sub-folders based on the remaining splitedName
        while (splitedName.length > 0) {
          const subFolderName = splitedName.shift();
          if (subFolderName) {
            currentFolder = findOrCreateFolder(
              currentFolder.folders,
              subFolderName
            );
          }
        }
        // Now we're at the correct folder, so we add the file
        const fileType = mime.lookup(fileName || '') || file.type;
        const fileWithMime = new File([file], fileName || '', { type: fileType });

        currentFolder.files.push({
          id: uuidv4(),
          file: fileWithMime,
          status: null,
          path: `${fileName}`,
        });
      });

      if (newFolders.length > 0) {
        updateSelectedFolder(newFolders[0].id);
        addFolders(newFolders);
      }
    },
    [folders, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    useFsAccessApi: false,
  });
  return (
    <div className="flex flex-col space-y-4">
      {isMobile && (
        <div className="text-sm text-muted-foreground">
          Note: Folder uploads are not supported on mobile devices. You can
          upload individual files instead.
        </div>
      )}
      <div
        {...getRootProps({
          className: cn(
            "border-dashed border-4  rounded-lg p-6 w-full h-48 flex justify-center items-center text-center cursor-pointer hover:bg-muted hover:border-primary/80",
            {
              "border-primary": isDragActive,
              "bg-muted": isUploading,
            }
          ),
        })}>
        <input
          //@ts-expect-error webkiterror
          {...getInputProps({ webkitdirectory: "true" })}
          disabled={isUploading}
        />
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Please Wait for
            uploading folders.
          </>
        ) : isDragActive ? (
          <p className="text-center text-lg">Drop the folder here...</p>
        ) : (
          <p className="text-center text-lg">
            Drag & Drop folder here, or click here to upload.
          </p>
        )}
      </div>
    </div>
  );
};

export default FolderDropzone;
