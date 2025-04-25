'use server'

import { auth } from "@/auth";
import { 
  removeTeamMember, 
  removeTeamMemberFiles, 
  updateTeamMemberRole 
} from "@/lib/db/teams";
import { revalidatePath } from "next/cache";
import { TeamRole } from "@prisma/client";

export async function removeMember(teamId: string, userId: string, removeFiles: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    await removeTeamMember(teamId, userId);
    
    if (removeFiles) {
      await removeTeamMemberFiles(teamId, userId);
    }
    
    revalidatePath(`/teams/${teamId}/manage`);
  } catch (error) {
    console.error('Error removing team member:', error);
    throw error;
  }
}

export async function updateMemberRole(teamId: string, userId: string, role: TeamRole) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    await updateTeamMemberRole(teamId, userId, role);
    revalidatePath(`/teams/${teamId}/manage`);
  } catch (error) {
    console.error('Error updating member role:', error);
    throw error;
  }
}
