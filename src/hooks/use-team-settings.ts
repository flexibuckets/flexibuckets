"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateTeam,
  regenerateInviteCode,
  deleteTeamAction,
} from "@/lib/actions/team-settings-actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "./use-workspace-context";

export function useTeamSettings(teamId: string) {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setSelectedTeam } = useWorkspaceStore();
  const updateTeamMutation = useMutation({
    mutationFn: (data: {
      name?: string;
      description?: string;
      maxMembers?: number;
    }) => updateTeam(teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      toast({
        title: "Success",
        description: "Team settings updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update team settings",
      });
    },
  });

  const regenerateCodeMutation = useMutation({
    mutationFn: () => regenerateInviteCode(teamId),
    onSuccess: (newCode) => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      toast({
        title: "Success",
        description: `Invite code regenerated successfully: ${newCode}`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to regenerate invite code",
      });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: () => deleteTeamAction(teamId),
    onSuccess: () => {
      setSelectedTeam(null);
      toast({
        title: "Success",
        description: "Team deleted successfully",
      });
      router.push("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete team",
      });
    },
  });

  return {
    updateTeam: updateTeamMutation.mutate,
    regenerateInviteCode: regenerateCodeMutation.mutate,
    deleteTeam: deleteTeamMutation.mutate,
    isLoading:
      updateTeamMutation.isPending ||
      regenerateCodeMutation.isPending ||
      deleteTeamMutation.isPending,
  };
}
