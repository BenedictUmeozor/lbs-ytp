"use client";

import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { StatusBadge } from "@/components/dashboard/status-badge";

import type { ReportList } from "./report-types";

const time = (value: number) =>
  new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
const label = (value?: string) =>
  value === undefined
    ? "—"
    : value
        .split("_")
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" ");

export function ReportsTable({
  reports,
  selectedId,
  onSelect,
  hasReports,
}: {
  reports: ReportList;
  selectedId: string | null;
  onSelect: (id: string) => void;
  hasReports: boolean;
}) {
  if (reports.length === 0)
    return (
      <p className="text-muted-foreground p-6 text-sm">
        {hasReports
          ? "No reports match these filters."
          : "No citizen reports exist."}
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead className="bg-muted text-muted-foreground text-xs">
          <tr>
            {[
              "Reference",
              "Category",
              "Priority",
              "Location",
              "Source",
              "Submitted",
              "Status",
              "AI status",
              "Linked task",
            ].map((title) => (
              <th key={title} className="p-3 font-medium">
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr
              key={report.id}
              className={
                selectedId === report.id ? "bg-muted" : "hover:bg-muted/60"
              }
            >
              <td className="p-3">
                <button
                  type="button"
                  className="font-medium underline-offset-4 hover:underline focus-visible:outline-2"
                  onClick={() => onSelect(report.id)}
                >
                  {report.referenceNumber}
                </button>
              </td>
              <td className="p-3">{label(report.category)}</td>
              <td className="p-3">
                {report.priority ? (
                  <PriorityBadge priority={report.priority} />
                ) : (
                  "—"
                )}
              </td>
              <td
                className="max-w-56 truncate p-3"
                title={report.locationSummary}
              >
                {report.locationSummary}
              </td>
              <td className="p-3">{label(report.source)}</td>
              <td className="p-3 whitespace-nowrap">
                {time(report.submittedAt)}
              </td>
              <td className="p-3">
                <StatusBadge status={report.status} />
              </td>
              <td className="p-3">
                {report.aiStatus === "fallback" ? (
                  "Rules fallback"
                ) : (
                  <StatusBadge status={report.aiStatus} />
                )}
              </td>
              <td className="p-3">
                {report.linkedTask
                  ? `${report.linkedTask.displayId} · ${label(report.linkedTask.status)}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
