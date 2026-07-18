"use client";

import Link from "next/link";

import { StatusBadge } from "@/components/dashboard/status-badge";

import type { RouteList } from "./route-types";

const dateTime = (value: number | undefined) =>
  value === undefined
    ? "—"
    : new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value);

export function RoutesTable({
  routes,
  hasRoutes,
  selectedId,
  onSelect,
}: {
  routes: RouteList;
  hasRoutes: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (routes.length === 0)
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {hasRoutes
          ? "No routes match these filters."
          : "No routes exist yet. Use the route builder to propose one."}
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="text-muted-foreground border-b text-xs uppercase">
          <tr>
            <th className="p-3">Route</th>
            <th className="p-3">Status</th>
            <th className="p-3">Truck</th>
            <th className="p-3">Stops</th>
            <th className="p-3">Distance</th>
            <th className="p-3">Duration</th>
            <th className="p-3">Created</th>
            <th className="p-3">Started</th>
            <th className="p-3">Completed</th>
          </tr>
        </thead>
        <tbody>
          {routes.map((route) => (
            <tr
              key={route.id}
              tabIndex={0}
              aria-selected={selectedId === route.id}
              onClick={() => onSelect(route.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(route.id);
                }
              }}
              className={`hover:bg-muted/60 cursor-pointer border-b focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${selectedId === route.id ? "bg-muted" : ""}`}
            >
              <td className="p-3 font-medium">{route.displayId}</td>
              <td className="p-3">
                <StatusBadge status={route.status} />
              </td>
              <td className="p-3">
                {route.truckId === undefined ? (
                  route.truckDisplayId
                ) : (
                  <Link
                    href={`/dashboard/fleet?selected=${route.truckId}`}
                    className="text-primary font-medium hover:underline"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    {route.truckDisplayId}
                  </Link>
                )}
                <br />
                <span className="text-muted-foreground text-xs">
                  {route.driverName}
                </span>
              </td>
              <td className="p-3">
                {route.completedStopCount}/{route.stopCount}
              </td>
              <td className="p-3">{route.estimatedDistanceKm.toFixed(1)} km</td>
              <td className="p-3">
                {route.estimatedDurationMinutes.toFixed(0)} min
              </td>
              <td className="p-3 whitespace-nowrap">
                {dateTime(route.createdAt)}
              </td>
              <td className="p-3 whitespace-nowrap">
                {dateTime(route.startedAt)}
              </td>
              <td className="p-3 whitespace-nowrap">
                {dateTime(route.completedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
