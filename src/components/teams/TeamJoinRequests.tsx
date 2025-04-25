"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, Loader2, X } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { TeamJoinRequest, User } from "@prisma/client";
import { useTeamJoinRequests } from "@/hooks/use-team-join-requests";
import { Skeleton } from "../ui/skeleton";

interface JoinRequestWithUser extends TeamJoinRequest {
  user: Pick<User, "id" | "name" | "email" | "image">;
}

interface TeamJoinRequestsProps {
  teamId: string;
}

export default function TeamJoinRequests({ teamId }: TeamJoinRequestsProps) {
  const {
    requests,
    joinRequestsLoading,
    joinRequestsError,
    handleAccept,
    handleReject,
    isHandlingRequest,
  } = useTeamJoinRequests(teamId);

  const getCardContent = () => {
    if (joinRequestsLoading) {
      return <JoinRequestLoader count={3} />;
    }

    if (joinRequestsError) {
      return (
        <div className="w-full h-full flex flex-col gap-y-2 justify-center items-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div className="flex items-center">Error Loading Join Requests.</div>
          <div className="text-sm text-gray-500">
            Please try again later or contact support if the issue persists.
          </div>
        </div>
      );
    }
    return (
      <ScrollArea className="h-[300px] pr-4">
        {requests?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests</p>
        ) : (
          <div className="space-y-4">
            {requests?.map((request: JoinRequestWithUser) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-2 border rounded-lg">
                <div>
                  <p className="font-medium">
                    {request.user?.name || request.userId}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Requested {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isHandlingRequest ? (
                    <Button size="sm" variant="outline" disabled>
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAccept(request.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(request.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    );
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Join Requests</CardTitle>
        <CardDescription>Manage team join requests</CardDescription>
      </CardHeader>
      <CardContent>{getCardContent()}</CardContent>
    </Card>
  );
}

const JoinRequestLoader = ({ count = 1 }: { count?: number }) => {
  return (
    <div className="space-y-4 pr-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-2 border rounded-lg">
          <div className="space-y-2">
            <Skeleton className="w-32 h-6" />
            <Skeleton className="w-24 h-4" />
          </div>
          <div className="flex gap-x-2">
            <Skeleton className="h-9 w-10" />
            <Skeleton className="h-9 w-10" />
          </div>
        </div>
      ))}
    </div>
  );
};
