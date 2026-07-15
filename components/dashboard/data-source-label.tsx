import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DataSource = "real" | "simulated";

export function DataSourceLabel({
  source,
  className,
}: {
  source: DataSource;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        source === "real"
          ? "border-emerald-300 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300"
          : "border-amber-300 text-amber-700 dark:border-amber-500/40 dark:text-amber-300",
        className,
      )}
    >
      {source === "real" ? "Real data" : "Simulated data"}
    </Badge>
  );
}
