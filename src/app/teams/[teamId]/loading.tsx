import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

const loading = () => {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <div className="w-full">
          <Skeleton className="h-8 w-1/2" /> {/* Team name */}
          <Skeleton className="h-4 w-1/4 mt-1" /> {/* Members count */}
        </div>
        <Skeleton className="h-8 w-28" /> {/* Leave Team Button */}
      </div>

      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <Skeleton className="h-6 w-1/3" /> {/* Team Members title */}
        </div>
        <div className="divide-y">
          {/* Skeleton for each team member */}
          {[...Array(3)].map((_, index) => (
            <div key={index} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />{" "}
                {/* User avatar */}
                <div className="space-y-0.5">
                  <Skeleton className="h-4 w-24" /> {/* Member name */}
                  <Skeleton className="h-3 w-32" /> {/* Joined date */}
                </div>
              </div>
              <Skeleton className="h-5 w-16" /> {/* Role badge */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default loading;
