export type Role = "Manager" | "Operations" | "Customer" | "Admin";

export interface NavItem {
  label: string;
  /** Present once the page is actually built; absent items render as "Soon". */
  href?: string;
}

// Manager's five modules are wired to real routes + live backend endpoints.
// Other roles still list their intended modules but aren't built yet —
// those render as disabled "Soon" entries in the sidebar.
export const ROLE_NAV: Record<Role, NavItem[]> = {
  Manager: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Disruptions", href: "/dashboard/disruptions" },
    { label: "Network Map", href: "/dashboard/network-map" },
    { label: "AI Recovery", href: "/dashboard/ai-recovery" },
    { label: "Shipments", href: "/dashboard/shipments" },
    { label: "Analytics", href: "/dashboard/analytics" },
  ],
  Operations: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Live Shipments" },
    { label: "Route Management" },
    { label: "Network Monitor" },
    { label: "Alerts" },
  ],
  Customer: [
    { label: "Track Shipment" },
    { label: "Shipment Details" },
    { label: "Live Map" },
    { label: "Delivery Updates" },
  ],
  Admin: [
    { label: "SAP System" },
    { label: "Integration Monitor" },
    { label: "Audit Log" },
  ],
};

/** Section title shown in the top bar for a given pathname. */
export function sectionTitleForPath(pathname: string): string {
  const match = Object.values(ROLE_NAV)
    .flat()
    .find((item) => item.href === pathname);
  if (match) return match.label;
  return "Dashboard";
}