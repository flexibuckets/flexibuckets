import { dropzoneContext } from "@/context/DropzoneContext";
import React, { useContext } from "react";
import { Button } from "../ui/button";
import { Loader2, Upload } from "lucide-react";

const UploadBtn = ({ isTeams = false }: { isTeams?: boolean }) => {
  const { totalCount, batchUpload, isUploading } = useContext(
dropzoneContext
  );
  return (
    <>
      {totalCount > 0 ? (
        <div className="self-end">
          <Button disabled={isUploading} onClick={batchUpload}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 w-4 h-4" />
                Upload
              </>
            )}
          </Button>
        </div>
      ) : null}
    </>
  );
};

export default UploadBtn;
