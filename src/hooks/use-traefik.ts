'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DomainConfigInput } from '@/lib/traefik/actions';
import * as traefikActions from '@/lib/traefik/actions';
import { toast } from '@/hooks/use-toast';

export function useConfigureDomain() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: DomainConfigInput) => {
      return traefikActions.configureDomain(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traefik-domain'] });
      toast({
        title: 'Success',
        description: 'Domain configured successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCurrentDomain() {
  return useQuery({
    queryKey: ['traefik-domain'],
    queryFn: traefikActions.getCurrentDomain,
  });
}