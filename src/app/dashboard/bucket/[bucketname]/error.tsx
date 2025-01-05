"use client"; // Error components must be Client Components

import AccessDenied from "@/components/dashboard/AccessDenied";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useEffect } from "react";

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <DashboardLayout>
      <AccessDenied />
    </DashboardLayout>
  );
}
