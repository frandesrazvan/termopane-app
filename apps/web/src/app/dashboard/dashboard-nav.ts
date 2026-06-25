import {
  Archive,
  FileText,
  LayoutDashboard,
  Settings,
  UsersRound,
} from "lucide-react";

export const dashboardNavItems = [
  { label: "Panou", icon: LayoutDashboard, href: "/dashboard", active: true },
  { label: "Clienți", icon: UsersRound, href: "/dashboard/customers" },
  { label: "Oferte", icon: FileText, href: "/dashboard/quotes" },
  { label: "Catalog", icon: Archive, href: "/dashboard/catalog" },
  { label: "Setări", icon: Settings, href: "#" },
];
