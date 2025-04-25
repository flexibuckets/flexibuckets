import { TeamBucket } from "@/types/team";
import { Button } from "../ui/button";
import { Database, MoreHorizontal, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { BucketPermission } from "@prisma/client";
import { useState } from "react";
import { TeamAddBucketModal } from "@/components/teams/TeamAddBucketModal"

interface TeamBucketsProps {
  buckets: TeamBucket[];
  isAdmin: boolean;
  teamId: string;
}

export function TeamBuckets({ buckets, isAdmin, teamId }: TeamBucketsProps) {
  const { toast } = useToast();
  const [showAddBucketModal, setShowAddBucketModal] = useState(false);

  const handlePermissionChange = async (bucketId: string, newPermission: BucketPermission) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/buckets/${bucketId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: newPermission }),
      });

      if (!response.ok) throw new Error("Failed to update permissions");

      toast({
        title: "Permissions updated",
        description: "Bucket permissions have been updated successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update bucket permissions.",
      });
    }
  };

  const handleRemoveBucket = async (bucketId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/buckets/${bucketId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove bucket");

      toast({
        title: "Bucket removed",
        description: "Bucket has been removed from the team successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:  error instanceof Error ? error.message : "Failed to remove bucket from team.",
      });
    }
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Button onClick={() => setShowAddBucketModal(true)} className="w-full">
          <Database className="mr-2 h-4 w-4" />
          Add Bucket
        </Button>
      )}

      {buckets.map((bucket) => (
        <div
          key={bucket.id}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50"
        >
          <div className="flex items-center space-x-4">
            <Database className="h-4 w-4" />
            <div>
              <p className="font-medium">{bucket.name}</p>
              <p className="text-sm text-muted-foreground">
                {bucket.s3Credential.provider} · {bucket.s3Credential.bucket}
              </p>
            </div>
            {bucket.permissions === BucketPermission.READ_ONLY && (
              <Shield className="h-4 w-4 text-yellow-500" />
            )}
          </div>

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handlePermissionChange(
                    bucket.id,
                    bucket.permissions === BucketPermission.READ_ONLY
                      ? BucketPermission.READ_WRITE
                      : BucketPermission.READ_ONLY
                  )}
                >
                  {bucket.permissions === BucketPermission.READ_ONLY
                    ? "Allow Write Access"
                    : "Make Read Only"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleRemoveBucket(bucket.id)}
                >
                  Remove Bucket
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ))}

      <TeamAddBucketModal
        isOpen={showAddBucketModal}
        onClose={() => setShowAddBucketModal(false)}
        teamId={teamId}
      />
    </div>
  );
} 