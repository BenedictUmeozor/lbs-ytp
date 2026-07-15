import type {
  PublicReportStatus,
  ReportStatus,
  TaskStatus,
} from "./validators";

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

export function canTransitionTaskStatus(
  currentStatus: TaskStatus,
  nextStatus: TaskStatus,
): boolean {
  return TASK_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}

export const PUBLIC_REPORT_STATUS_BY_INTERNAL_STATUS: Record<
  ReportStatus,
  PublicReportStatus
> = {
  new: "received",
  needs_clarification: "more_information_required",
  under_review: "under_review",
  task_created: "scheduled_for_collection",
  scheduled: "scheduled_for_collection",
  in_progress: "in_progress",
  resolved: "resolved",
  duplicate: "under_review",
  rejected: "under_review",
};

export function getPublicReportStatus(
  status: ReportStatus,
): PublicReportStatus {
  return PUBLIC_REPORT_STATUS_BY_INTERNAL_STATUS[status];
}
