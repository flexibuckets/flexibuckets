"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { useTeamJoin } from "@/hooks/use-team-join";
import { Team } from "@/types/team";
import { UserAvatar } from "@/components/UserAvatar";
import { Loader2 } from "lucide-react";

interface JoinTeamFormProps {
  team: Team;
  inviteCode: string;
  hasValidInvite: boolean;
}

export function JoinTeamForm({
  team,
  inviteCode,
  hasValidInvite,
}: JoinTeamFormProps) {
  const { joinTeam, isLoading } = useTeamJoin();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join Team</CardTitle>
        <CardDescription>
          {hasValidInvite
            ? `You've been invited to join ${team.name}`
            : `Request to join ${team.name}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Team Information</h3>
          <div className="space-y-1">
            <p className="text-sm font-medium">Name</p>
            <p className="text-sm text-muted-foreground">{team.name}</p>
          </div>
          {team.description && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Description</p>
              <p className="text-sm text-muted-foreground">
                {team.description}
              </p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-sm font-medium">Team Owner</p>
            <div className="flex items-center space-x-2">
              <UserAvatar
                user={{
                  name: team.owner.name || "",
                  image: team.owner.image || "",
                }}
                className="h-8 w-8"
              />
              <p className="text-sm text-muted-foreground">
                {team.owner.name || team.owner.email}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Members</p>
            <p className="text-sm text-muted-foreground">
              {team.members.length} member{team.members.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/dashboard")}
            disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={() => joinTeam({ teamId: team.id, inviteCode })}
            disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {hasValidInvite ? "Join Team" : "Request to Join"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
