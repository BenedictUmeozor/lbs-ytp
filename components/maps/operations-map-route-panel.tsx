import { Route as RouteIcon } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Progress } from "@/components/ui/progress";
import type { OperationsMapData } from "./operations-map-types";

export function OperationsMapRoutePanel({
  route,
}: {
  route: OperationsMapData["activeRoute"];
}) {
  if (route === null)
    return (
      <EmptyState
        icon={RouteIcon}
        title="No active route"
        description="The active route will appear after route generation and assignment."
      />
    );
  const current = route.stops.find((stop) => stop.isOperationalCurrent);
  const next = route.stops.find((stop) => stop.isNext);
  const progress = route.progressPercentage;
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{route.displayId}</p>
          <p className="text-muted-foreground text-sm">
            Assigned truck {route.truckDisplayId} · static/simulated location
          </p>
        </div>
        <StatusBadge status={route.status} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Metric label="Total stops" value={route.totalStops} />
        <Metric label="Current stop" value={current?.taskDisplayId ?? "—"} />
        <Metric label="Next stop" value={next?.taskDisplayId ?? "—"} />
        <Metric label="Completed stops" value={route.completedStopCount} />
        <Metric label="Unable stops" value={route.unableStopCount} />
        <Metric label="Remaining stops" value={route.remainingStopCount} />
        <Metric label="Remaining distance" value={`${(route.remainingDistanceKm ?? 0).toFixed(1)} km`} />
        <Metric label="Remaining duration" value={`${route.remainingEstimatedDurationMinutes ?? 0} min`} />
        <Metric label="Simulated traffic penalty" value={`+${route.remainingTrafficPenaltyMinutes ?? 0} min`} />
        <Metric label="Simulated road-condition penalty" value={`+${route.remainingRoadConditionPenaltyMinutes ?? 0} min`} />
      </dl>
      <div className="space-y-1">
        <div className="text-muted-foreground flex justify-between text-xs">
          <span>Route progress</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>
      <ol className="space-y-2">
        {route.stops.map((stop) => (
          <li
            key={stop.id}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span>
              <strong>{stop.sequenceNumber}.</strong> {stop.taskDisplayId}
            </span>
            <StatusBadge status={stop.status} />
            {stop.isOperationalCurrent ? " current" : stop.isNext ? " next" : stop.isTerminal ? " terminal" : " upcoming"}
          </li>
        ))}
      </ol>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
