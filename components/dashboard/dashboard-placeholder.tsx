import { PageHeader } from "@/components/dashboard/page-header";

type DashboardPlaceholderProps = {
  title: string;
  description: string;
};

export function DashboardPlaceholder({
  title,
  description,
}: DashboardPlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        {description}
      </div>
    </div>
  );
}
