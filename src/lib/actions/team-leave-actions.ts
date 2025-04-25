'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { TeamRole } from '@prisma/client';
import { removeTeamMemberFiles } from '@/lib/db/teams';
import { revalidatePath } from 'next/cache';

export async function leaveTeam(teamId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    // Get the user's role in the team
    const member = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: session.user.id,
      },
      include: {
        team: true,
      },
    });

    if (!member) {
      throw new Error('You are not a member of this team');
    }

    // Prevent team owner from leaving
    if (member.role === TeamRole.OWNER) {
      throw new Error('Team owner cannot leave the team');
    }

    // Start a transaction to handle member removal and file cleanup
    await prisma.$transaction(async (tx) => {
      // Remove team member
      await tx.teamMember.delete({
        where: {
          userId_teamId: {
            userId: session.user.id!,
            teamId,
          },
        },
      });

      // Update team's current member count
      await tx.team.update({
        where: { id: teamId },
        data: {
          currentMembers: {
            decrement: 1,
          },
        },
      });
    });

    // Remove member's files
    await removeTeamMemberFiles(teamId, session.user.id);

    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Error leaving team:', error);
    throw error;
  }
}
