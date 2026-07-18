"use client";

import { useMutation } from "convex/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";

import { getRouteActionError } from "./route-error";
import type { ActiveRouteOperations } from "./route-types";

type Action = "pause" | "resume" | "advance" | "stop" | "route";

export function RouteSimulationControls({
  data,
}: {
  data: ActiveRouteOperations;
}) {
  const pause = useMutation(api.truckSimulation.pause);
  const resume = useMutation(api.truckSimulation.resume);
  const advanceNow = useMutation(api.truckSimulation.advanceNow);
  const markCollected = useMutation(api.taskManagement.markCollected);
  const completeRoute = useMutation(api.routeManagement.completeRoute);
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { simulation, route } = data;

  const act = async (action: Action, mutation: () => Promise<unknown>) => {
    if (activeAction !== null) return;
    setActiveAction(action);
    setError(null);
    try {
      await mutation();
    } catch (caught) {
      setError(getRouteActionError(caught));
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {simulation.canPause ? (
          <Button
            size="sm"
            disabled={activeAction !== null}
            onClick={() =>
              void act("pause", () => pause({ routeId: route.id }))
            }
          >
            {activeAction === "pause" ? "Pausing…" : "Pause simulation"}
          </Button>
        ) : null}
        {simulation.canResume ? (
          <Button
            size="sm"
            disabled={activeAction !== null}
            onClick={() =>
              void act("resume", () => resume({ routeId: route.id }))
            }
          >
            {activeAction === "resume" ? "Resuming…" : "Resume simulation"}
          </Button>
        ) : null}
        {simulation.canAdvanceNow ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={activeAction !== null}
            onClick={() =>
              void act("advance", () => advanceNow({ routeId: route.id }))
            }
          >
            {activeAction === "advance" ? "Advancing…" : "Advance now"}
          </Button>
        ) : null}
        {simulation.canMarkCurrentStopCollected && simulation.currentTaskId ? (
          <Button
            size="sm"
            disabled={activeAction !== null}
            onClick={() => {
              if (window.confirm(`Mark ${simulation.targetLabel} collected?`))
                void act("stop", () =>
                  markCollected({ taskId: simulation.currentTaskId! }),
                );
            }}
          >
            {activeAction === "stop"
              ? "Completing stop…"
              : "Mark stop collected"}
          </Button>
        ) : null}
        {simulation.canCompleteRoute ? (
          <Button
            size="sm"
            disabled={activeAction !== null}
            onClick={() => {
              if (window.confirm("Complete this route and release the truck?"))
                void act("route", () => completeRoute({ routeId: route.id }));
            }}
          >
            {activeAction === "route" ? "Completing route…" : "Complete route"}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="status" className="text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
