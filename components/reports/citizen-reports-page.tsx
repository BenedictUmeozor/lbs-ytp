"use client";

import { useConvexAuth, useQuery } from "convex/react";
import {
  AlertTriangle,
  ClipboardList,
  FileText,
  Flag,
  ThumbsUp,
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

import { ReportDetailPanel } from "./report-detail-panel";
import {
  type PriorityFilter,
  type ReportCategoryFilter,
  type ReportStatusFilter,
  type SourceFilter,
  PRIORITIES,
  REPORT_CATEGORIES,
  REPORT_STATUSES,
  SOURCES,
  matchesStatusFilter,
} from "./report-types";
import { ReportsTable } from "./reports-table";

function statusLabel(status: string) {
  if (status === "duplicate") return "Duplicates";
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function CitizenReportsPage() {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const params = useSearchParams();

  const selectedId = params.get("selected");
  const rawStatus = params.get("status");
  const rawCategory = params.get("category");
  const rawPriority = params.get("priority");
  const rawSource = params.get("source");

  const statusFilter: ReportStatusFilter = REPORT_STATUSES.includes(
    rawStatus as ReportStatusFilter,
  )
    ? (rawStatus as ReportStatusFilter)
    : "all";
  const categoryFilter: ReportCategoryFilter = REPORT_CATEGORIES.includes(
    rawCategory as ReportCategoryFilter,
  )
    ? (rawCategory as ReportCategoryFilter)
    : "all";
  const priorityFilter: PriorityFilter = PRIORITIES.includes(
    rawPriority as PriorityFilter,
  )
    ? (rawPriority as PriorityFilter)
    : "all";
  const sourceFilter: SourceFilter = SOURCES.includes(rawSource as SourceFilter)
    ? (rawSource as SourceFilter)
    : "all";

  const reports = useQuery(
    api.reportManagement.listReports,
    authLoading || !isAuthenticated ? "skip" : {},
  );
  const detail = useQuery(
    api.reportManagement.getReportDetail,
    authLoading || !isAuthenticated || selectedId === null
      ? "skip"
      : { reportId: selectedId },
  );

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([key, value]) =>
      value === null ? next.delete(key) : next.set(key, value),
    );
    window.history.pushState(null, "", `/dashboard/reports?${next.toString()}`);
  };

  if (authLoading) return <ReportsSkeleton />;
  if (!isAuthenticated)
    return (
      <div className="border-border flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
        <AlertTriangle
          className="text-muted-foreground size-8"
          aria-hidden="true"
        />
        <p className="text-foreground font-medium">
          Session verification failed
        </p>
        <p className="text-muted-foreground max-w-sm text-sm">
          Your dashboard session could not be verified. Please sign in again and
          retry.
        </p>
      </div>
    );
  if (reports === undefined) return <ReportsSkeleton />;

  const filtered = reports.filter((r) => {
    if (!matchesStatusFilter(r.status, statusFilter)) return false;
    if (categoryFilter !== "all" && (r.category ?? "") !== categoryFilter)
      return false;
    if (priorityFilter !== "all" && (r.priority ?? "") !== priorityFilter)
      return false;
    if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
    return true;
  });

  const summary = {
    total: reports.length,
    needsReview: reports.filter(
      (r) => r.status === "new" || r.status === "needs_clarification",
    ).length,
    activeTasks: reports.filter(
      (r) =>
        r.status === "task_created" ||
        r.status === "scheduled" ||
        r.status === "in_progress",
    ).length,
    resolved: reports.filter((r) => r.status === "resolved").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Citizen Reports"
        description="Review, triage, and manage citizen-submitted reports from the Bariga pilot."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Total reports"
          value={summary.total}
          icon={FileText}
          href="/dashboard/reports"
        />
        <SummaryCard
          label="Needs review"
          value={summary.needsReview}
          icon={Flag}
          href="/dashboard/reports?status=new"
          emphasis={summary.needsReview > 0 ? "critical" : "default"}
        />
        <SummaryCard
          label="Active tasks"
          value={summary.activeTasks}
          icon={ClipboardList}
          href="/dashboard/reports?status=in_progress"
        />
        <SummaryCard
          label="Resolved"
          value={summary.resolved}
          icon={ThumbsUp}
          href="/dashboard/reports?status=resolved"
        />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-4">
            {/* Status filter */}
            <label className="text-sm">
              Status
              <select
                value={statusFilter}
                onChange={(e) =>
                  update({
                    status: e.target.value === "all" ? null : e.target.value,
                  })
                }
                className="bg-background mt-1 block w-44 rounded border p-2"
              >
                {REPORT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "all"
                      ? "All"
                      : s === "scheduled"
                        ? "Scheduled"
                        : statusLabel(s)}
                  </option>
                ))}
              </select>
            </label>

            {/* Category filter */}
            <label className="text-sm">
              Category
              <select
                value={categoryFilter}
                onChange={(e) =>
                  update({
                    category: e.target.value === "all" ? null : e.target.value,
                  })
                }
                className="bg-background mt-1 block w-44 rounded border p-2"
              >
                {REPORT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "All categories" : statusLabel(c)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Priority
              <select
                value={priorityFilter}
                onChange={(e) =>
                  update({
                    priority: e.target.value === "all" ? null : e.target.value,
                  })
                }
                className="bg-background mt-1 block w-40 rounded border p-2"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p === "all"
                      ? "All priorities"
                      : p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Source
              <select
                value={sourceFilter}
                onChange={(e) =>
                  update({
                    source: e.target.value === "all" ? null : e.target.value,
                  })
                }
                className="bg-background mt-1 block w-40 rounded border p-2"
              >
                <option value="all">All</option>
                <option value="web">Web</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </label>
            {(statusFilter !== "all" ||
              categoryFilter !== "all" ||
              priorityFilter !== "all" ||
              sourceFilter !== "all") && (
              <button
                type="button"
                className="text-sm underline-offset-2 hover:underline"
                onClick={() =>
                  update({
                    status: null,
                    category: null,
                    priority: null,
                    source: null,
                  })
                }
              >
                Clear filters
              </button>
            )}
          </div>

          <ReportsTable
            reports={filtered}
            hasReports={reports.length > 0}
            selectedId={selectedId}
            onSelect={(id) => update({ selected: id })}
          />
        </CardContent>
      </Card>

      {selectedId !== null && detail === undefined && (
        <ContentCardSkeleton rows={10} titleWidth="w-56" />
      )}
      {selectedId !== null && detail === null && (
        <div className="border-border flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
          <AlertTriangle
            className="text-muted-foreground size-8"
            aria-hidden="true"
          />
          <p className="text-foreground font-medium">Report not found</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            The selected report is unavailable or the link is invalid.
          </p>
          <a
            href="/dashboard/reports"
            className="text-sm underline-offset-2 hover:underline"
          >
            Return to report list
          </a>
        </div>
      )}
      {detail !== undefined && detail !== null && (
        <ReportDetailPanel key={detail.report.id} detail={detail} />
      )}
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="bg-muted h-7 w-48 animate-pulse rounded" />
        <div className="bg-muted h-4 w-96 animate-pulse rounded" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SummaryCardSkeleton key={index} />
        ))}
      </div>
      <ContentCardSkeleton rows={8} />
    </div>
  );
}
