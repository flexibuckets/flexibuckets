import { TeamMembers } from '@/components/teams/TeamMembers';
import { auth } from '@/auth';
import { getTeam } from '@/lib/db/teams';
import { redirect } from 'next/navigation';
import TeamJoinRequests from '@/components/teams/TeamJoinRequests';
import { Team } from '@/types/team';
import { TeamManage } from '@/components/teams/TeamManage';

export default async function TeamManagePage({
  params,
}: {
  params: { teamId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');

  const teamData = await getTeam(params.teamId);
  if (!teamData) redirect('/teams');

  const ownerMember = teamData.members.find(
    (member) => member.role === 'OWNER'
  );
  if (!ownerMember) redirect('/dashboard'); // Handle case where team has no owner

  const userTeamRole =
    teamData.members.find((member) => member.userId === session.user.id)
      ?.role ?? 'MEMBER';

  const team: Team = {
    ...teamData,
    memberCount: teamData.members.length,
    role: userTeamRole,
    owner: {
      id: ownerMember.user.id,
      name: ownerMember.user.name,
      email: ownerMember.user.email,
      image: ownerMember.user.image,
      totalUploadSize: ownerMember.user.totalUploadSize || '0',
      totalFileShares: ownerMember.user.totalFileShares || 0,
    },
    members: teamData.members.map((member) => ({
      id: member.id, // TeamMember record ID
      teamId: teamData.id, // Team ID
      userId: member.userId, // User ID
      role: member.role,
      user: {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        image: member.user.image,
      },
    })),
    description: teamData.description || null,
    joinRequests: [],
    inviteCode: teamData.inviteCode || null,
  };
  const isAdmin = !(userTeamRole === 'MEMBER');
  if (!isAdmin) redirect(`/teams/${params.teamId}`);

  return (
    <TeamManage team={team} isAdmin={isAdmin}>
      <div className="space-y-6">
        <TeamMembers
          teamId={team.id}
          members={team.members}
          currentUserId={session.user.id}
          currentUserRole={userTeamRole}
        />

        <TeamJoinRequests teamId={params.teamId} />
      </div>
    </TeamManage>
  );
}
