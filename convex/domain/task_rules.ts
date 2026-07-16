import type { Doc } from "../_generated/dataModel";
import type {
  Priority,
  ReportCategory,
  ReportStatus,
  TaskStatus,
} from "./validators";

const activeTaskStatuses = new Set<TaskStatus>([
  "pending",
  "scheduled",
  "assigned",
  "en_route",
]);
const terminalTaskStatuses = new Set<TaskStatus>([
  "collected",
  "unable_to_complete",
  "cancelled",
]);

export const TASK_STATUS_TRANSITIONS: Record<
  TaskStatus,
  readonly TaskStatus[]
> = {
  pending: ["scheduled", "unable_to_complete", "cancelled"],
  scheduled: ["assigned", "unable_to_complete", "cancelled"],
  assigned: ["en_route", "unable_to_complete"],
  en_route: ["collected", "unable_to_complete"],
  collected: [],
  unable_to_complete: [],
  cancelled: [],
};

export function isActiveTaskStatus(status: TaskStatus) {
  return activeTaskStatuses.has(status);
}

export function isTerminalTaskStatus(status: TaskStatus) {
  return terminalTaskStatuses.has(status);
}

export function canTransitionTaskStatus(
  currentStatus: TaskStatus,
  nextStatus: TaskStatus,
) {
  return TASK_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}

export function isTaskEligibleForRoute(task: Doc<"collectionTasks">) {
  return task.status === "pending" && task.routeId === undefined;
}

export function isAutomaticTaskEligible(report: Doc<"citizenReports">) {
  return (
    !["pending", "processing"].includes(report.aiStatus) &&
    !["duplicate", "rejected", "resolved"].includes(report.status) &&
    report.requiresCollection === true &&
    (report.priority === "high" || report.priority === "critical") &&
    report.category !== undefined &&
    report.needsClarification !== true
  );
}

export function taskCategoriesMatch(
  reportCategory: ReportCategory,
  taskCategory: ReportCategory | null,
) {
  return taskCategory === reportCategory;
}

export function taskPriorityRank(priority: Priority) {
  return { low: 1, medium: 2, high: 3, critical: 4 }[priority];
}

export function reportStatusForTaskStatus(
  status: TaskStatus,
): ReportStatus | null {
  switch (status) {
    case "pending":
      return "task_created";
    case "scheduled":
    case "assigned":
      return "scheduled";
    case "en_route":
      return "in_progress";
    default:
      return null;
  }
}

export function canChangeTaskPriority(task: Doc<"collectionTasks">) {
  return !isTerminalTaskStatus(task.status);
}

export function canCancelTask(task: Doc<"collectionTasks">) {
  return task.status === "pending" || task.status === "scheduled";
}

export function canMarkTaskUnableToComplete(task: Doc<"collectionTasks">) {
  return isActiveTaskStatus(task.status);
}

export function canMarkTaskCollected(task: Doc<"collectionTasks">) {
  return task.status === "en_route";
}
