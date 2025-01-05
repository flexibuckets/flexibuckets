
import { NavLink, SidebarLinkGroup } from "./types";
import {
  LayoutDashboard,
  Share2,
  CreditCard,
  Settings,
  Users,
  UserCog2Icon,
  ChartPie
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
  "/tos",
  "/refund-policy",
  "/privacy-policy",
];
export const DEFAULT_REDIRECT = "/auth/signin";
export const DASHBOARD_ROUTE = "/dashboard";

// Keep existing nav links
export const navLinks: NavLink[] = [
  { label: "Features", href: "#" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs/" },
  { label: "About", href: "#" },
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

// Base sidebar links for all users
export const sidebarLinks: SidebarLinkGroup[] = [
  applicationLinks,
  accountLinks,
];

