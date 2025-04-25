"use client";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import {
  fetchTeamJoinRequests,
  handleJoinRequest,
} from "@/lib/actions/team-actions";
import { TeamJoinRequest } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
interface JoinRequestWithUser extends TeamJoinRequest {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export function useTeamJoinRequests(teamId: string) {
  const queryClient = useQueryClient();
  const {
    data: joinRequests,
    isLoading: joinRequestsLoading,
    isError: joinRequestsError,
  } = useQuery({
    queryFn: () => fetchTeamJoinRequests(teamId),
    queryKey: [`${teamId}-join-requests`],
  });

  const { mutate: handleRequest, isPending: isHandlingRequest } = useMutation({
    mutationFn: handleJoinRequest,
    onSuccess: (_, { action }) => {
      toast({
        title: "Success",
        description: `Request ${
          action === "accept" ? "accepted" : "rejected"
        } successfully`,
      });
      queryClient.invalidateQueries({ queryKey: [`${teamId}-join-requests`] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (error, { action }) => {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : `Failed to ${action} request`,
        variant: "destructive",
      });
    },
  });

  return {
    requests: joinRequests,
    joinRequestsLoading,
    joinRequestsError,
    handleAccept: (requestId: string) =>
      handleRequest({ teamId, requestId, action: "accept" }),
    handleReject: (requestId: string) =>
      handleRequest({ teamId, requestId, action: "reject" }),
    isHandlingRequest,
  };
}
