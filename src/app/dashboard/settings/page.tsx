import { auth } from "@/auth";
import AccessDenied from "@/components/dashboard/AccessDenied";
import DomainSettings from "@/components/settings/DomainSettings";

import NameEdit from "@/components/settings/NameEdit";
import React from "react";

const Page = async () => {
  const session = await auth();
  if (!session || !session.user) {
    return <AccessDenied />;
  }
  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 space-y-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">User Settings</h1>
          </div>
        </div>
        <NameEdit session={session} />
        <DomainSettings />
      </div>
    </div>
  );
};

export default Page;
