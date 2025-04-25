import { auth } from '@/auth';
import { getTeamWithMembers, verifyTeamAccess } from '@/lib/db/teams';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { LeaveTeamButton } from '@/components/teams/LeaveTeamButton';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldAlert } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';

export default async function TeamPage({
  params,
}: {
  params: { teamId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');

  const hasAccess = verifyTeamAccess(session.user.id, params.teamId);
  if (!hasAccess) {
    redirect('/dashboard');
  }
  const team = await getTeamWithMembers(params.teamId);
  if (!team) redirect('/dashboard');

  // Find current user's role
  const currentMember = team.members.find(
    (member) => member.userId === session.user.id
  );
  if (!currentMember) redirect('/dashboard');

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{team.name}</h1>
          <p className="text-muted-foreground">
            {team.members.length} member{team.members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <LeaveTeamButton teamId={team.id} userRole={currentMember.role} />
      </div>

      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Team Members</h2>
        </div>
        <div className="divide-y">
          {team.members
            .sort((a, b) => {
              // Sort by role (OWNER first, then ADMIN, then MEMBER)
              const roleOrder = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
              return (
                roleOrder[a.role] - roleOrder[b.role] ||
                a.user.name?.localeCompare(b.user.name || '') ||
                0
              );
            })
            .map((member) => (
              <div
                key={member.id}
                className={`flex items-center justify-between p-4 ${
                  member.id === currentMember.id &&
                  'bg-secondary text-secondary-foreground'
                }`}
              >
                <div className="flex items-center gap-4">
                  <UserAvatar
                    user={{
                      name: member.user.name || null,
                      image: member.user.image || null,
                    }}
                  />
                  <div className="space-y-0.5">
                    <div className="font-medium flex items-center gap-2">
                      {member.id === currentMember.id
                        ? 'You'
                        : member.user.name || member.user.email}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Joined {format(new Date(member.joinedAt), 'PPP')}
                    </div>
                  </div>
                </div>
                <Badge
                  variant={
                    member.role === 'OWNER'
                      ? 'success'
                      : member.role === 'ADMIN'
                      ? 'default'
                      : 'secondary'
                  }
                  className="ml-2"
                >
                  {member.role === 'OWNER' && (
                    <ShieldAlert className="h-3 w-3 mr-1" />
                  )}
                  {member.role === 'ADMIN' && (
                    <Shield className="h-3 w-3 mr-1" />
                  )}
                  {member.role}
                </Badge>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
