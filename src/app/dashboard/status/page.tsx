'use client';

import { useStatus } from "@/hooks/use-status";
import { StatusCard } from "@/components/status/status-card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function StatusPage() {
  const { data: status, isLoading, isError, refetch } = useStatus();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-500">
            Error loading system status
          </h2>
          <Button onClick={() => refetch()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">System Status</h2>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date(status?.timestamp || '').toLocaleString()}
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatusCard
          title="Database"
          status={status?.services.database.status || 'unknown'}
          metrics={status?.services.database.metrics || undefined}
        />
        <StatusCard
          title="Traefik"
          status={status?.services.traefik.status || 'unknown'}
          metrics={status?.services.traefik.metrics || undefined}
        />
      </div>

      
    </div>
  );
} 