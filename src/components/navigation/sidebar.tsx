'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/assets/logo.png';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { SidebarLinkType } from '@/lib/types';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import UpdateNotification from '@/components/update/update-notification';
import { sidebarLinks, getTeamSidebarLinks } from '@/lib/routes';
import UserBox from './UserBox';
import { SidebarTeamSection } from '../teams/SidebarTeamSection';
import { useWorkspaceStore } from '@/hooks/use-workspace-context';

import { Badge } from '../ui/badge';

interface SidebarLinkProps {
  link: SidebarLinkType;
  isActiveLink: boolean;
  badge?: number;
  closeOnCurrent?: (href: string) => void;
}

const SidebarLink = ({
  link,
  isActiveLink,
  badge,
  closeOnCurrent,
}: SidebarLinkProps) => {
  const { href, Icon, label } = link;

  return (
    <Link
      onClick={closeOnCurrent ? () => closeOnCurrent(href) : undefined}
      href={href}
      className={cn(
        'group flex items-center justify-between rounded-3xl px-2 py-2 text-sm text-foreground/80 hover:bg-primary hover:text-secondary dark:hover:text-foreground',
        { 'bg-primary text-secondary dark:text-foreground': isActiveLink }
      )}
    >
      <div className="flex items-center">
        <Icon className={cn('mx-2 h-5 w-5')} />
        {label}
      </div>
      {badge !== undefined && badge > 0 && (
        <Badge variant="secondary" className="ml-auto">
          {badge}
        </Badge>
      )}
    </Link>
  );
};

export function AppSidebar() {
  const pathname = usePathname();
  const { selectedTeam } = useWorkspaceStore();
  const links = selectedTeam
    ? getTeamSidebarLinks(selectedTeam.id, selectedTeam.role)
    : sidebarLinks;

  return (
    <Sidebar>
      <SidebarHeader>
        <Link className="z-50" href="/">
          <Image src={Logo} height={75} width={100} alt="Flexibuckets" />
        </Link>
      </SidebarHeader>
      <SidebarTeamSection />
      <SidebarContent>
        {links.map((group) => (
          <SidebarGroup key={group.header}>
            <SidebarGroupLabel>{group.header}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.links.map((link) => {
                  const isActiveLink =
                    link.activeOnRoutes.some((route) =>
                      pathname.includes(route)
                    ) || pathname === link.href;

                  // Add badge for join requests if it's the requests link
                  const badge = link.href.includes('/manage/requests')
                    ? selectedTeam?.joinRequests?.filter(
                        (r) => r.status === 'PENDING'
                      ).length
                    : undefined;

                  return (
                    <SidebarMenuItem key={link.label}>
                      <SidebarMenuButton asChild>
                        <SidebarLink
                          link={link}
                          isActiveLink={isActiveLink}
                          badge={badge}
                        />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <UserBox />
      </SidebarFooter>
    </Sidebar>
  );
}
