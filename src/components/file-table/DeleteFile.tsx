import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash, X } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/hooks/use-toast";

type DeleteFileProps = {
  fileId: string;
  fileName: string;
  s3CredentialId: string;
  updateLoading: (val: boolean) => void;
};
const DeleteFile = ({
  fileId,
  fileName,
  s3CredentialId,
  updateLoading,
}: DeleteFileProps) => {
  const [open, setIsOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: removeFile, isPending: isLoading } = useMutation({
    onMutate: () => {
      setIsOpen(false);
      updateLoading(true);
    },
    mutationFn: async () => {
      const response = await fetch("/api/delete-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId, s3CredentialId }),
      });
      if (!response.ok) {
        throw new Error("Failed to delete file");
      }
    },
    onSuccess: () => {
      setIsDeleting(false);
      toast({
        title: "File Removed from bucket",
        description: (
          <>
            Successfully Deleted <Badge variant={"success"}>{fileName}</Badge>{" "}
            from cloud and our records.
          </>
        ),
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["bucket-files"] });
      queryClient.invalidateQueries({ queryKey: ["total-file-size"] });
    },
    onError: () => {
      toast({
        title: "File Not Removed from bucket",
        description: `Unable to Delete ${fileName}, please try again later.`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      updateLoading(false);
    },
  });
  const isDisabled = isDeleting || isLoading;
  return (
    <AlertDialog open={open} onOpenChange={(v) => setIsOpen(v)}>
      <AlertDialogTrigger asChild>
        <Button disabled={isDisabled} variant="destructive" size="sm">
          {isDisabled ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting
            </>
          ) : (
            <>
              <Trash className="h-4 w-4 mr-2" /> Delete
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            <Badge variant="destructive">{fileName}</Badge>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isDisabled}
            onClick={() => removeFile()}
            className="text-destructive bg-white border border-destructive hover:text-white hover:bg-destructive">
            <Trash className="h-4 w-4 mr-2" />
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteFile;
