import { useMutation } from '@tanstack/react-query';
import {inviteToTeam, joinTeamWithCode } from '@/lib/actions/teams';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export function useTeamInviteCode(teamId: string,email:string) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => inviteToTeam(teamId,email),
    onSuccess: () => {
      
      toast({
        title: "Success",
        description: "Invite code generated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });
}

export function useJoinTeam() {
  const { toast } = useToast();
  const router = useRouter();

  return useMutation({
    mutationFn: (inviteCode: string) => joinTeamWithCode(inviteCode),
    onSuccess: (result) => {
      if (result.wasInvited) {
        toast({
          title: "Success",
          description: "You have joined the team successfully",
        });
        router.push('/dashboard');
      } else {
        toast({
          title: "Success",
          description: "Join request sent successfully. Waiting for approval.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });
}