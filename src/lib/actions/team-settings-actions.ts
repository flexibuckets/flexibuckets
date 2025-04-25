'use server'

import { auth } from "@/auth";
import { updateTeamSettings, deleteTeam, verifyTeamPermissions } from "@/lib/db/teams";
import { revalidatePath } from "next/cache";
import { nanoid } from 'nanoid';
import { TeamRole } from "@prisma/client";

interface TeamUpdateData {
  name?: string;
  description?: string;
  maxMembers?: number;
}

export async function updateTeam(teamId: string, data: TeamUpdateData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Please sign in");
  }

  try {
    // Verify user is team owner
    await verifyTeamPermissions(session.user.id, teamId, [TeamRole.OWNER]);

    // Update team settings
    await updateTeamSettings(teamId, session.user.id, data);
    
    revalidatePath(`/teams/${teamId}`);
    revalidatePath(`/teams/${teamId}/manage`);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating team settings:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update team settings');
  }
}

export async function regenerateInviteCode(teamId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Please sign in");
  }

  try {
    // Verify user is team owner
    await verifyTeamPermissions(session.user.id, teamId, [TeamRole.OWNER]);

    const newCode = nanoid(8);
    await updateTeamSettings(teamId, session.user.id, { inviteCode: newCode });
    
    revalidatePath(`/teams/${teamId}`);
    revalidatePath(`/teams/${teamId}/manage`);
    
    return newCode;
  } catch (error) {
    console.error('Error regenerating invite code:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to regenerate invite code');
  }
}

export async function deleteTeamAction(teamId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Please sign in");
  }

  try {
    // Verify user is team owner
    await verifyTeamPermissions(session.user.id, teamId, [TeamRole.OWNER]);

    // Delete the team
    await deleteTeam(teamId, session.user.id);
    
    revalidatePath('/teams');
    revalidatePath('/dashboard');
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting team:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to delete team');
  }
}