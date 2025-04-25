'use server';

import { auth } from '@/auth';
import { handleTeamJoinRequest, verifyTeamPermissions } from '@/lib/db/teams';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { TeamRole } from '@prisma/client';

export async function fetchTeamJoinRequests(teamId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized: Please sign in');
  }

  try {
    // Verify user has permission to view requests
    await verifyTeamPermissions(session.user.id, teamId, [
      TeamRole.OWNER,
      TeamRole.ADMIN,
    ]);

    const requests = await prisma.teamJoinRequest.findMany({
      where: {
        teamId: teamId,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return requests;
  } catch (error) {
    console.error('Error fetching join requests:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to fetch join requests'
    );
  }
}

export async function handleJoinRequest({
  teamId,
  requestId,
  action,
}: {
  teamId: string;
  requestId: string;
  action: 'accept' | 'reject';
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized: Please sign in');
  }

  try {
    // Verify user has permission to handle requests
    await verifyTeamPermissions(session.user.id, teamId, [
      TeamRole.OWNER,
      TeamRole.ADMIN,
    ]);

    // Get the request to verify it exists and belongs to the team
    const request = await prisma.teamJoinRequest.findFirst({
      where: {
        id: requestId,
        teamId: teamId,
        status: 'PENDING',
      },
    });

    if (!request) {
      throw new Error('Join request not found or already processed');
    }

    // Handle the join request
    await handleTeamJoinRequest(
      requestId,
      action === 'accept' ? 'ACCEPTED' : 'REJECTED',
      session.user.id
    );

    revalidatePath(`/teams/${teamId}/manage`);
    return { success: true };
  } catch (error) {
    console.error('Error handling join request:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to handle join request'
    );
  }
}

export async function updateTeamMemberRole(
  teamId: string,
  memberId: string,
  newRole: TeamRole
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized: Please sign in');
  }

  try {
    // Only owner can update roles
    await verifyTeamPermissions(session.user.id, teamId, [TeamRole.OWNER]);

    // Get the target member to verify they exist and aren't the owner
    const targetMember = await prisma.teamMember.findFirst({
      where: {
        userId: memberId,
        teamId: teamId,
      },
    });

    if (!targetMember) {
      throw new Error('Member not found');
    }

    if (targetMember.role === TeamRole.OWNER) {
      throw new Error("Cannot modify owner's role");
    }

    await prisma.teamMember.update({
      where: {
        userId_teamId: {
          userId: memberId,
          teamId: teamId,
        },
      },
      data: {
        role: newRole,
      },
    });

    revalidatePath(`/teams/${teamId}/manage`);
    return { success: true };
  } catch (error) {
    console.error('Error updating member role:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to update member role'
    );
  }
}
