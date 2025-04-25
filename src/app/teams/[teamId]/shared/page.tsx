import React from "react";
import { auth } from "@/auth";
import { getTeam } from "@/lib/db/teams";
import { redirect } from "next/navigation";
import { SharedFilesTable } from "@/components/share-file-table/SharedFileTables";

const Page = async ({ params }: { params: { teamId: string } }) => {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const teamData = await getTeam(params.teamId);
  if (!teamData) redirect("/dashboard");

  const ownerMember = teamData.members.find(
    (member) => member.role === "OWNER"
  );
  if (!ownerMember) redirect("/dashboard");

  const currentMember = teamData.members.find(
    (member) => member.userId === session.user.id
  );
  if (!currentMember) redirect("/dashboard?teamId=null");
  const userTeamRole =
    teamData.members.find(({ userId }) => userId === session.user.id)?.role ??
    "NONE";
  return (
    <div className="p-6 bg-background text-foreground space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{teamData.name} Shared Files</h1>
      </div>
      <SharedFilesTable
        userId={session.user.id}
        teamId={params.teamId}
        userTeamRole={userTeamRole}
      />
    </div>
  );
};

export default Page;
