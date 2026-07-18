"use client";

import { useMutation } from "convex/react";
import Link from "next/link";
import { useState } from "react";

import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";

import { RouteActions } from "./route-actions";
import { getRouteActionError } from "./route-error";
import {
  formatDistance,
  formatDuration,
  simulatedPenaltyLabel,
  type RouteDetail,
} from "./route-types";

const time = (value: number | undefined) =>
  value === undefined
    ? "—"
    : new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value);

export function RouteDetailPanel({ detail }: { detail: RouteDetail }) {
  const move = useMutation(api.routeManagement.moveProposedStop);
  const remove = useMutation(api.taskManagement.removeFromProposedRoute);
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const act = async (name: string, work: () => Promise<unknown>) => {
    setRunning(name);
    setMessage(null);
    try {
      await work();
    } catch (error) {
      setMessage(getRouteActionError(error));
    } finally {
      setRunning(null);
    }
  };
  const { route, truck, orderedStops } = detail;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{route.displayId}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <RouteActions detail={detail} />
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            Status: <StatusBadge status={route.status} />
          </p>
          <p>
            Truck:{" "}
            {truck ? (
              <Link
                href={`/dashboard/fleet?selected=${truck.id}`}
                className="text-primary hover:underline"
              >
                {truck.displayId} · {truck.driverName}
              </Link>
            ) : (
              "Unavailable"
            )}
          </p>
          <p>
            Depot:{" "}
            <span className="font-mono">
              {route.depotLatitude.toFixed(5)},{" "}
              {route.depotLongitude.toFixed(5)}
            </span>
          </p>
          <p>Stops: {orderedStops.length}</p>
          <p>
            Estimated straight-line distance:{" "}
            {formatDistance(route.estimatedDistanceKm)}
          </p>
          <p>Base travel duration: {formatDuration(route.baseTravelMinutes)}</p>
          <p>
            Estimated total duration:{" "}
            {formatDuration(route.estimatedDurationMinutes)}
          </p>
          <p>{simulatedPenaltyLabel("traffic", route.trafficPenaltyMinutes)}</p>
          <p>
            {simulatedPenaltyLabel("road", route.roadConditionPenaltyMinutes)}
          </p>
          <p>Created: {time(route.createdAt)}</p>
          <p>Started: {time(route.startedAt)}</p>
          <p>Completed: {time(route.completedAt)}</p>
        </div>
        <section>
          <h3 className="mb-2 font-medium">Priority composition</h3>
          <div className="flex gap-3 text-sm">
            {(["critical", "high", "medium", "low"] as const).map(
              (priority) => (
                <span key={priority}>
                  <PriorityBadge priority={priority} />{" "}
                  {detail.priorityComposition[priority]}
                </span>
              ),
            )}
          </div>
        </section>
        <section className="space-y-2">
          <h3 className="font-medium">Ordered stops</h3>
          {detail.actions.canEditStops && (
            <p className="text-muted-foreground text-sm">
              Manual stop changes override the recommended order and recalculate
              the route estimate.
            </p>
          )}
          {orderedStops.map((stop) => (
            <div
              key={stop.id}
              className="border-border space-y-2 rounded border p-3 text-sm sm:flex sm:items-center sm:gap-3 sm:space-y-0"
            >
              <span>{stop.sequenceNumber}.</span>
              <div className="min-w-0 flex-1">
                <strong>{stop.taskDisplayId}</strong> · {stop.taskSourceType} ·{" "}
                {stop.taskSourceReference ?? "—"}
                <br />
                {stop.taskReason}
                <br />
                <span className="font-mono">
                  {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
                </span>
              </div>
              <PriorityBadge priority={stop.taskPriority} />
              <span>
                Task <StatusBadge status={stop.taskStatus} />
              </span>
              <span>
                Stop <StatusBadge status={stop.status} />
              </span>
              {detail.actions.canEditStops && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!stop.canMoveUp || running !== null}
                    onClick={() =>
                      act(`up-${stop.id}`, () =>
                        move({
                          routeId: route.id,
                          stopId: stop.id,
                          direction: "up",
                        }),
                      )
                    }
                  >
                    Move Up
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!stop.canMoveDown || running !== null}
                    onClick={() =>
                      act(`down-${stop.id}`, () =>
                        move({
                          routeId: route.id,
                          stopId: stop.id,
                          direction: "down",
                        }),
                      )
                    }
                  >
                    Move Down
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!stop.canRemove || running !== null}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Remove this task from the proposed route?",
                        )
                      )
                        void act(`remove-${stop.id}`, () =>
                          remove({ taskId: stop.taskId }),
                        );
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ))}
        </section>
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        <section>
          <h3 className="mb-1 font-medium">Route activity history</h3>
          <div className="max-h-56 space-y-1 overflow-y-auto text-sm">
            {detail.activityHistory.map((event) => (
              <p key={event.id} className="text-muted-foreground">
                <span className="text-foreground">{time(event.eventTime)}</span>
                : {event.description}
                {event.actorName ? ` — ${event.actorName}` : ""}
                {event.previousStatus && event.nextStatus
                  ? ` (${event.previousStatus} → ${event.nextStatus})`
                  : ""}
              </p>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
