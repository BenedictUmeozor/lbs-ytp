"use client";

import { useMutation } from "convex/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { getRouteActionError } from "./route-error";
import type { RouteDetail } from "./route-types";

export function RouteActions({
  detail,
  onUpdated,
}: {
  detail: RouteDetail;
  onUpdated?: () => void;
}) {
  const assign = useMutation(api.routeManagement.assignRoute);
  const start = useMutation(api.routeManagement.startRoute);
  const cancel = useMutation(api.routeManagement.cancelProposedRoute);
  const complete = useMutation(api.routeManagement.completeRoute);

  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  const act = async (action: string, fn: () => Promise<unknown>) => {
    if (running !== null) return;
    setRunning(action);
    setMessage(null);
    try {
      await fn();
      setShowCancel(false);
      setCancelReason("");
      onUpdated?.();
    } catch (error) {
      setMessage(getRouteActionError(error));
    } finally {
      setRunning(null);
    }
  };

  const actions = detail.actions;
  const cancellationOpen = showCancel && actions.canCancel;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {actions.canAssign && (
          <Button
            size="sm"
            disabled={running !== null}
            onClick={() => {
              if (
                window.confirm(
                  "Assign this route and its tasks to the selected truck?",
                )
              )
                void act("assign", () =>
                  assign({ routeId: detail.route.id as Id<"routes"> }),
                );
            }}
          >
            {running === "assign" ? "Assigning…" : "Assign route"}
          </Button>
        )}
        {actions.canStart && (
          <Button
            size="sm"
            disabled={running !== null}
            onClick={() => {
              if (
                window.confirm(
                  "Start this route? Linked tasks will become en route.",
                )
              )
                void act("start", () =>
                  start({ routeId: detail.route.id as Id<"routes"> }),
                );
            }}
          >
            {running === "start" ? "Starting…" : "Start route"}
          </Button>
        )}
        {actions.canCancel && (
          <Button
            size="sm"
            variant="destructive"
            disabled={running !== null}
            onClick={() => setShowCancel(true)}
          >
            Cancel proposal
          </Button>
        )}
        {actions.canComplete && (
          <Button
            size="sm"
            disabled={running !== null}
            onClick={() => {
              if (
                window.confirm(
                  "Complete this route? All stops and tasks must already be terminal.",
                )
              )
                void act("complete", () =>
                  complete({ routeId: detail.route.id as Id<"routes"> }),
                );
            }}
          >
            {running === "complete" ? "Completing…" : "Complete route"}
          </Button>
        )}
      </div>

      {cancellationOpen && (
        <div className="border-border space-y-3 rounded border p-3">
          <h3 className="text-sm font-medium">Cancel proposed route</h3>
          <label className="text-sm">
            Reason
            <Input
              value={cancelReason}
              disabled={running !== null}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Required — 3 to 240 characters"
            />
          </label>
          {message && (
            <p role="status" className="text-sm">
              {message}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={running !== null}
              onClick={() =>
                act("cancel", () =>
                  cancel({
                    routeId: detail.route.id as Id<"routes">,
                    reason: cancelReason,
                  }),
                )
              }
            >
              {running === "cancel" ? "Cancelling…" : "Confirm cancellation"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={running !== null}
              onClick={() => {
                setShowCancel(false);
                setCancelReason("");
                setMessage(null);
              }}
            >
              Keep proposal
            </Button>
          </div>
        </div>
      )}

      {detail.route.status === "active" && !actions.canComplete && (
        <p className="text-muted-foreground text-sm">
          Complete every stop, then wait for the simulated truck to return to
          the depot.
        </p>
      )}

      {message && !cancellationOpen && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
