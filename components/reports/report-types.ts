import type { FunctionReturnType } from "convex/server";

import type { api } from "@/convex/_generated/api";

export type ReportList = FunctionReturnType<
  typeof api.reportManagement.listReports
>;
export type ReportRow = ReportList[number];
export type ReportDetail = NonNullable<
  FunctionReturnType<typeof api.reportManagement.getReportDetail>
>;

export const REPORT_STATUSES = [
  "all",
  "new",
  "needs_clarification",
  "under_review",
  "scheduled",
  "in_progress",
  "resolved",
  "duplicate",
] as const;
export type ReportStatusFilter = (typeof REPORT_STATUSES)[number];
export const REPORT_CATEGORIES = [
  "all",
  "overflowing_waste",
  "illegal_dumpsite",
  "missed_collection",
  "drainage_blockage",
  "other",
] as const;
export type ReportCategoryFilter = (typeof REPORT_CATEGORIES)[number];
export const PRIORITIES = ["all", "low", "medium", "high", "critical"] as const;
export type PriorityFilter = (typeof PRIORITIES)[number];
export const SOURCES = ["all", "web", "whatsapp"] as const;
export type SourceFilter = (typeof SOURCES)[number];

export function matchesStatusFilter(
  status: string,
  filter: ReportStatusFilter,
) {
  if (filter === "all") return true;
  if (filter === "scheduled")
    return status === "task_created" || status === "scheduled";
  return status === filter;
}
