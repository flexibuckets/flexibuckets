import { auth } from "@/auth";
import { canManageTeam, removeTeamMember } from "@/lib/db/teams";
import { prisma } from "@/lib/prisma";
import { TeamRole } from "@prisma/client";
import { NextRequest } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: { teamId: string; userId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId, userId } = params;
  const hasAccess = await canManageTeam(session.user.id, teamId);
  if (!hasAccess) {
    return Response.json(
      { error: "Not authorized to manage team members" },
      { status: 403 }
    );
  }

  try {
    const { role } = await req.json();
    
    if (!Object.values(TeamRole).includes(role)) {
      return Response.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    const updatedMember = await prisma.teamMember.update({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return Response.json(updatedMember);
  } catch (error) {
    console.error("Error updating member role:", error);
    return Response.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { teamId: string; userId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId, userId } = params;
  const hasAccess = await canManageTeam(session.user.id, teamId);
  if (!hasAccess) {
    return Response.json(
      { error: "Not authorized to manage team members" },
      { status: 403 }
    );
  }

  try {
    await removeTeamMember(teamId, userId);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error removing team member:", error);
    return Response.json(
      { error: "Failed to remove team member" },
      { status: 500 }
    );
  }
} 