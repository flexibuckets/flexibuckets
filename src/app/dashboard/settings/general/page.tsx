import { auth } from "@/auth";
import AccessDenied from "@/components/dashboard/AccessDenied";
import { SignupToggle } from "@/components/settings/SignUpToggle";
import { DomainSettings } from "@/components/settings/DomainSettings";
import { VersionUpgrade } from "@/components/settings/VersionUpgrade";
import React from "react";

const Page = async () => {
  const session = await auth();
  if (!session || !session.user) {
    return <AccessDenied />;
  }
  if (!session.user.isAdmin) {
    return <AccessDenied />;
  }
  return (
    <div className="space-y-4">
      <SignupToggle />
      <DomainSettings session={session} />
      <VersionUpgrade />
    </div>
  );
};

export default Page;
