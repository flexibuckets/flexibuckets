import { auth } from '@/auth';
import { createTeam, getUserTeams } from '@/lib/db/teams';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name } = await req.json();

    if (!name || typeof name !== 'string') {
      return Response.json({ error: 'Name is required' }, { status: 400 });
    }

    const team = await createTeam({
      name,
      ownerId: session.user.id,
    });

    if (!team) {
      return Response.json(
        { error: 'You have reached the maximum number of teams allowed' },
        { status: 403 }
      );
    }

    return Response.json(team);
  } catch (error: any) {
    console.error('Error creating team:', error);
    return Response.json(
      { error: error.message || 'Failed to create team' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const teams = await getUserTeams(session.user.id);
    return Response.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return Response.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}
