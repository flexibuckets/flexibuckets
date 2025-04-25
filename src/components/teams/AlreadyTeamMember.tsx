"use client";
import { Loader2 } from "lucide-react";
import React, { useEffect } from "react";
import { Badge } from "../ui/badge";
import { useRouter } from "next/navigation";

const AlreadyTeamMember = ({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) => {
  const router = useRouter();
  useEffect(() => {
    router.push(`/teams/${teamId}`);
  }, []);

  return (
    <div className="w-full h-[calc(100vh-7rem)] flex flex-col gap-y-2 justify-center items-center text-lg font-medium">
      <Loader2 className="h-4 w-4 animate-spin mr-2" />
      <span>
        Looks like you&apos;re a member of{" "}
        <Badge variant="default">{teamName}.</Badge>
      </span>
      <span className="text-muted-foreground">
        Please wait while we redirect you.
      </span>
    </div>
  );
};

export default AlreadyTeamMember;
