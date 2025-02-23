'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DomainConfigInput } from '@/lib/traefik/actions';
import * as traefikActions from '@/lib/traefik/actions';
import { useToast } from '@/hooks/use-toast';

export function useConfigureDomain() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (input: DomainConfigInput) => {
      return traefikActions.configureDomain(input);
    },
    onMutate: async (newDomain) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['traefik-domain'] });
      const previousDomain = queryClient.getQueryData(['traefik-domain']);
      queryClient.setQueryData(['traefik-domain'], newDomain.domain);
      return { previousDomain };
    },
    onError: (error, _, context) => {
      // Rollback on error
      queryClient.setQueryData(['traefik-domain'], context?.previousDomain);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traefik-domain'] });
      toast({
        title: 'Success',
        description: 'Domain configured successfully',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['traefik-domain'] });
    }
  });
}

export function useCurrentDomain() {
  return useQuery({
    queryKey: ['traefik-domain'],
    queryFn: traefikActions.getCurrentDomain,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 2
  });
}