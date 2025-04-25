import { TeamRole } from '@prisma/client';
import { NavLink, SidebarLinkGroup } from './types';
import {
  LayoutDashboard,
  Share2,
  CreditCard,
  Settings,
  Users,
  UserCog2Icon,
  ChartPie,
  Heart,
} from 'lucide-react';

// Keep existing route constants
export const ROOT = '/';
export const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/docs',
  '/shared',
  '/googlec349a50cd94e1137.html',
  '/sitemap.xml',
];
export const DEFAULT_REDIRECT = '/auth/signin';
export const DASHBOARD_ROUTE = '/dashboard';

// Keep existing nav links
export const navLinks: NavLink[] = [
  { label: 'Docs', href: 'https://docs.flexibuckets.com' },
  { label: 'About', href: 'https://github.com/flexibuckets/flexibuckets' },
];

// Define reusable link structures for sidebar groups
const applicationLinks: SidebarLinkGroup = {
  header: 'Application',
  links: [
    {
      Icon: LayoutDashboard,
      href: '/dashboard',
      label: 'Dashboard',
      activeOnRoutes: ['/bucket/'],
    },
    {
      Icon: Share2,
      href: '/dashboard/shared',
      label: 'Shared',
      activeOnRoutes: [],
    },
  ],
};

const accountLinks: SidebarLinkGroup = {
  header: 'Account',
  links: [
    {
      Icon: ChartPie,
      href: '/dashboard/stats',
      label: 'Stats',
      activeOnRoutes: [],
    },
    {
      Icon: Settings,
      href: '/dashboard/settings',
      label: 'Settings',
      activeOnRoutes: [],
    },
  ],
};

const healthLinks: SidebarLinkGroup = {
  header: 'Health',
  links: [
    {
      Icon: Heart,
      href: '/dashboard/status',
      label: 'Status',
      activeOnRoutes: [],
    },
  ],
};
// Base sidebar links for all users
export const sidebarLinks: SidebarLinkGroup[] = [
  applicationLinks,
  accountLinks,
  healthLinks,
];

const getTeamLinks = (
  teamId: string,
  userTeamRole: TeamRole
): SidebarLinkGroup => {
  const commonTeamLinks = [
    {
      Icon: Share2,
      href: `/teams/${teamId}/shared`,
      label: 'Team Shared Files',
      activeOnRoutes: [],
    },
  ];

  const links =
    userTeamRole === 'MEMBER'
      ? [
          {
            Icon: Users,
            href: `/teams/${teamId}`,
            label: 'Team',
            activeOnRoutes: [],
          },
        ]
      : [
          {
            Icon: Users,
            href: `/teams/${teamId}/manage`,
            label: 'Manage Team',
            activeOnRoutes: [],
          },
          {
            Icon: UserCog2Icon,
            href: `/teams/${teamId}/settings`,
            label: 'Team Settings',
            activeOnRoutes: [],
          },
        ];

  return { header: 'Teams', links: [...links, ...commonTeamLinks] };
};

// Generate sidebar links for a team, customized based on the user’s role
export const getTeamSidebarLinks = (
  teamId: string,
  userTeamRole: TeamRole
): SidebarLinkGroup[] => {
  return [
    applicationLinks,
    getTeamLinks(teamId, userTeamRole),
    accountLinks,
    healthLinks,
  ];
};
