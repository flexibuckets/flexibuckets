import { ReactNode } from "react";
import { AppSidebar } from "@/components/navigation/sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  );
}
