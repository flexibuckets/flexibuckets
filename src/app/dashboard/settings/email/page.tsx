import { auth } from "@/auth";
import AccessDenied from "@/components/dashboard/AccessDenied";
import { EmailSettings } from "@/components/settings/EmailSettings";
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
      <EmailSettings />
    </div>
  );
};

export default Page;
