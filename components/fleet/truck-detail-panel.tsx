import { X } from "lucide-react";
import Link from "next/link";

import { DataSourceLabel } from "@/components/dashboard/data-source-label";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import {
  formatCoordinate,
  formatPercentage,
  type TruckDetail,
} from "./fleet-types";

const dateTime = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  dateStyle: "medium",
  timeStyle: "short",
});
const date = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  dateStyle: "medium",
});

export function TruckDetailPanel({
  detail,
  onClose,
}: {
  detail: TruckDetail;
  onClose: () => void;
}) {
  const {
    truck,
    location,
    currentAssignment,
    collectionHistory,
    maintenanceAlerts,
  } = detail;
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>
              {truck.displayId} · {truck.driverName}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Protected fleet record
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close truck detail"
          >
            <X />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <SectionHeading title="Identity and operational status" />
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Truck ID" value={truck.displayId} />
            <Metric label="Driver" value={truck.driverName} />
            <div>
              <dt className="text-muted-foreground text-xs uppercase">
                Status
              </dt>
              <dd className="mt-1">
                <StatusBadge status={truck.status} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase">
                Data source
              </dt>
              <dd className="mt-1">
                <DataSourceLabel source={truck.source} />
              </dd>
            </div>
            <Metric label="Current simulated location" value={location.label} />
            <Metric
              label="Coordinates"
              value={`${formatCoordinate(location.latitude)}, ${formatCoordinate(location.longitude)}`}
              mono
            />
            <div className="space-y-2 sm:col-span-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground text-xs uppercase">
                  Capacity (simulated)
                </dt>
                <dd className="font-medium">
                  {formatPercentage(truck.capacityPercentage)}
                </dd>
              </div>
              <Progress value={truck.capacityPercentage} />
            </div>
          </dl>
        </section>

        <section className="space-y-4">
          <SectionHeading title="Current assignment" />
          {currentAssignment === null ? (
            <p className="text-muted-foreground text-sm">
              No route is currently assigned to this truck.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/dashboard/routes?selected=${currentAssignment.id}`}
                  className="text-primary font-medium hover:underline"
                >
                  {currentAssignment.displayId}
                </Link>
                <StatusBadge status={currentAssignment.status} />
              </div>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Metric
                  label="Current stop"
                  value={stopLabel(currentAssignment.currentStop)}
                />
                <Metric
                  label="Next stop"
                  value={stopLabel(currentAssignment.nextStop)}
                />
                <Metric
                  label="Completed stops"
                  value={currentAssignment.completedStopCount}
                />
                <Metric
                  label="Unable stops"
                  value={currentAssignment.unableStopCount}
                />
                <Metric
                  label="Remaining stops"
                  value={currentAssignment.remainingStopCount}
                />
                <Metric
                  label="Progress"
                  value={formatPercentage(currentAssignment.progressPercentage)}
                />
                <Metric
                  label="Route started"
                  value={
                    currentAssignment.startedAt === undefined
                      ? "—"
                      : dateTime.format(currentAssignment.startedAt)
                  }
                />
              </dl>
              <Progress
                value={currentAssignment.progressPercentage}
                aria-label={`${currentAssignment.progressPercentage}% route progress`}
              />
            </div>
          )}
        </section>

        <section className="space-y-4">
          <SectionHeading title="Collection history" />
          {collectionHistory.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No completed collection activity is recorded for this truck.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-muted-foreground border-b text-xs uppercase">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Task</th>
                    <th className="p-3">Outcome</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Route</th>
                  </tr>
                </thead>
                <tbody>
                  {collectionHistory.map((entry) => (
                    <tr key={entry.id} className="border-b">
                      <td className="p-3 whitespace-nowrap">
                        {dateTime.format(entry.eventTime)}
                      </td>
                      <td className="p-3">
                        <Link
                          href={`/dashboard/tasks?selected=${entry.id}`}
                          className="text-primary font-medium hover:underline"
                        >
                          {entry.displayId}
                        </Link>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={entry.outcome} />
                      </td>
                      <td className="p-3">
                        {entry.sourceType.replaceAll("_", " ")} ·{" "}
                        {entry.sourceReference}
                      </td>
                      <td className="p-3">{entry.locationLabel}</td>
                      <td className="p-3">
                        {entry.route === null ? (
                          "—"
                        ) : (
                          <Link
                            href={`/dashboard/routes?selected=${entry.route.id}`}
                            className="text-primary hover:underline"
                          >
                            {entry.route.displayId}
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-lg border border-amber-300/60 bg-amber-50/40 p-4 dark:bg-amber-950/10">
          <div>
            <h3 className="font-heading font-medium">
              Prototype Vehicle Health Monitoring — based on simulated data.
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Read-only proof-of-concept values; not real telemetry or
              predictive diagnostics.
            </p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Mileage since service (simulated)"
              value={`${truck.mileageSinceService.toLocaleString("en-NG")} km`}
            />
            <Metric
              label="Last-service date (simulated)"
              value={date.format(truck.lastServiceAt)}
            />
            <Metric
              label="Battery status (simulated)"
              value={formatPercentage(truck.batteryPercentage)}
            />
            <Metric
              label="Engine-health score (simulated)"
              value={formatPercentage(truck.engineHealthScore)}
            />
            <div>
              <dt className="text-muted-foreground text-xs uppercase">
                Maintenance risk (simulated)
              </dt>
              <dd className="mt-1">
                <StatusBadge status={truck.maintenanceRisk} />
              </dd>
            </div>
            <Metric
              label="Reported fault (simulated)"
              value={truck.reportedFault ?? "None reported"}
            />
            <Metric
              label="Next recommended service (simulated)"
              value={
                truck.nextRecommendedServiceAt === undefined
                  ? "—"
                  : date.format(truck.nextRecommendedServiceAt)
              }
            />
          </dl>
        </section>

        <section className="space-y-4">
          <SectionHeading title="Existing maintenance alerts" />
          {maintenanceAlerts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No maintenance alerts are recorded for this truck.
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {maintenanceAlerts.map((alert) => (
                <article
                  key={alert.id}
                  className="space-y-3 rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={alert.risk} />
                    <Badge variant="outline">Simulated</Badge>
                    <Badge variant="secondary">
                      {alert.resolvedAt === undefined ? "Open" : "Resolved"}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-medium">{alert.reason}</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {alert.recommendation}
                    </p>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Created {dateTime.format(alert.createdAt)}
                    {alert.resolvedAt === undefined
                      ? ""
                      : ` · Resolved ${dateTime.format(alert.resolvedAt)}`}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h3 className="font-heading border-b pb-2 text-base font-medium">
      {title}
    </h3>
  );
}
function Metric({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs uppercase">{label}</dt>
      <dd className={`mt-1 font-medium ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
function stopLabel(
  stop: NonNullable<TruckDetail["currentAssignment"]>["currentStop"],
) {
  return stop === null
    ? "—"
    : `${stop.taskDisplayId} · ${stop.taskLocationLabel}`;
}
