'use client';

import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';

import { BucketCard, BucketCardLoader } from './bucket-card';

import BucketForm from './BucketForm';

import DashboardError from '../dashboard/DasboardError';
import { useWorkspaceStore } from '@/hooks/use-workspace-context';
import { useBuckets } from '@/hooks/use-buckets';

export function BucketDashboard({ userId }: { userId: string }) {
  const { selectedTeam } = useWorkspaceStore();
  const teamId = selectedTeam ? selectedTeam.id : null;
  const canCreateBucket = selectedTeam ? selectedTeam.role !== 'MEMBER' : true;

  const { buckets, isBucketsLoading, isBucketsError } = useBuckets({ userId });

  if (isBucketsError) {
    return <DashboardError errorMessage="Error loading buckets" />;
  }

  return (
    <div className="p-6 bg-background text-foreground">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {teamId ? `Team ${selectedTeam?.name}` : 'My'} Buckets
        </h1>
        {isBucketsLoading ? (
          <Button disabled>
            <Loader2 className="animate-spin h-4 w-4 mr-2" /> Please Wait...
          </Button>
        ) : (
          <>{canCreateBucket ? <BucketForm userId={userId} /> : null}</>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isBucketsLoading ? (
          <BucketCardLoader count={3} />
        ) : buckets && buckets.length > 0 ? (
          buckets.map((bucket) => (
            <BucketCard
              key={bucket.id}
              userId={userId}
              canDeleteBucket={canCreateBucket}
              bucket={{ ...bucket, size: bucket.size.toString() }}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-10 md:col-span-2 lg:col-span-3">
            <div className="flex">
              <X className="h-8 w-8 mr-2" />
              <h2 className="text-2xl font-semibold mb-4">No Buckets Found</h2>
            </div>
            {canCreateBucket ? (
              <>
                <p className="text-muted-foreground mb-6 text-center">
                  You haven&apos;t created any buckets yet. Click the button
                  below to create your first bucket.
                </p>
                <BucketForm userId={userId} />
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
