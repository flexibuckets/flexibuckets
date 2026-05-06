'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFolder } from '@/app/actions';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FolderPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useParentId } from '@/hooks/use-parentId';
import { nanoid } from 'nanoid';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  s3CredentialId: string;
  bucketName: string;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  s3CredentialId,
  bucketName,
}: CreateFolderDialogProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const { parentId } = useParentId();
  const queryClient = useQueryClient();
  const [folderName, setFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const createFolderMutation = useMutation({
    mutationFn: createFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket-files'] });
      toast({
        title: 'Folder created',
        description: `"${folderName}" has been created successfully.`,
      });
      setFolderName('');
      setIsCreating(false);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Error creating folder',
        description: error.message || 'Failed to create folder',
        variant: 'destructive',
      });
      setIsCreating(false);
    },
  });

  const handleCreate = () => {
    const trimmedName = folderName.trim();
    if (!trimmedName || !session?.user?.id) return;

    setIsCreating(true);
    createFolderMutation.mutate({
      id: nanoid(),
      userId: session.user.id,
      folderName: trimmedName,
      parentFolderId: parentId || undefined,
      s3CredentialId,
    });
  };

  const handleClose = () => {
    setFolderName('');
    setIsCreating(false);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && folderName.trim() && !isCreating) {
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            New Folder
          </DialogTitle>
          <DialogDescription>
            Create a new folder in{' '}
            <span className="font-medium">{bucketName}</span>
            {parentId ? ' (inside current folder)' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="folder-name">Folder name</Label>
          <Input
            id="folder-name"
            placeholder="Enter folder name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isCreating}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!folderName.trim() || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Folder
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
