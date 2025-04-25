'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendTeamInviteEmail, sendTeamJoinRequestEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { generateTeamInviteLink, getTeamOwnerEmail } from "../db/teams";
import { Prisma } from "@prisma/client";

export async function inviteToTeam(teamId: string, email: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { 
      members: true,
      teamInvites: {
        where: {
          email,
          used: false,
          expiresAt: { gt: new Date() }
        }
      }
    },
  });

  if (!team) throw new Error("Team not found");

  // Check if team has reached max members
  if (team.members.length >= team.maxMembers) {
    throw new Error("Team has reached maximum member limit. Please upgrade your plan for more seats.");
  }

  // Check if user is already invited
  if (team.teamInvites.length > 0) {
    throw new Error("User has already been invited");
  }

  // Create invite with 7 day expiration
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  try {
    // Generate or get existing invite code
    const inviteCode = await generateTeamInviteLink(teamId);

    const invite = await prisma.teamInvite.create({
      data: {
        email,
        teamId,
        expiresAt,
      },
      include: {
        team: true,
      },
    });

    // Send invite email
    await sendTeamInviteEmail({
      inviteeEmail: email,
      teamName: team.name,
      inviterName: session.user.name || session.user.email || '',
      inviteLink: `${process.env.NEXT_PUBLIC_APP_URL}/teams/join?code=${inviteCode}`,
    });

    revalidatePath(`/teams/${teamId}/manage/`);
    return invite;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error("User has already been invited");
    }
    throw new Error("Failed to send invitation");
  }
}

export async function joinTeamWithCode(inviteCode: string) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const team = await prisma.team.findFirst({
    where: { inviteCode },
    include: {
      members: {
        include: {
          user: true,
        },
      },
      teamInvites: {
        where: {
          email: session.user.email,
          expiresAt: { gt: new Date() }
        }
      },
      joinRequests: {
        where: {
          userId: session.user.id,
        }
      }
    },
  });

  if (!team) throw new Error("Invalid invite code");

  // Find team owner
  const owner = team.members.find(member => member.role === "OWNER");
  if (!owner) throw new Error("Team owner not found");

  // Check if user is already a member
  if (team.members.some(member => member.userId === session.user.id)) {
    throw new Error("You are already a member of this team");
  }

  // Check if user was previously a member
  const previousRequests = team.joinRequests.filter(req => 
    req.status === 'ACCEPTED' || req.status === 'REJECTED'
  );
  
  if (previousRequests.length > 0) {
    throw new Error("You cannot rejoin this team. Please contact the team owner.");
  }

  // Check if team has reached max members
  if (team.members.length >= team.maxMembers) {
    throw new Error("Team has reached maximum member limit");
  }

  const validInvite = team.teamInvites.find(invite => 
    !invite.used && invite.email === session.user.email
  );

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create join request
      const joinRequest = await tx.teamJoinRequest.create({
        data: {
          teamId: team.id,
          userId: session.user.id,
          status: validInvite ? "ACCEPTED" : "PENDING",
        },
        include: {
          team: true,
          user: true,
        },
      });
      
      if (validInvite) {
        // Add user to team immediately if invited and increment owner's count
        await Promise.all([
          tx.teamMember.create({
            data: {
              teamId: team.id,
              userId: session.user.id,
              role: "MEMBER",
            },
          }),
          // Mark invite as used
          tx.teamInvite.update({
            where: { id: validInvite.id },
            data: { used: true },
          }),
          // Increment owner's current team members count
          tx.user.update({
            where: { id: owner.user.id },
            data: {
              currentTeamMembers: {
                increment: 1
              }
            }
          })
        ]);
      } else {
        // Send join request notification to team owner
        const ownerEmail = await getTeamOwnerEmail(team.id);
        await sendTeamJoinRequestEmail({
          ownerEmail,
          requesterName: session.user.name || session.user.email || "",
          teamName: team.name,
          requestLink: `${process.env.NEXT_PUBLIC_APP_URL}/teams/${team.id}/manage/members`,
        });
      }

      return { joinRequest, wasInvited: !!validInvite };
    });

    revalidatePath(`/teams/${team.id}/manage/requests`);
    return result;

  } catch (error) {
    console.error("Error processing join request:", error);
    throw error;
  }
}
