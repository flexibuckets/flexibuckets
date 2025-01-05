import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default function DashLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
