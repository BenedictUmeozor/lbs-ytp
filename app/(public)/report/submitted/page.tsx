import { ReportSubmittedPage } from "@/components/public-reports/report-submitted-page";

export default async function SubmittedPage({
  searchParams,
}: PageProps<"/report/submitted">) {
  const { reference } = await searchParams;
  return (
    <ReportSubmittedPage
      reference={typeof reference === "string" ? reference : undefined}
    />
  );
}
