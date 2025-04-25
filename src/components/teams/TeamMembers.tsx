"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, X } from "lucide-react";
import { TeamRole } from "@prisma/client";

import { TeamMemberWithUser } from "@/types/team";
import { UserAvatar } from "../UserAvatar";
import { useToast } from "@/hooks/use-toast";
import { removeTeamMember, updateTeamMemberRole } from "@/app/actions";

interface TeamMembersProps {
  teamId: string;
  members: TeamMemberWithUser[];
  currentUserId: string;
  currentUserRole: TeamRole;
}

export function TeamMembers({
  teamId,
  members,
  currentUserId,
  currentUserRole,
}: TeamMembersProps) {
  const { toast } = useToast();
  const [loadingIds, setLoadingIds] = useState<string[]>([]);

  const addLoadingIds = (memberId: string) => {
    setLoadingIds((prev) => [...prev, memberId]);
  };

  const removeLoadingIds = (memberId: string) => {
    setLoadingIds((prev) => prev.filter((id) => id !== memberId));
  };

  const updateRole = async (memberId: string, newRole: TeamRole) => {
    addLoadingIds(memberId);
    // Only owner can modify roles
    if (currentUserRole !== "OWNER") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Only the team owner can modify roles",
      });
      return;
    }

    const memberToUpdate = members.find((m) => m.userId === memberId);

    // Prevent modifying the owner's role
    if (memberToUpdate?.role === "OWNER") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "The team owner's role cannot be modified",
      });
      return;
    }

    try {
      await updateTeamMemberRole(teamId, memberId, newRole);
      toast({
        title: "Success",
        variant: "success",
        description: "Member role updated successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update member role",
      });
    } finally {
      removeLoadingIds(memberId);
    }
  };

  const removeMember = async (memberId: string) => {
    addLoadingIds(memberId);
    const memberToRemove = members.find((m) => m.userId === memberId);

    // Prevent removing if not owner
    if (currentUserRole !== "OWNER" && memberToRemove?.role === "ADMIN") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Only the team owner can remove admins",
      });
      return;
    }

    // Prevent removing the owner
    if (memberToRemove?.role === "OWNER") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "The team owner cannot be removed",
      });
      return;
    }

    try {
      await removeTeamMember(teamId, memberId);
      toast({
        title: "Success",
        variant: "success",
        description: "Member removed successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove member",
      });
    } finally {
      removeLoadingIds(memberId);
    }
  };

  const renderRoleControl = (member: TeamMemberWithUser, loading: boolean) => {
    if (currentUserRole === "OWNER" && member.role !== "OWNER") {
      return (
        <Select
          disabled={loading}
          defaultValue={member.role}
          onValueChange={(value: TeamRole) => updateRole(member.userId, value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MEMBER">Member</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    return (
      <span className="text-sm text-muted-foreground px-3 py-2">
        {member.role}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
        <CardDescription>
          Manage your team members and their roles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members.map((member) => {
            const loading = loadingIds.includes(member.userId);

            return (
              <div
                key={member.userId}
                className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-2">
                  <UserAvatar
                    user={{
                      name: member.user.name || null,
                      image: member.user.image || null,
                    }}
                  />
                  <div>
                    <p className="font-medium">{member.user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {renderRoleControl(member, loading)}
                  {member.userId !== currentUserId &&
                    (currentUserRole === "OWNER" ||
                      (currentUserRole === "ADMIN" &&
                        member.role === "MEMBER")) && (
                      <Button
                        disabled={loading}
                        variant="ghost"
                        size="icon"
                        onClick={
                          loading
                            ? undefined
                            : () => removeMember(member.userId)
                        }>
                        {loading ? (
                          <Loader2 className="h-w w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
