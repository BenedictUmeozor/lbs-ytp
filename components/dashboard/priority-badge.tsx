import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Priority = "low" | "medium" | "high" | "critical";

const PRIORITY_CLASSES: Record<Priority, string> = {
  low: "border-transparent bg-muted text-foreground",
  medium:
    "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  high: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  critical:
    "border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low priority",
  medium: "Medium priority",
  high: "High priority",
  critical: "Critical priority",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(PRIORITY_CLASSES[priority], className)}
    >
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
