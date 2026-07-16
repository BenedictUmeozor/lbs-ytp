"use client";

import { useConvexAuth, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  OctagonX,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

import {
  ContentCardSkeleton,
  SummaryCardSkeleton,
} from "@/components/dashboard/loading-skeleton";
import { PageHeader } from "@/components/dashboard/page-header";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";

import { TaskDetailPanel } from "./task-detail-panel";
import {
  TASK_PRIORITIES,
  TASK_SOURCES,
  TASK_STATUSES,
  type TaskPriorityFilter,
  type TaskSourceFilter,
  type TaskStatusFilter,
  taskSourceLabel,
} from "./task-types";
import { TasksTable } from "./tasks-table";

function label(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function CollectionTasksPage() {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const params = useSearchParams();
  const selectedId = params.get("selected");
  const rawStatus = params.get("status");
  const rawPriority = params.get("priority");
  const rawSource = params.get("source");
  const status = TASK_STATUSES.includes(rawStatus as TaskStatusFilter)
    ? (rawStatus as TaskStatusFilter)
    : "all";
  const priority = TASK_PRIORITIES.includes(rawPriority as TaskPriorityFilter)
    ? (rawPriority as TaskPriorityFilter)
    : "all";
  const source = TASK_SOURCES.includes(rawSource as TaskSourceFilter)
    ? (rawSource as TaskSourceFilter)
    : "all";
  const tasks = useQuery(
    api.taskManagement.listTasks,
    authLoading || !isAuthenticated ? "skip" : {},
  );
  const detail = useQuery(
    api.taskManagement.getTaskDetail,
    authLoading || !isAuthenticated || selectedId === null
      ? "skip"
      : { taskId: selectedId },
  );
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([key, value]) =>
      value === null ? next.delete(key) : next.set(key, value),
    );
    const query = next.toString();
    window.history.pushState(
      null,
      "",
      `/dashboard/tasks${query ? `?${query}` : ""}`,
    );
  };
  if (authLoading) return <TasksSkeleton />;
  if (!isAuthenticated)
    return (
      <div className="border-border flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
        <AlertTriangle className="text-muted-foreground size-8" />
        <p className="font-medium">Session verification failed</p>
        <p className="text-muted-foreground text-sm">
          Please sign in again and retry.
        </p>
      </div>
    );
  if (tasks === undefined) return <TasksSkeleton />;
  const filtered = tasks.filter(
    (task) =>
      (status === "all" || task.status === status) &&
      (priority === "all" || task.priority === priority) &&
      (source === "all" || task.sourceType === source),
  );
  const summary = {
    total: tasks.length,
    pending: tasks.filter((task) => task.status === "pending").length,
    active: tasks.filter((task) =>
      ["scheduled", "assigned", "en_route"].includes(task.status),
    ).length,
    collected: tasks.filter((task) => task.status === "collected").length,
    unable: tasks.filter((task) => task.status === "unable_to_complete").length,
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Collection Tasks"
        description="Manage collection work, reviewed report matches, and proposed-route scheduling for the Bariga pilot."
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SummaryCard
          label="Total tasks"
          value={summary.total}
          icon={ClipboardList}
          href="/dashboard/tasks"
        />
        <SummaryCard
          label="Pending"
          value={summary.pending}
          icon={CircleDashed}
          href="/dashboard/tasks?status=pending"
          emphasis={summary.pending > 0 ? "critical" : "default"}
        />
        <SummaryCard
          label="Active"
          value={summary.active}
          icon={ClipboardList}
          href="/dashboard/tasks?status=scheduled"
        />
        <SummaryCard
          label="Collected"
          value={summary.collected}
          icon={CheckCircle2}
          href="/dashboard/tasks?status=collected"
        />
        <SummaryCard
          label="Unable"
          value={summary.unable}
          icon={OctagonX}
          href="/dashboard/tasks?status=unable_to_complete"
          emphasis={summary.unable > 0 ? "critical" : "default"}
        />
      </div>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <Filter
              label="Status"
              value={status}
              values={TASK_STATUSES}
              onChange={(value) =>
                update({ status: value === "all" ? null : value })
              }
              format={label}
            />
            <Filter
              label="Priority"
              value={priority}
              values={TASK_PRIORITIES}
              onChange={(value) =>
                update({ priority: value === "all" ? null : value })
              }
              format={label}
            />
            <Filter
              label="Source"
              value={source}
              values={TASK_SOURCES}
              onChange={(value) =>
                update({ source: value === "all" ? null : value })
              }
              format={(value) =>
                value === "all" ? "All sources" : taskSourceLabel(value)
              }
            />
            {(status !== "all" || priority !== "all" || source !== "all") && (
              <button
                type="button"
                className="text-sm underline-offset-2 hover:underline"
                onClick={() =>
                  update({ status: null, priority: null, source: null })
                }
              >
                Clear filters
              </button>
            )}
          </div>
          <TasksTable
            tasks={filtered}
            hasTasks={tasks.length > 0}
            selectedId={selectedId}
            onSelect={(id) => update({ selected: id })}
          />
        </CardContent>
      </Card>
      {selectedId !== null && detail === undefined && (
        <ContentCardSkeleton rows={10} titleWidth="w-56" />
      )}
      {selectedId !== null && detail === null && (
        <div className="border-border rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="font-medium">Task not found</p>
          <button
            className="mt-2 text-sm underline"
            onClick={() => update({ selected: null })}
          >
            Return to task list
          </button>
        </div>
      )}
      {detail !== undefined && detail !== null && (
        <TaskDetailPanel key={detail.task.id} detail={detail} />
      )}
    </div>
  );
}

function Filter({
  label: filterLabel,
  value,
  values,
  onChange,
  format,
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
  format: (value: string) => string;
}) {
  return (
    <label className="text-sm">
      {filterLabel}
      <select
        className="bg-background mt-1 block w-44 rounded border p-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {values.map((option) => (
          <option key={option} value={option}>
            {option === "all" ? "All" : format(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
function TasksSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="bg-muted h-7 w-48 animate-pulse rounded" />
        <div className="bg-muted h-4 w-96 animate-pulse rounded" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <SummaryCardSkeleton key={index} />
        ))}
      </div>
      <ContentCardSkeleton rows={8} />
    </div>
  );
}
