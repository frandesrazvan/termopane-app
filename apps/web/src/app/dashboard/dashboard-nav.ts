import {
  Archive,
  FileText,
  LayoutDashboard,
  Settings,
  UsersRound,
} from "lucide-react";

export const dashboardNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", active: true },
  { label: "Customers", icon: UsersRound, href: "/dashboard/customers" },
  { label: "Quotes", icon: FileText, href: "/dashboard/quotes" },
  { label: "Catalog", icon: Archive, href: "/dashboard/catalog" },
  { label: "Settings", icon: Settings, href: "#" },
];

