"use client";

import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";

import { BucketCard, BucketCardLoader } from "./bucket-card";

import BucketForm from "./BucketForm";

import DashboardError from "../dashboard/DasboardError";
import { useBuckets } from "@/hooks/use-buckets";

export function BucketDashboard({ userId }: { userId: string }) {
  const { buckets, isLoading, isError } = useBuckets(userId);

  if (isError) {
    return <DashboardError errorMessage="Error loading buckets" />;
  }

  return (
    <div className="p-6 bg-background text-foreground">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Buckets</h1>
        {isLoading ? (
          <Button disabled>
            <Loader2 className="animate-spin h-4 w-4 mr-2" /> Please Wait...
          </Button>
        ) : (
          <BucketForm userId={userId} />
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <BucketCardLoader count={3} />
        ) : buckets && buckets.length > 0 ? (
          buckets.map((bucket) => (
            <BucketCard
              key={bucket.id}
              bucket={{ ...bucket, size: bucket.size.toString() }}
              userId={userId}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-10 md:col-span-2 lg:col-span-3">
            <div className="flex">
              <X className="h-8 w-8 mr-2" />
              <h2 className="text-2xl font-semibold mb-4">No Buckets Found</h2>
            </div>
            <p className="text-muted-foreground mb-6 text-center">
              You haven&apos;t created any buckets yet. Click the button below to create your first bucket.
            </p>
            <BucketForm userId={userId} />
          </div>
        )}
      </div>
    </div>
  );
}
