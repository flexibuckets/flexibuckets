import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export function TeamMemberManagement({ teamId }: { teamId: string }) {
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const { data: teamMembers, refetch } = useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${teamId}/members`);
      if (!response.ok) throw new Error('Failed to fetch team members');
      return response.json();
    },
  });

  const { mutate: inviteMember, isPending: isInviting } = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error('Failed to invite member');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Team member invited successfully',
      });
      setEmail('');
      refetch();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to invite team member',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Team Members</h2>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="member@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          onClick={() => inviteMember(email)}
          disabled={isInviting || !email}
        >
          Invite
        </Button>
      </div>

      <div className="space-y-2">
        {teamMembers?.map((member: any) => (
          <div
            key={member.email}
            className="flex justify-between items-center p-2 border rounded"
          >
            <span>{member.email}</span>
            <span className="text-sm text-muted-foreground">{member.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
