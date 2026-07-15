import { PageHeader } from "@/components/dashboard/page-header";

type DashboardPlaceholderProps = {
  title: string;
  description: string;
};

export function DashboardPlaceholder({ title, description }: DashboardPlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {description}
      </div>
    </div>
  );
}
