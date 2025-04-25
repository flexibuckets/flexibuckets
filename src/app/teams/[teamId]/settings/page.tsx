import { TeamSettings } from '@/components/teams/TeamSettings';
import { auth } from '@/auth';
import { getTeam } from '@/lib/db/teams';
import { redirect } from 'next/navigation';

export default async function TeamSettingsPage({
  params,
}: {
  params: { teamId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');

  const teamData = await getTeam(params.teamId);
  if (!teamData) redirect('/dashboard');

  const ownerMember = teamData.members.find(
    (member) => member.role === 'OWNER'
  );
  if (!ownerMember) redirect('/dashboard');

  const userMemberRole = teamData.members.find(
    (member) => member.userId === session.user.id
  )?.role;

  if (!userMemberRole || userMemberRole === 'MEMBER')
    redirect(`/teams/${teamData.id}`);

  const team = {
    ...teamData,
    memberCount: teamData.members.length,
    role: userMemberRole,
    owner: {
      id: ownerMember.user.id,
      name: ownerMember.user.name,
      email: ownerMember.user.email,
      image: ownerMember.user.image,
      totalUploadSize: ownerMember.user.totalUploadSize || '0',
      totalFileShares: ownerMember.user.totalFileShares || 0,
    },
    description: teamData.description || null,
    joinRequests: [],
    inviteCode: teamData.inviteCode || null,
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

  return <TeamSettings team={team} />;
}
