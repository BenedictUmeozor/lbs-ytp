import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "positive" | "attention" | "critical";

const STATUS_TONE: Record<string, Tone> = {
  // bins
  normal: "positive",
  approaching_full: "attention",
  collection_required: "attention",
  critical: "critical",
  awaiting_confirmation: "neutral",
  // devices
  online: "positive",
  offline: "critical",
  inactive: "neutral",
  // citizen reports
  new: "neutral",
  needs_clarification: "attention",
  under_review: "neutral",
  task_created: "neutral",
  in_progress: "attention",
  resolved: "positive",
  duplicate: "neutral",
  rejected: "neutral",
  // collection tasks / route stops
  pending: "neutral",
  scheduled: "neutral",
  assigned: "neutral",
  en_route: "attention",
  collected: "positive",
  unable_to_complete: "critical",
  cancelled: "neutral",
  completed: "positive",
  current: "attention",
  // trucks
  available: "positive",
  on_route: "attention",
  at_collection_point: "attention",
  returning: "attention",
  maintenance: "critical",
  // routes
  proposed: "neutral",
  active: "attention",
  // maintenance risk
  medium: "attention",
  high: "critical",
  // notification severity
  warning: "attention",
};

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border-transparent bg-muted text-foreground",
  positive: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  attention: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  critical: "border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
};

export function humanizeStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = STATUS_TONE[status] ?? "neutral";

  return (
    <Badge variant="outline" className={cn(TONE_CLASSES[tone], className)}>
      {humanizeStatus(status)}
    </Badge>
  );
}
