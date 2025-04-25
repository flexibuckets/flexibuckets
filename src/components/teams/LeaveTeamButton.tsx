"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceStore } from "@/hooks/use-workspace-context";
import { leaveTeam } from "@/lib/actions/team-leave-actions";
import { TeamRole } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LeaveTeamButtonProps {
  teamId: string;
  userRole: TeamRole;
}

export function LeaveTeamButton({ teamId, userRole }: LeaveTeamButtonProps) {
  const [open, setOpen] = useState(false);

  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setSelectedTeam } = useWorkspaceStore();
  // Don't render button for team owner
  if (userRole === "OWNER") {
    return null;
  }
  const { mutate: handleLeaveTeam, isPending: isLoading } = useMutation({
    mutationFn: leaveTeam,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "You have left the team",
      });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setSelectedTeam(null);
      router.push("/dashboard");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to leave team",
      });
    },
    onSettled: () => {
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Leave Team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave Team</DialogTitle>
          <DialogDescription>
            Are you sure you want to leave this team? This action cannot be
            undone and all your files in team buckets will be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleLeaveTeam(teamId)}
            disabled={isLoading}>
            {isLoading ? "Leaving..." : "Leave Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
