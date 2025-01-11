import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Database, HardDrive, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { Bucket } from "@/lib/types"; // Ensure Bucket type is updated
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";
import { DeleteBucket } from "./delete-bucket";

interface BucketCardProps {
  bucket: Bucket & {
    isAccessible?: boolean;
    errorMessage?: string;
  };
  userId: string;
}

export function BucketCard({ bucket, userId }: BucketCardProps) {
  const usedStorage = parseInt(bucket.size.replace(/[^\d]/g, "")); // Ensure bucket.size is correctly formatted
  const totalStorage = 100000; // Assuming 10GB total storage for this example
  const storagePercentage = (usedStorage / totalStorage) * 100;

  return (
    <div className="bg-card flex flex-col justify-between text-card-foreground rounded-lg border-border border shadow-md dark:shadow-secondary overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-semibold">{bucket.name}</h3>
              {bucket.isAccessible === false && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{bucket.errorMessage || "Bucket is not accessible"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {bucket.endpointUrl || "/"}
            </p>
          </div>
          <DeleteBucket bucketId={bucket.id} bucketName={bucket.name}  userId={userId}/>
        </div>
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center">
            <Database className="w-4 h-4 mr-2 text-muted-foreground" />
            <span className="text-sm">{bucket.filesCount} files</span>
          </div>
          <div className="flex items-center">
            <HardDrive className="w-4 h-4 mr-2 text-muted-foreground" />
            <span className="text-sm">{bucket.size} MB used</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Storage</span>
            <span>{storagePercentage.toFixed(1)}% used</span>
          </div>
          <Progress value={storagePercentage} className="h-2" />
        </div>
      </div>
      <div className="bg-muted p-4">
        {bucket.isAccessible ? (
          <Button asChild className="w-full">
            <Link href={`/dashboard/bucket/${bucket.id}`}>Open Bucket</Link>
          </Button>
        ) : (
          <Button 
            className={cn(
              "w-full cursor-not-allowed",
              "hover:no-underline hover:opacity-50"
            )} 
            disabled
          >
            Open Bucket
          </Button>
        )}
      </div>
    </div>
  );
}

export function BucketCardLoader({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-card text-card-foreground rounded-lg border-border border shadow-md dark:shadow-secondary overflow-hidden mb-4">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />

                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center">
                <Database className="w-4 h-4 mr-2 text-muted-foreground" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-center">
                <HardDrive className="w-4 h-4 mr-2 text-muted-foreground" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Storage</span>
                <Skeleton className="h-4 w-16" />
              </div>
              <Progress value={0} className="h-2" />
            </div>
          </div>
          <div className="bg-muted p-4">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ))}
    </>
  );
}
