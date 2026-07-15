"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  LayoutDashboard,
  MapIcon,
  MessageSquareWarning,
  Route as RouteIcon,
  Settings,
  Trash2,
  Truck,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/map", label: "Map", icon: MapIcon },
  { href: "/dashboard/bins", label: "Smart Bins", icon: Trash2 },
  { href: "/dashboard/reports", label: "Citizen Reports", icon: MessageSquareWarning },
  { href: "/dashboard/tasks", label: "Collection Tasks", icon: ClipboardList },
  { href: "/dashboard/routes", label: "Routes", icon: RouteIcon },
  { href: "/dashboard/fleet", label: "Fleet & Maintenance", icon: Truck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard sections" className="flex-1 overflow-y-auto px-2 py-3">
      <ul className="space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                title={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md border-l-2 border-transparent px-2.5 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                  active && "border-primary bg-accent font-semibold text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="sr-only lg:not-sr-only lg:truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
