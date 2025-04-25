"use client";
import { Team } from "@/types/team";
import { Button } from "../ui/button";
import { Users } from "lucide-react";
import { useState } from "react";
import { TeamInviteModal } from "./TeamInviteModal";


interface TeamManageProps {
  team: Team;
  isAdmin: boolean;
  children: React.ReactNode;
}

export function TeamManage({ team, isAdmin, children }: TeamManageProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);

  return (
    <>
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">{team.name}</h1>
              <p className="text-muted-foreground">
                {team.members.length} members
              </p>
            </div>
            {isAdmin && (
              <Button onClick={() => setShowInviteModal(true)}>
                <Users className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            )}
          </div>
          {children}
        </div>
      </div>

      <TeamInviteModal
        inviteCode={team.inviteCode || ''}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        teamId={team.id}
      />
    </>
  );
}
