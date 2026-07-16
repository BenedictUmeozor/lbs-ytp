import { SubmitReportForm } from "@/components/public-reports/submit-report-form";

export default function ReportPage() {
  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-8">
        <p className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
          Bariga resident reporting
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          Report a waste issue
        </h1>
        <p className="mt-3 text-stone-600">
          Help us identify waste-management issues in Bariga. This proof of
          concept is not for emergencies.
        </p>
      </header>
      <div className="rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-sm sm:p-7">
        <SubmitReportForm />
      </div>
    </div>
  );
}
