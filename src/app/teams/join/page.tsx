import { auth } from '@/auth';
import { getTeamByInviteCode } from '@/lib/db/teams';
import { redirect } from 'next/navigation';
import { JoinTeamForm } from '@/components/teams/JoinTeamForm';
import { prisma } from '@/lib/prisma';
import { Team } from '@/types/team';
import { TeamRole } from '@prisma/client';
import AlreadyTeamMember from '@/components/teams/AlreadyTeamMember';

interface JoinPageProps {
  searchParams: { code?: string };
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    redirect('/auth/signin');
  }

  const { code } = searchParams;
  if (!code) {
    redirect('/dashboard');
  }

  const teamData = await getTeamByInviteCode(code, session.user.id);
  if (!teamData) {
    redirect('/dashboard?error=invalid-code');
  }

  // Transform team data to match Team type with all required properties
  const transformedTeam: Team = {
    ...teamData,
    description: teamData.description || null,
    inviteCode: teamData.inviteCode || null,
    joinRequests: [],
    role: teamData.userTeamRole as TeamRole | 'MEMBER',
    owner: {
      ...teamData.owner,
      totalUploadSize: '0',
      totalFileShares: 0,
    },
    members: teamData.members.map((member) => ({
      id: member.id,
      teamId: teamData.id,
      userId: member.userId,
      role: member.role,
      user: {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        image: member.user.image,
      },
    })),
  };

  // Check if user is already a member
  const isMember = transformedTeam.members.some(
    (member) => member.user.id === session.user.id
  );

  if (isMember) {
    return <AlreadyTeamMember teamId={teamData.id} teamName={teamData.name} />;
  }

  // Check for valid invite
  const validInvite = await prisma.teamInvite.findFirst({
    where: {
      teamId: teamData.id,
      email: session.user.email,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <JoinTeamForm
        team={transformedTeam}
        inviteCode={code}
        hasValidInvite={!!validInvite}
      />
    </div>
  );
}
