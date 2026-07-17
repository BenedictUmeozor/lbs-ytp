"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";

import { getTaskActionError } from "./task-error";
import type { TaskDetail } from "./task-types";

type FormName = "priority" | "route" | "unable" | "cancel" | "collected";

export function TaskActions({ detail }: { detail: TaskDetail }) {
  const [form, setForm] = useState<FormName | null>(null);
  useEffect(() => {
    const invalid =
      (form === "priority" && !detail.actions.canEditPriority) ||
      (form === "route" &&
        !detail.actions.canAssignToRoute &&
        !detail.actions.canRemoveFromRoute) ||
      (form === "unable" && !detail.actions.canMarkUnableToComplete) ||
      (form === "cancel" && !detail.actions.canCancel) ||
      (form === "collected" && !detail.actions.canMarkCollected);
    if (!invalid) return;
    const timeout = window.setTimeout(() => setForm(null));
    return () => window.clearTimeout(timeout);
  }, [detail.actions, form]);

  if (form === "priority")
    return <PriorityForm detail={detail} onClose={() => setForm(null)} />;
  if (form === "route")
    return <RouteForm detail={detail} onClose={() => setForm(null)} />;
  if (form === "unable")
    return (
      <ReasonForm detail={detail} kind="unable" onClose={() => setForm(null)} />
    );
  if (form === "cancel")
    return (
      <ReasonForm detail={detail} kind="cancel" onClose={() => setForm(null)} />
    );
  if (form === "collected")
    return <CollectedForm detail={detail} onClose={() => setForm(null)} />;
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={!detail.actions.canEditPriority}
        onClick={() => setForm("priority")}
      >
        Edit priority
      </Button>
      {(detail.actions.canAssignToRoute ||
        detail.actions.canRemoveFromRoute) && (
        <Button size="sm" variant="outline" onClick={() => setForm("route")}>
          {detail.actions.canRemoveFromRoute
            ? "Remove from route"
            : "Assign to proposed route"}
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={!detail.actions.canMarkUnableToComplete}
        onClick={() => setForm("unable")}
      >
        Unable to complete
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={!detail.actions.canCancel}
        onClick={() => setForm("cancel")}
      >
        Cancel
      </Button>
      <Button
        size="sm"
        disabled={!detail.actions.canMarkCollected}
        onClick={() => setForm("collected")}
      >
        Mark collected
      </Button>
    </div>
  );
}

function ActionCard({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="border-border space-y-3 rounded border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">{title}</h3>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      {children}
    </div>
  );
}

function PriorityForm({
  detail,
  onClose,
}: {
  detail: TaskDetail;
  onClose: () => void;
}) {
  const update = useMutation(api.taskManagement.updatePriority);
  const [priority, setPriority] = useState(detail.task.priority);
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const submit = async () => {
    setRunning(true);
    setMessage(null);
    try {
      await update({ taskId: detail.task.id, priority });
      onClose();
    } catch (error) {
      setMessage(getTaskActionError(error));
      setRunning(false);
    }
  };
  return (
    <ActionCard title="Edit priority" onClose={onClose}>
      <label className="text-sm">
        Priority
        <select
          className="bg-background mt-1 block rounded border p-2"
          value={priority}
          onChange={(event) =>
            setPriority(event.target.value as typeof priority)
          }
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </label>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <Button size="sm" disabled={running} onClick={submit}>
        {running ? "Saving…" : "Save priority"}
      </Button>
    </ActionCard>
  );
}

function RouteForm({
  detail,
  onClose,
}: {
  detail: TaskDetail;
  onClose: () => void;
}) {
  const assign = useMutation(api.taskManagement.assignToProposedRoute);
  const remove = useMutation(api.taskManagement.removeFromProposedRoute);
  const [routeId, setRouteId] = useState<Id<"routes"> | "">("");
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const submit = async () => {
    setRunning(true);
    setMessage(null);
    try {
      if (detail.actions.canRemoveFromRoute)
        await remove({ taskId: detail.task.id });
      else if (routeId) await assign({ taskId: detail.task.id, routeId });
      onClose();
    } catch (error) {
      setMessage(getTaskActionError(error));
      setRunning(false);
    }
  };
  if (detail.actions.canRemoveFromRoute)
    return (
      <ActionCard title="Remove from proposed route" onClose={onClose}>
        <p className="text-sm">
          This returns the task to pending and resequences the unstarted route. The final stop cannot be removed; cancel the route instead.
        </p>
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        <Button
          size="sm"
          variant="destructive"
          disabled={running}
          onClick={() => {
            if (window.confirm("Remove this task from its proposed route?"))
              void submit();
          }}
        >
          {running ? "Removing…" : "Confirm removal"}
        </Button>
      </ActionCard>
    );
  return (
    <ActionCard title="Assign to proposed route" onClose={onClose}>
      <p className="text-sm">This appends the task to the proposed order and recalculates its estimate. You can adjust the order on the Routes page.</p>
      <label className="text-sm">
        Proposed route
        <select
          className="bg-background mt-1 block w-full rounded border p-2"
          value={routeId}
          onChange={(event) =>
            setRouteId(event.target.value as Id<"routes"> | "")
          }
        >
          <option value="">Select route</option>
          {detail.proposedRoutes
            .filter((route) => route.canAccept)
            .map((route) => (
              <option key={route.id} value={route.id}>
                {route.displayId} · {route.stopCount} stops
              </option>
            ))}
        </select>
      </label>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <Button size="sm" disabled={running || !routeId} onClick={submit}>
        {running ? "Scheduling…" : "Assign route"}
      </Button>
    </ActionCard>
  );
}

function ReasonForm({
  detail,
  kind,
  onClose,
}: {
  detail: TaskDetail;
  kind: "unable" | "cancel";
  onClose: () => void;
}) {
  const unable = useMutation(api.taskManagement.markUnableToComplete);
  const cancel = useMutation(api.taskManagement.cancelTask);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const submit = async () => {
    if (
      !window.confirm(
        kind === "cancel"
          ? "Cancel this task?"
          : "Mark this task unable to complete?",
      )
    )
      return;
    setRunning(true);
    setMessage(null);
    try {
      if (kind === "cancel") await cancel({ taskId: detail.task.id, reason });
      else await unable({ taskId: detail.task.id, reason });
      onClose();
    } catch (error) {
      setMessage(getTaskActionError(error));
      setRunning(false);
    }
  };
  return (
    <ActionCard
      title={kind === "cancel" ? "Cancel task" : "Mark unable to complete"}
      onClose={onClose}
    >
      <label className="text-sm">
        Manager reason
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <Button
        size="sm"
        variant={kind === "cancel" ? "destructive" : "outline"}
        disabled={running}
        onClick={submit}
      >
        {running ? "Working…" : "Confirm"}
      </Button>
    </ActionCard>
  );
}

function CollectedForm({
  detail,
  onClose,
}: {
  detail: TaskDetail;
  onClose: () => void;
}) {
  const collect = useMutation(api.taskManagement.markCollected);
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const submit = async () => {
    if (!window.confirm("Mark this en-route task as collected?")) return;
    setRunning(true);
    try {
      await collect({ taskId: detail.task.id });
      onClose();
    } catch (error) {
      setMessage(getTaskActionError(error));
      setRunning(false);
    }
  };
  return (
    <ActionCard title="Mark collected" onClose={onClose}>
      <p className="text-sm">
        Smart-bin tasks will wait for sensor or manual emptying confirmation.
      </p>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <Button size="sm" disabled={running} onClick={submit}>
        {running ? "Updating…" : "Confirm collection"}
      </Button>
    </ActionCard>
  );
}
