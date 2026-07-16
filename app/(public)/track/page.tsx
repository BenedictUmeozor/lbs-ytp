import { TrackReportPage } from "@/components/public-reports/track-report-page";

export default async function TrackPage({ searchParams }: PageProps<"/track">) {
  const { reference } = await searchParams;
  return (
    <TrackReportPage
      reference={typeof reference === "string" ? reference : undefined}
    />
  );
}
