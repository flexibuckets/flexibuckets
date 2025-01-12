import { useQuery } from '@tanstack/react-query';

export interface SystemStatus {
  status: string;
  timestamp: string;
  version: string;
  services: {
    database: {
      status: string;
      latency: number;
      metrics: {
        memory: number;
        cpu: number;
      } | null;
    };
    traefik: {
      status: string;
      metrics: {
        memory: number;
        cpu: number;
      } | null;
    };
    app: {
      status: string;
      metrics: {
        memory: {
          total: number;
          used: number;
          free: number;
        };
        uptime: number;
      };
    };
  };
  system: {
    uptime: number;
    memory: {
      total: number;
      used: number;
      free: number;
    };
    disk: {
      total: number;
      used: number;
      free: number;
    };
  };
}

async function fetchStatus(): Promise<SystemStatus> {
  const response = await fetch('/api/health');
  if (!response.ok) {
    throw new Error('Failed to fetch system status');
  }
  return response.json();
}

export function useStatus(options = { enabled: true }) {
  return useQuery({
    queryKey: ['system-status'],
    queryFn: fetchStatus,
    refetchInterval: 30000, // Refetch every 30 seconds
    ...options,
  });
} 