import type { FunctionReturnType } from "convex/server";

import type { api } from "@/convex/_generated/api";

export type TaskList = FunctionReturnType<typeof api.taskManagement.listTasks>;
export type TaskDetail = NonNullable<
  FunctionReturnType<typeof api.taskManagement.getTaskDetail>
>;

export const TASK_STATUSES = [
  "all",
  "pending",
  "scheduled",
  "assigned",
  "en_route",
  "collected",
  "unable_to_complete",
  "cancelled",
] as const;
export type TaskStatusFilter = (typeof TASK_STATUSES)[number];
export const TASK_PRIORITIES = [
  "all",
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type TaskPriorityFilter = (typeof TASK_PRIORITIES)[number];
export const TASK_SOURCES = [
  "all",
  "smart_bin",
  "citizen_report",
  "manual",
] as const;
export type TaskSourceFilter = (typeof TASK_SOURCES)[number];

export function taskSourceLabel(source: string) {
  return source === "smart_bin"
    ? "Smart bin"
    : source === "citizen_report"
      ? "Citizen report"
      : "Manual";
}
