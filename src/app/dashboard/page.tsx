"use client";
import { BucketDashboard } from "@/components/bucket/BucketDashboard";
import AccessDenied from "@/components/dashboard/AccessDenied";
import { useSession } from "next-auth/react";
import DashboardLoader from "@/components/dashboard/DashboardLoader";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  if (isLoading) {
    return <DashboardLoader />;
  }
  if (status === "unauthenticated" || !session) {
    return <AccessDenied />;
  }
  return <BucketDashboard userId={session.user.id} />;
}
