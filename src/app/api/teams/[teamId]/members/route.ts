import { auth } from '@/auth';
import { addTeamMember, canManageTeam } from '@/lib/db/teams';
import { prisma } from '@/lib/prisma';
import { TeamRole } from '@prisma/client';
import { NextRequest } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { teamId } = params;
  const hasAccess = await canManageTeam(session.user.id, teamId);
  if (!hasAccess) {
    return Response.json(
      { error: 'Not authorized to manage team members' },
      { status: 403 }
    );
  }

  try {
    const { email, role = TeamRole.MEMBER } = await req.json();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const member = await addTeamMember({
      userId: user.id,
      teamId,
      role,
    });

    return Response.json(member);
  } catch (error) {
    console.error('Error adding team member:', error);
    return Response.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    );
  }
}
