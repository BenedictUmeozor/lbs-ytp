import type { PublicReportStatus, ReportStatus } from "./validators";

export {
  canTransitionTaskStatus,
  reportStatusForTaskStatus,
  TASK_STATUS_TRANSITIONS,
} from "./task_rules";

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
