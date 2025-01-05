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
import { deleteFolder } from "@/app/actions";
import { CompleteFolder} from "@/lib/types";

const DeleteFolder = ({
  folder,
  updateLoading,
}: {
  folder: CompleteFolder;
  updateLoading: (val: boolean) => void;
}) => {
  const { id, userId, name, s3CredentialId } = folder;
  const [open, setIsOpen] = useState<boolean>(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: removeFolder, isPending: isDeleting } = useMutation({
    mutationFn: deleteFolder,
    onMutate: () => {
      setIsOpen(false);
      updateLoading(true);
    },
    onSuccess: () => {
      toast({
        title: "Folder Removed",
        description: (
          <>
            Successfully deleted <Badge variant="success">{name}</Badge> and its
            contents.
          </>
        ),
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["bucket-files"] });
      queryClient.invalidateQueries({ queryKey: ["total-file-size"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: (
          <>
            Unable to delete <Badge variant="destructive">{name}.</Badge> Please
            try again later.
          </>
        ),
        variant: "destructive",
      });
    },
    onSettled: () => {
      updateLoading(false);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={(v) => setIsOpen(v)}>
      <AlertDialogTrigger asChild>
        <Button disabled={isDeleting} variant="destructive" size="sm">
          {isDeleting ? (
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
            This action cannot be undone. This will permanently delete the
            folder <Badge variant="destructive">{name}</Badge> and all its
            contents.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={() =>
              removeFolder({ userId, folderId: id, s3CredentialId })
            }
            className="text-destructive bg-white border border-destructive hover:text-white hover:bg-destructive">
            <Trash className="h-4 w-4 mr-2" />
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteFolder;
