import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RouteSimulationControls } from "./route-simulation-controls";
import type { ActiveRouteOperations } from "./route-types";
import { formatDistance, formatDuration } from "./route-types";

export function ActiveRoutePanel({ data }: { data: ActiveRouteOperations }) {
  const { route, truck, stops, progress } = data;
  const current = stops.find((stop) => stop.isOperationalCurrent);
  const next = stops.find((stop) => stop.isNext);
  const terminal = stops.filter((stop) => stop.isTerminal);
  const upcoming = stops.filter(
    (stop) => stop.isRemaining && !stop.isOperationalCurrent,
  );
  const simulationLabel = simulationStatusLabel(data);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active route · {route.displayId}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Truck"
            value={`${truck.displayId} · ${truck.driverName}`}
          />
          <Metric label="Simulation status" value={simulationLabel} />
          <Metric
            label="Truck location"
            value={`${truck.latitude.toFixed(5)}, ${truck.longitude.toFixed(5)} (simulated)`}
          />
          <Metric label="Movement target" value={data.simulation.targetLabel} />
          <Metric
            label="Next movement"
            value={
              data.simulation.nextSimulationAt
                ? new Intl.DateTimeFormat("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(data.simulation.nextSimulationAt)
                : "—"
            }
          />
          <Metric label="Current stop" value={current?.taskDisplayId ?? "—"} />
          <Metric label="Next stop" value={next?.taskDisplayId ?? "—"} />
          <Metric label="Completed" value={progress.completedStopCount} />
          <Metric label="Unable" value={progress.unableStopCount} />
          <Metric label="Remaining" value={progress.remainingStopCount} />
          <Metric
            label="Started"
            value={
              route.startedAt
                ? new Intl.DateTimeFormat("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(route.startedAt)
                : "—"
            }
          />
          <Metric
            label="Remaining distance"
            value={formatDistance(progress.remainingDistanceKm ?? 0)}
          />
          <Metric
            label="Remaining duration"
            value={formatDuration(
              progress.remainingEstimatedDurationMinutes ?? 0,
            )}
          />
          <Metric
            label="Simulated traffic penalty"
            value={`+${progress.remainingTrafficPenaltyMinutes ?? 0} min`}
          />
          <Metric
            label="Simulated road-condition penalty"
            value={`+${progress.remainingRoadConditionPenaltyMinutes ?? 0} min`}
          />
        </div>
        <p className="text-muted-foreground text-sm">
          This is a controlled simulation. No driver-phone location is used.
        </p>
        <RouteSimulationControls data={data} />
        <div className="space-y-1">
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>Terminal progress</span>
            <span>{progress.progressPercentage}%</span>
          </div>
          <Progress value={progress.progressPercentage} />
        </div>
        <StopGroup title="Completed or unable" stops={terminal} />
        <StopGroup
          title="Operational current"
          stops={current ? [current] : []}
        />
        <StopGroup title="Upcoming" stops={upcoming} />
      </CardContent>
    </Card>
  );
}
function simulationStatusLabel(data: ActiveRouteOperations) {
  const { phase, targetLabel } = data.simulation;
  if (phase === "paused") return `Paused while moving to ${targetLabel}`;
  if (phase === "moving_to_stop") return `Moving to ${targetLabel}`;
  if (phase === "at_collection_point")
    return `At collection point ${targetLabel}`;
  if (phase === "returning_to_depot") return "Returning to Bariga depot";
  return "Returned to depot — ready to complete";
}
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
function StopGroup({
  title,
  stops,
}: {
  title: string;
  stops: ActiveRouteOperations["stops"];
}) {
  return (
    <section>
      <h3 className="mb-1 text-sm font-medium">{title}</h3>
      {stops.length === 0 ? (
        <p className="text-muted-foreground text-sm">None</p>
      ) : (
        <ol className="space-y-1 text-sm">
          {stops.map((stop) => (
            <li key={stop.id}>
              {stop.sequenceNumber}. {stop.taskDisplayId} ·{" "}
              {stop.status.replaceAll("_", " ")}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
