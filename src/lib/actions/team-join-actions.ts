'use server'

import { auth } from "@/auth";
import { joinTeamWithInviteCode } from "@/lib/db/teams";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function joinTeam(teamId: string, inviteCode: string) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    throw new Error("Unauthorized");
  }

  try {
    // Check for valid invite
    const validInvite = await prisma.teamInvite.findFirst({
      where: {
        teamId,
        email: session.user.email,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    const result = await joinTeamWithInviteCode(teamId, session.user.id, validInvite);
    revalidatePath(`/teams/${teamId}`);
    return { 
      teamId,
      wasInvited: !!validInvite 
    };
  } catch (error) {
    console.error('Error joining team:', error);
    throw error;
  }
}