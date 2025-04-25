import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import React from "react";

const TeamLayout = ({ children }: { children: React.ReactNode }) => {
  return <DashboardLayout>{children}</DashboardLayout>;
};

export default TeamLayout;
