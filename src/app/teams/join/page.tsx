'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { joinTeam } from '@/lib/actions/team-join-actions';
import { toast } from 'sonner';
import { useSearchParamsWithSuspense } from '@/hooks/use-searchparams';

const JoinTeamForm = ({ code }: { code: string }) => {
  const { data: session } = useSession();
  const router = useRouter();

  const handleJoinTeam = async () => {
    if (!session?.user?.id) {
      toast.error('You must be logged in to join a team');
      return;
    }

    try {
      const result = await joinTeam(code, code);
      
      if (result.teamId) {
        toast.success('Successfully joined the team!');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error joining team:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to join team. Please try again.');
      }
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Join Team</CardTitle>
          <CardDescription>
            You have been invited to join a team. Click the button below to accept the invitation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleJoinTeam} className="w-full">
            Join Team
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const JoinTeamContent = () => {
  const { getParam } = useSearchParamsWithSuspense();
  const router = useRouter();
  const code = getParam('code');

  if (!code) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <JoinTeamForm code={code} />;
};

export default function JoinTeamPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JoinTeamContent />
    </Suspense>
  );
}
