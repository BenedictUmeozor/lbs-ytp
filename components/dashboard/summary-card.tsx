import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SummaryCardProps = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  href: string;
  helperText?: string;
  emphasis?: "default" | "critical";
};

export function SummaryCard({ label, value, icon: Icon, href, helperText, emphasis = "default" }: SummaryCardProps) {
  const isCritical = emphasis === "critical";

  return (
    <Link
      href={href}
      aria-label={`${label}: ${value}${helperText ? `. ${helperText}` : ""}`}
      className={cn(
        "block rounded-xl outline-none transition focus-visible:ring-3 focus-visible:ring-ring/50",
      )}
    >
      <Card
        className={cn(
          "h-full transition hover:ring-foreground/25",
          isCritical && "bg-destructive/5 ring-destructive/30 hover:ring-destructive/50",
        )}
      >
        <CardContent className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm text-muted-foreground">{label}</p>
            <p className={cn("text-2xl font-semibold text-foreground", isCritical && "text-destructive")}>{value}</p>
            {helperText ? <p className="truncate text-xs text-muted-foreground">{helperText}</p> : null}
          </div>
          <Icon
            className={cn("size-5 shrink-0 text-muted-foreground", isCritical && "text-destructive")}
            aria-hidden="true"
          />
        </CardContent>
      </Card>
    </Link>
  );
}
