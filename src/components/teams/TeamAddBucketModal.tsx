import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { BucketPermission } from "@prisma/client";
import { useBuckets } from "@/hooks/use-buckets"; 

interface TeamAddBucketModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
}
import { useSession } from "next-auth/react";

export function TeamAddBucketModal({
  isOpen,
  onClose,
  teamId,
}: TeamAddBucketModalProps) {
  const { data: session } = useSession();
  const [bucketId, setBucketId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [permissions, setPermissions] = useState<BucketPermission>(
    BucketPermission.READ_WRITE
  );
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { buckets, isBucketsLoading } = useBuckets({
    userId: session?.user?.id || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/teams/${teamId}/buckets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          s3CredentialId: bucketId,
          name: displayName,
          permissions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add bucket");
      }

      toast({
        title: "Bucket added",
        description: "The bucket has been added to the team successfully.",
      });
      onClose();
      setBucketId("");
      setDisplayName("");
      setPermissions(BucketPermission.READ_WRITE);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Bucket to Team</DialogTitle>
          <DialogDescription>
            Share a bucket with your team members. You can control access permissions
            for the entire team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bucket" className="text-right">
                Bucket
              </Label>
              <Select
                value={bucketId}
                onValueChange={setBucketId}
                disabled={isBucketsLoading}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a bucket" />
                </SelectTrigger>
                <SelectContent>
                  {buckets?.map((bucket) => (
                    <SelectItem key={bucket.id} value={bucket.id}>
                      {bucket.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="displayName" className="text-right">
                Display Name
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="col-span-3"
                placeholder="Enter display name for team"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="permissions" className="text-right">
                Permissions
              </Label>
              <Select
                value={permissions}
                onValueChange={(value) => setPermissions(value as BucketPermission)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select permissions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BucketPermission.READ_WRITE}>
                    Read & Write
                  </SelectItem>
                  <SelectItem value={BucketPermission.READ_ONLY}>
                    Read Only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !bucketId}>
              {isLoading ? "Adding..." : "Add Bucket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}