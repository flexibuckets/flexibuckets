'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removeMember, updateMemberRole } from '@/lib/actions/team-member-actions';
import { TeamRole } from '@prisma/client';
import { useToast } from '@/hooks/use-toast';

export function useTeamMembers(teamId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const removeMemberMutation = useMutation({
    mutationFn: ({ userId, removeFiles }: { userId: string; removeFiles: boolean }) =>
      removeMember(teamId, userId, removeFiles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      toast({
        title: "Success",
        description: "Team member removed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to remove team member",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: TeamRole }) =>
      updateMemberRole(teamId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      toast({
        title: "Success",
        description: "Member role updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update member role",
      });
    },
  });

  return {
    removeMember: removeMemberMutation.mutate,
    updateRole: updateRoleMutation.mutate,
    isLoading: removeMemberMutation.isPending || updateRoleMutation.isPending,
  };
}
