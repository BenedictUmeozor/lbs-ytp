import type { PublicReport } from "./report-types";

const STATUS_LABELS: Record<NonNullable<PublicReport>["publicStatus"], string> =
  {
    received: "Received",
    more_information_required: "More information required",
    under_review: "Under review",
    scheduled_for_collection: "Scheduled for collection",
    in_progress: "In progress",
    resolved: "Resolved",
  };

export function PublicReportStatus({
  status,
}: {
  status: NonNullable<PublicReport>["publicStatus"];
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-900/15 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-950">
      <span aria-hidden="true" className="size-2 rounded-full bg-emerald-700" />
      {STATUS_LABELS[status]}
    </span>
  );
}
