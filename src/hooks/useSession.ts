import { useQuery } from '@tanstack/react-query';
import { useSession as useNextAuthSession } from 'next-auth/react';

export function useSession() {
  const { data: authSession, status } = useNextAuthSession();
  
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await fetch('/api/session');
      if (!res.ok) throw new Error('Failed to fetch session');
      return res.json();
    },
    enabled: !!authSession,
    staleTime: 60000, // Consider data fresh for 1 minute
  });

  return {
    session,
    status,
  };
}