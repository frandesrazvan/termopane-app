import {
  Archive,
  FileText,
  LayoutDashboard,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  exact?: boolean;
};

export const dashboardNavItems = [
  { label: "Panou", icon: LayoutDashboard, href: "/dashboard", exact: true },
  { label: "Clienți", icon: UsersRound, href: "/dashboard/customers" },
  { label: "Oferte", icon: FileText, href: "/dashboard/quotes" },
  { label: "Catalog", icon: Archive, href: "/dashboard/catalog" },
] satisfies DashboardNavItem[];

export function isDashboardNavItemActive(pathname: string, item: DashboardNavItem) {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
