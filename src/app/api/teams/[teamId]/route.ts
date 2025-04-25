import { auth } from "@/auth";
import { canManageTeam } from "@/lib/db/teams";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = params;
  const hasAccess = await canManageTeam(session.user.id, teamId);
  if (!hasAccess) {
    return Response.json(
      { error: "Not authorized to manage this team" },
      { status: 403 }
    );
  }

  try {
    const { name } = await req.json();

    if (!name || typeof name !== "string") {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: { name },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return Response.json(updatedTeam);
  } catch (error) {
    console.error("Error updating team:", error);
    return Response.json({ error: "Failed to update team" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = params;
  const hasAccess = await canManageTeam(session.user.id, teamId);
  if (!hasAccess) {
    return Response.json(
      { error: "Not authorized to manage this team" },
      { status: 403 }
    );
  }

  try {
    await prisma.team.delete({
      where: { id: teamId },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting team:", error);
    return Response.json({ error: "Failed to delete team" }, { status: 500 });
  }
}
