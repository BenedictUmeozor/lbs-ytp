"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Search } from "lucide-react";
import { useState } from "react";
import { PublicReportStatus } from "./public-report-status";
import { reportCategoryLabel } from "./report-category-label";
import type { PublicReport } from "./report-types";

const formatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos",
});

export function TrackReportPage({ reference }: { reference?: string }) {
  const submittedReference = reference?.trim().toUpperCase() ?? "";
  const [input, setInput] = useState(submittedReference);
  const report = useQuery(
    api.reports.getPublicByReference,
    submittedReference ? { referenceNumber: submittedReference } : "skip",
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = input.trim().toUpperCase();
    if (!normalized) return;
    window.location.assign(
      `/track?reference=${encodeURIComponent(normalized)}`,
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-7">
        <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
          Public report tracking
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Track your waste report
        </h1>
        <p className="mt-3 text-stone-600">
          Enter the reference provided after you submitted your report.
        </p>
      </header>
      <form
        onSubmit={submit}
        className="flex gap-2 rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
      >
        <label className="sr-only" htmlFor="reference">
          Report reference
        </label>
        <Input
          id="reference"
          value={input}
          onChange={(event) => setInput(event.target.value.toUpperCase())}
          placeholder="WR-1001"
          className="h-11 border-0 bg-stone-50 text-base"
        />
        <Button
          type="submit"
          className="h-11 bg-emerald-800 hover:bg-emerald-900"
        >
          <Search aria-hidden="true" />{" "}
          <span className="hidden sm:inline">Track</span>
        </Button>
      </form>
      {submittedReference === "" ? <EmptyState /> : null}
      {submittedReference !== "" && report === undefined ? (
        <ResultMessage
          title="Loading report"
          message="Checking the latest public status…"
        />
      ) : null}
      {submittedReference !== "" && report === null ? <NotFound /> : null}
      {report !== undefined && report !== null ? (
        <ReportResult report={report} />
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-600">
      Your report reference is shown after you submit a report. It looks like{" "}
      <strong>WR-1001</strong>.
    </div>
  );
}

function ResultMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="mt-8 rounded-xl border border-stone-200 bg-white p-6 text-center">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-stone-600">{message}</p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mt-8 rounded-xl border border-stone-200 bg-white p-6 text-center">
      <h2 className="text-lg font-semibold">We could not find that report</h2>
      <p className="mt-2 text-sm text-stone-600">
        Check the reference number and try again.
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-5"
        onClick={() => window.location.assign("/track")}
      >
        Clear search
      </Button>
    </div>
  );
}

function ReportResult({ report }: { report: NonNullable<PublicReport> }) {
  return (
    <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-stone-600">Report reference</p>
          <h2 className="text-2xl font-semibold tracking-tight">
            {report.referenceNumber}
          </h2>
        </div>
        <PublicReportStatus status={report.publicStatus} />
      </div>
      <dl className="mt-7 divide-y divide-stone-100 border-y border-stone-100 text-sm">
        <Row label="Issue" value={reportCategoryLabel(report.category)} />
        <Row label="Location" value={report.locationSummary} />
        <Row label="Submitted" value={formatter.format(report.submittedAt)} />
        <Row
          label="Last status update"
          value={formatter.format(report.lastStatusUpdate)}
        />
        {report.resolvedAt ? (
          <Row label="Resolved" value={formatter.format(report.resolvedAt)} />
        ) : null}
      </dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-stone-600">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
