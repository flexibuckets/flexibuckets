import { useQuery } from '@tanstack/react-query';

export function useUpdateCheck() {
  return useQuery({
    queryKey: ['update-check'],
    queryFn: async () => {
      const response = await fetch('/api/update-status');
      if (!response.ok) {
        throw new Error('Failed to check for updates');
      }
      return response.json();
    },
    refetchInterval: 1000 * 60 * 60, // Check every hour
    retry: 3
  });
} 