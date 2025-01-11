"use client";
import React, { useCallback, useContext } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import { dropzoneContext } from "@/context/DropzoneContext";
import { FileWithId } from "@/lib/types";
import { Loader2 } from "lucide-react";
import mime from "mime-types";


const FilesDropzone: React.FC = () => {
  const { files, addFiles, isUploading } = useContext(dropzoneContext);
  const { toast } = useToast();


  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: FileWithId[] = [];
      acceptedFiles.forEach((file) => {
        if (files.some((f) => f.file.name === file.name)) {
          toast({
            variant: "destructive",
            title: "Error adding file.",
            description: `File with the name "${file.name}" is already added.`,
          });
        } else {
          const mimeType = mime.lookup(file.name) || file.type;
          const fileWithMime = new File([file], file.name, {
            type: mimeType,
          });

          newFiles.push({
            id: uuidv4(),
            file: fileWithMime,
            status: null,
            path: file.webkitRelativePath || file.name,
          });
        }
      });

      if (newFiles.length > 0) {
        addFiles(newFiles);
      }
    },
    [files, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  return (
    <div className="flex flex-col  space-y-4">
      <div
        {...getRootProps({
          className: cn(
            "border-dashed border-4 rounded-lg p-6 w-full h-48 flex justify-center items-center text-center cursor-pointer hover:bg-muted hover:border-primary/80",
            {
              "border-primary": isDragActive,
              "bg-muted": isUploading,
            }
          ),
        })}>
        <input {...getInputProps()} disabled={isUploading} />
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Please Wait for
            uploading Files.
          </>
        ) : isDragActive ? (
          <p className="text-center text-lg">Drop the files here...</p>
        ) : (
          <p className="text-center text-lg">
            Drag & Drop files here, or click here to upload.
          </p>
        )}
      </div>
    </div>
  );
};

export default FilesDropzone;
