'use client';

import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useSearchParamsWithSuspense } from '@/hooks/use-searchparams';
import { useWorkspaceStore } from '@/hooks/use-workspace-context';
import { toast } from '@/hooks/use-toast';

interface TeamsContextType {
  isLoading: boolean;
}

const TeamsContext = createContext<TeamsContextType | undefined>(undefined);

export function TeamsProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { getParam } = useSearchParamsWithSuspense();
  const router = useRouter();
  const searchParamTeamId = getParam('teamId');

  const { data: queryTeams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await fetch('/api/teams');
      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();

      // Transform the data to restructure team members into team objects
      return data
        .map((memberRecord: any) => ({
          ...memberRecord.team,
          role: memberRecord.role,
          members: [
            {
              id: memberRecord.id,
              userId: memberRecord.userId,
              teamId: memberRecord.team.id,
              role: memberRecord.role,
              user: memberRecord.user,
            },
          ],
        }))
        .reduce((acc: any[], current: any) => {
          // Check if we already have this team in our accumulator
          const existingTeam = acc.find((team) => team.id === current.id);
          if (existingTeam) {
            // If team exists, add the member to its members array
            existingTeam.members.push(current.members[0]);
            return acc;
          }
          // If team doesn't exist, add it to accumulator
          return [...acc, current];
        }, []);
    },
    enabled: !!session?.user?.id,
  });

  const { teams, setTeams, setSelectedTeam, selectTeamById } =
    useWorkspaceStore();

  useEffect(() => {
    if (queryTeams.length > 0) {
      setTeams(queryTeams);
    }
  }, [queryTeams, setTeams]);

  // Add new function to check team access
  const checkTeamAccess = async (teamId: string) => {
    const response = await fetch(`/api/teams/${teamId}/access`);
    if (!response.ok) return { hasAccess: false };
    return response.json();
  };

  // Modify team selection logic
  const handleTeamSelection = async (teamId: string | null) => {
    if (!teamId) {
      setSelectedTeam(null);
      return true;
    }

    const access = await checkTeamAccess(teamId);
    if (!access.hasAccess) {
      toast({
        title: 'Access Denied',
        description:
          access.reason === 'subscription_required'
            ? 'Teams subscription required to access this team'
            : "You don't have access to this team",
        variant: 'destructive',
      });
      return false;
    }

    const team = teams.find((t) => t.id === teamId);
    if (team) {
      setSelectedTeam(team);
      return true;
    }
    return false;
  };

  // Update useEffect for handling team selection
  useEffect(() => {
    if (isLoading || teams.length === 0) return;

    if (searchParamTeamId) {
      handleTeamSelection(
        searchParamTeamId === 'null' ? null : searchParamTeamId
      ).then((success) => {
        if (success) {
          router.replace(pathname);
        } else {
          router.replace('/dashboard');
        }
      });
      return;
    }

    if (pathname.includes('/teams/')) {
      const teamId = pathname.split('/')[2];
      handleTeamSelection(teamId).then((success) => {
        if (!success) {
          router.replace('/dashboard');
        }
      });
    }
  }, [teams, pathname, isLoading, searchParamTeamId]);

  return (
    <TeamsContext.Provider value={{ isLoading }}>
      {children}
    </TeamsContext.Provider>
  );
}

export function useTeams() {
  const context = useContext(TeamsContext);
  if (context === undefined) {
    throw new Error('useTeams must be used within a TeamsProvider');
  }
  return context;
}
