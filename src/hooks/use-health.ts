// hooks/use-health.ts
import { useQuery } from '@tanstack/react-query'

interface HealthStatus {
  status: string;
  timestamp: string;
  version: string;
  services: {
    database: {
      status: string;
      latency: number;
    };
  };
  system: {
    uptime: number;
    memory: {
      total: number;
      used: number;
      free: number;
    };
  };
}

async function fetchHealth(): Promise<HealthStatus> {
  const response = await fetch('/api/health');
  if (!response.ok) {
    throw new Error('Health check failed');
  }
  return response.json();
}

export function useHealth(options = { enabled: true }) {
  return useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 30000, // Refetch every 30 seconds
    ...options,
  });
}