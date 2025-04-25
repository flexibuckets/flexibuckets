'use client';

import { useState } from 'react';
import { useJoinTeam } from '@/hooks/use-team-invites';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from 'next/navigation';

interface JoinTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinTeamDialog({ open, onOpenChange }: JoinTeamDialogProps) {
  const [inviteCode, setInviteCode] = useState('');
  const joinTeamMutation = useJoinTeam();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    try {
      await joinTeamMutation.mutateAsync(inviteCode);
      onOpenChange(false);
      setInviteCode('');
      router.refresh();
    } catch (error) {
      throw new Error(`${ error instanceof Error ? error.message : ""}`)
      // Error handling is done in the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a Team</DialogTitle>
          <DialogDescription>
            Enter the invite code to join a team
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Enter invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            disabled={joinTeamMutation.isPending}
          />
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={joinTeamMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!inviteCode.trim() || joinTeamMutation.isPending}
            >
              Join Team
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
