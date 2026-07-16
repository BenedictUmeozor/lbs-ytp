import type { FunctionReturnType } from "convex/server";

import type { api } from "@/convex/_generated/api";

export type PublicReport = FunctionReturnType<
  typeof api.reports.getPublicByReference
>;
export type SubmittedReport = FunctionReturnType<
  typeof api.reports.submitWebReport
>;

export const REPORT_CATEGORIES = [
  {
    value: "overflowing_waste",
    label: "Overflowing waste point",
  },
  {
    value: "illegal_dumpsite",
    label: "Illegal dumpsite",
  },
  {
    value: "missed_collection",
    label: "Missed collection",
  },
  {
    value: "drainage_blockage",
    label: "Drainage blockage caused by waste",
  },
  {
    value: "other",
    label: "Other waste issue",
  },
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number]["value"];
