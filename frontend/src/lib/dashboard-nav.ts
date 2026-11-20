export type Role = "Manager" | "Operations" | "Admin";

export interface NavItem {
  label: string;
  href?: string;
}

export const ROLE_NAV: Record<Role, NavItem[]> = {
  Manager: [
    { label: "Dashboard", href: "/dashboard?role=Manager" },
    { label: "Disruptions", href: "/dashboard/disruptions" },
    { label: "Network Map", href: "/dashboard/network-map" },
    { label: "AI Recovery", href: "/dashboard/ai-recovery" },
    { label: "Shipments", href: "/dashboard/shipments" },
    { label: "Analytics", href: "/dashboard/analytics" },
  ],
  Operations: [
    { label: "Console Overview", href: "/operations" },
    { label: "Live Shipments", href: "/operations" },
    { label: "Route Management", href: "/operations" },
    { label: "Network Monitor", href: "/operations" },
    { label: "Alerts", href: "/operations" },
  ],
  Admin: [
    { label: "SAP Gateway Sync", href: "/dashboard?role=Admin&tab=sync" },
    { label: "Tenant Keyrings", href: "/dashboard?role=Admin&tab=keyrings" },
    { label: "System Audit Trail", href: "/dashboard?role=Admin&tab=audit" },
  ],
};

/** Section title shown in the top bar for a given pathname. */
export function sectionTitleForPath(pathname: string): string {
  if (pathname.startsWith("/operations")) return "Operations Console";
  return "Dashboard";
}