import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Users, Settings, Bell, LayoutDashboard, Share2 } from "lucide-react";
import { Button } from "../ui/button";
import { useWorkspaceStore } from "@/hooks/use-workspace-context";
import { SidebarGroup, SidebarGroupLabel } from "../ui/sidebar";

export function TeamSidebar() {
  const pathname = usePathname();
  const { selectedTeam } = useWorkspaceStore();

  if (!selectedTeam) return null;

  const navigationItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      title: "Shared",
      icon: Share2,
      href: "/dashboard/shared",
    },
    {
      title: "Members",
      href: `/teams/${selectedTeam.id}`,
      icon: Users,
    },
  ];

  const managementItems = [
    {
      title: "Members",
      icon: Users,
      href: `/teams/${selectedTeam.id}/manage/members`,
    },
    {
      title: "Join Requests",
      icon: Bell,
      href: `/teams/${selectedTeam.id}/manage/requests`,
      badge: selectedTeam.joinRequests?.filter((r) => r.status === "PENDING")
        .length,
    },
    {
      title: "Settings",
      icon: Settings,
      href: `/teams/${selectedTeam.id}/manage/settings`,
    },
  ];

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Team</SidebarGroupLabel>
        {navigationItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start px-2",
                pathname === item.href &&
                  "bg-sidebar-accent text-sidebar-accent-foreground"
              )}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
            </Button>
          </Link>
        ))}
      </SidebarGroup>

      {selectedTeam.members.some(
        (member) =>
          member.userId === selectedTeam.owner.id ||
          member.role === "ADMIN" ||
          member.role === "OWNER"
      ) && (
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          {managementItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start px-2",
                  pathname === item.href &&
                    "bg-sidebar-accent text-sidebar-accent-foreground"
                )}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
                {item.badge ? (
                  <span className="ml-auto bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                    {item.badge}
                  </span>
                ) : null}
              </Button>
            </Link>
          ))}
        </SidebarGroup>
      )}
    </>
  );
}
