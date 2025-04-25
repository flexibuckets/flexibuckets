import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Users, Settings, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface TeamManagementSidebarProps {
  teamId: string;
  pendingRequestsCount?: number;
}

export function TeamManagementSidebar({ teamId, pendingRequestsCount }: TeamManagementSidebarProps) {
  const pathname = usePathname();
  
  const items = [
    {
      title: "Members",
      icon: Users,
      href: `/teams/${teamId}/manage/members`,
    },
    {
      title: "Join Requests",
      icon: Bell,
      href: `/teams/${teamId}/manage/requests`,
      badge: pendingRequestsCount,
    },
    {
      title: "Settings",
      icon: Settings,
      href: `/teams/${teamId}/manage/settings`,
    },
  ];

  return (
    <div className="w-64 border-r h-full space-y-4 py-4">
      {items.map((item) => (
        <Link key={item.href} href={item.href}>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start px-4",
              pathname === item.href && "bg-muted"
            )}
          >
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
    </div>
  );
}
