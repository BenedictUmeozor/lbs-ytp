"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { CheckCircle2, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PublicReportStatus } from "./public-report-status";

const formatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos",
});

export function ReportSubmittedPage({ reference }: { reference?: string }) {
  const normalizedReference = reference?.trim().toUpperCase() ?? "";
  const report = useQuery(
    api.reports.getPublicByReference,
    normalizedReference ? { referenceNumber: normalizedReference } : "skip",
  );
  const [copyMessage, setCopyMessage] = useState("");

  async function copyReference() {
    if (!normalizedReference) return;
    try {
      await navigator.clipboard.writeText(normalizedReference);
      setCopyMessage("Reference copied.");
    } catch {
      setCopyMessage(
        "Could not copy automatically. Please select and copy the reference.",
      );
    }
  }

  if (!normalizedReference) {
    return (
      <PageMessage
        title="Reference missing"
        message="Submit a report to receive a reference number, then return here to track it."
      />
    );
  }
  if (report === undefined) {
    return (
      <PageMessage
        title="Loading your report"
        message="Checking your submitted report…"
      />
    );
  }
  if (report === null) {
    return (
      <PageMessage
        title="Report not found"
        message="We could not find that report reference. Check the reference and try tracking it again."
      />
    );
  }

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-emerald-950/10 bg-white p-6 shadow-sm sm:p-8">
      <CheckCircle2 className="size-12 text-emerald-700" aria-hidden="true" />
      <p className="mt-5 text-sm font-semibold tracking-wide text-emerald-800 uppercase">
        Report received
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">
        Thank you for reporting this.
      </h1>
      <p className="mt-3 text-stone-600">
        Keep your reference number to check the public status later.
      </p>
      <div className="mt-7 rounded-xl bg-stone-100 p-4">
        <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
          Your reference
        </p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <strong className="text-2xl tracking-wide">
            {report.referenceNumber}
          </strong>
          <Button type="button" variant="outline" onClick={copyReference}>
            <Copy aria-hidden="true" /> Copy
          </Button>
        </div>
        <p aria-live="polite" className="mt-2 text-sm text-stone-600">
          {copyMessage}
        </p>
      </div>
      <dl className="mt-6 space-y-4 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-stone-600">Submitted</dt>
          <dd>{formatter.format(report.submittedAt)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-stone-600">Current status</dt>
          <dd>
            <PublicReportStatus status={report.publicStatus} />
          </dd>
        </div>
      </dl>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Button asChild className="h-11 bg-emerald-800 hover:bg-emerald-900">
          <Link
            href={`/track?reference=${encodeURIComponent(report.referenceNumber)}`}
          >
            Track report
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11">
          <Link href="/report">Submit another report</Link>
        </Button>
      </div>
    </section>
  );
}

function PageMessage({ title, message }: { title: string; message: string }) {
  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-stone-600">{message}</p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/track">Track a report</Link>
      </Button>
    </section>
  );
}
