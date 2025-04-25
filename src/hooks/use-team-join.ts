"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { joinTeam } from "@/lib/actions/team-join-actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface JoinTeamParams {
  teamId: string;
  inviteCode: string;
}

export function useTeamJoin() {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const joinTeamMutation = useMutation({
    mutationFn: ({ teamId, inviteCode }: JoinTeamParams) => 
      joinTeam(teamId, inviteCode),
    onSuccess: (result) => {
      if (result.wasInvited) {
        toast({
          title: "Success",
          description: "Successfully joined the team",
        });
        queryClient.invalidateQueries({ queryKey: ["teams"] });
        router.push(`/dashboard`);
      } else {
        toast({
          title: "Success",
          description: "Join request sent successfully. Waiting for approval.",
        });
        router.push('/dashboard');
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to join team",
      });
    },
  });

  return {
    joinTeam: joinTeamMutation.mutate,
    isLoading: joinTeamMutation.isPending,
  };
}
