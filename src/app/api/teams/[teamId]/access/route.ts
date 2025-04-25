import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { teamId: string } }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ hasAccess: false, reason: 'unauthorized' });
  }

  try {
    const { teamId } = params;
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: {
            OR: [{ role: 'OWNER' }, { userId: session.user.id }],
          },
          include: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      return Response.json({ hasAccess: false, reason: 'team_not_found' });
    }

    const ownerMember = team.members.find((m) => m.role === 'OWNER');

    if (!ownerMember) {
      return Response.json({
        hasAccess: false,
        reason: 'owner_not_found',
        isOwner: false,
        isMember: false,
      });
    }

    const currentUserMember = team.members.find(
      (m) => m.userId === session.user.id
    );

    if (!currentUserMember) {
      return Response.json({
        hasAccess: false,
        reason: 'not_a_member',
        isOwner: false,
        isMember: false,
      });
    }

    return Response.json({
      hasAccess: true,
      isOwner: currentUserMember?.role === 'OWNER',
      isMember: !!currentUserMember,
    });
  } catch (error) {
    console.error('Error checking team access:', error);
    return Response.json(
      { hasAccess: false, reason: 'server_error' },
      { status: 500 }
    );
  }
}
