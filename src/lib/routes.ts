
import { NavLink, SidebarLinkGroup } from "./types";
import {
  LayoutDashboard,
  Share2,
  CreditCard,
  Settings,
  Users,
  UserCog2Icon,
  ChartPie,
  Heart
} from "lucide-react";

// Keep existing route constants
export const ROOT = "/";
export const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/docs",
  "/shared",
  "/googlec349a50cd94e1137.html",
  "/sitemap.xml",
];
export const DEFAULT_REDIRECT = "/auth/signin";
export const DASHBOARD_ROUTE = "/dashboard";

// Keep existing nav links
export const navLinks: NavLink[] = [
  { label: "Features", href: "https://docs.flexibuckets.com/features" },
  { label: "Docs", href: "https://docs.flexibuckets.com" },
  { label: "About", href: "https://flexibuckets.com/about" },
];

// Define reusable link structures for sidebar groups
const applicationLinks: SidebarLinkGroup = {
  header: "Application",
  links: [
    {
      Icon: LayoutDashboard,
      href: "/dashboard",
      label: "Dashboard",
      activeOnRoutes: ["/bucket/"],
    },
    {
      Icon: Share2,
      href: "/dashboard/shared",
      label: "Shared",
      activeOnRoutes: [],
    },
  ],
};

const accountLinks: SidebarLinkGroup = {
  header: "Account",
  links: [
    {
      Icon: ChartPie,
      href: "/dashboard/stats",
      label: "Stats",
      activeOnRoutes: [],
    },
    {
      Icon: Settings,
      href: "/dashboard/settings",
      label: "Settings",
      activeOnRoutes: [],
    },
  ],
};

const healthLinks: SidebarLinkGroup = {
  header: "Health",
  links: [
    {
      Icon: Heart,
      href: "/dashboard/status",
      label: "Status",
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

