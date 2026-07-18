"use client";

import Link from "next/link";

import { DataSourceLabel } from "@/components/dashboard/data-source-label";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Progress } from "@/components/ui/progress";

import { formatPercentage, type FleetTruck } from "./fleet-types";

const date = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  dateStyle: "medium",
});

export function FleetTable({
  trucks,
  selectedId,
  onSelect,
}: {
  trucks: FleetTruck[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (trucks.length === 0)
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        No trucks are available in the demo fleet.
      </p>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="text-muted-foreground border-b text-xs uppercase">
          <tr>
            <th className="p-3">Truck ID</th>
            <th className="p-3">Driver</th>
            <th className="p-3">Status</th>
            <th className="p-3">Current location</th>
            <th className="p-3">Assigned route</th>
            <th className="p-3">Remaining stops</th>
            <th className="p-3">Capacity</th>
            <th className="p-3">Maintenance risk</th>
            <th className="p-3">Last service</th>
          </tr>
        </thead>
        <tbody>
          {trucks.map((truck) => (
            <tr
              key={truck.id}
              tabIndex={0}
              aria-selected={selectedId === truck.id}
              onClick={() => onSelect(truck.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(truck.id);
                }
              }}
              className={`hover:bg-muted/60 cursor-pointer border-b focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${selectedId === truck.id ? "bg-muted" : ""}`}
            >
              <td className="p-3 font-medium">{truck.displayId}</td>
              <td className="p-3">{truck.driverName}</td>
              <td className="p-3">
                <StatusBadge status={truck.status} />
              </td>
              <td className="p-3">
                <p>{truck.locationLabel}</p>
                <DataSourceLabel source={truck.source} className="mt-1" />
              </td>
              <td className="p-3">
                {truck.assignedRoute === null ? (
                  "—"
                ) : (
                  <Link
                    href={`/dashboard/routes?selected=${truck.assignedRoute.id}`}
                    className="text-primary font-medium hover:underline"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    {truck.assignedRoute.displayId}
                  </Link>
                )}
              </td>
              <td className="p-3">{truck.remainingStopCount}</td>
              <td className="p-3">
                <div className="min-w-28 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{formatPercentage(truck.capacityPercentage)}</span>
                    <span className="text-muted-foreground">simulated</span>
                  </div>
                  <Progress value={truck.capacityPercentage} />
                </div>
              </td>
              <td className="p-3">
                <StatusBadge status={truck.maintenanceRisk} />
                {truck.unresolvedMaintenanceAlertCount > 0 ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {truck.unresolvedMaintenanceAlertCount} open alert
                    {truck.unresolvedMaintenanceAlertCount === 1 ? "" : "s"}
                  </p>
                ) : null}
              </td>
              <td className="p-3 whitespace-nowrap">
                {date.format(truck.lastServiceAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
