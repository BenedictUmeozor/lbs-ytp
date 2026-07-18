"use client";

import Link from "next/link";

import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { TaskActions } from "./task-actions";
import { type TaskDetail, taskSourceLabel } from "./task-types";

const time = (value: number | undefined) =>
  value === undefined
    ? "—"
    : new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(value);

export function TaskDetailPanel({ detail }: { detail: TaskDetail }) {
  const task = detail.task;
  const mapHref = detail.map.sourceBinId
    ? `/dashboard/map?type=bin&selected=${detail.map.sourceBinId}`
    : detail.map.sourceReportId
      ? `/dashboard/map?type=report&selected=${detail.map.sourceReportId}`
      : null;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {task.displayId} · {taskSourceLabel(task.sourceType)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <TaskActions detail={detail} />
          {detail.actions.actionNotice && (
            <p className="border-border rounded border px-3 py-2 text-sm">
              {detail.actions.actionNotice}
            </p>
          )}
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              Status: <StatusBadge status={task.status} />
            </p>
            <p>
              Priority: <PriorityBadge priority={task.priority} />
            </p>
            <p>Source reference: {task.sourceReference}</p>
            <p>Location: {task.locationLabel}</p>
            <p>
              Coordinates:{" "}
              <span className="font-mono">
                {task.latitude.toFixed(5)}, {task.longitude.toFixed(5)}
              </span>
            </p>
            <p>Created: {time(task.createdAt)}</p>
            <p>Scheduled: {time(task.scheduledAt)}</p>
            <p>Completed: {time(task.completedAt)}</p>
            <p>
              Assigned truck:{" "}
              {detail.assignedTruck
                ? `${detail.assignedTruck.displayId} · ${detail.assignedTruck.driverName}`
                : "—"}
            </p>
            <p>
              Route:{" "}
              {detail.route
                ? `${detail.route.displayId} · ${detail.route.status}`
                : "—"}
            </p>
            {detail.routeStop && (
              <p>
                Route stop: {detail.routeStop.sequenceNumber} ·{" "}
                <StatusBadge status={detail.routeStop.status} />
              </p>
            )}
          </div>
          <section>
            <h3 className="mb-1 font-medium">Reason</h3>
            <p className="bg-muted rounded p-3 text-sm">{task.reason}</p>
          </section>
          <div className="flex flex-wrap gap-3 text-sm">
            {detail.source.bin && (
              <Link
                className="underline"
                href={`/dashboard/bins?selected=${detail.source.bin.id}`}
              >
                View related bin
              </Link>
            )}
            {detail.source.report && (
              <Link
                className="underline"
                href={`/dashboard/reports?selected=${detail.source.report.id}`}
              >
                View source report
              </Link>
            )}
            {mapHref && (
              <Link className="underline" href={mapHref}>
                View on map
              </Link>
            )}
          </div>
          {detail.linkedReports.length > 0 && (
            <section>
              <h3 className="mb-1 font-medium">Related citizen reports</h3>
              <ul className="space-y-1 text-sm">
                {detail.linkedReports.map((report) => (
                  <li key={report.id}>
                    <Link
                      className="underline"
                      href={`/dashboard/reports?selected=${report.id}`}
                    >
                      {report.referenceNumber}
                    </Link>{" "}
                    · <StatusBadge status={report.status} /> ·{" "}
                    {report.summary ?? "No summary"}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {detail.activityHistory.length > 0 && (
            <section>
              <h3 className="mb-1 font-medium">Task activity history</h3>
              <div className="max-h-56 space-y-1 overflow-y-auto text-sm">
                {detail.activityHistory.map((event) => (
                  <p key={event.id} className="text-muted-foreground">
                    <span className="text-foreground">
                      {time(event.eventTime)}
                    </span>
                    : {event.description}
                    {event.actorName ? ` — ${event.actorName}` : ""}
                  </p>
                ))}
              </div>
            </section>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
