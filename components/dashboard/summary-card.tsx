import type { LucideIcon } from "lucide-react";
import Link from "next/link";

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

export function SummaryCard({
  label,
  value,
  icon: Icon,
  href,
  helperText,
  emphasis = "default",
}: SummaryCardProps) {
  const isCritical = emphasis === "critical";

  return (
    <Link
      href={href}
      aria-label={`${label}: ${value}${helperText ? `. ${helperText}` : ""}`}
      className={cn(
        "focus-visible:ring-ring/50 block rounded-xl transition outline-none focus-visible:ring-3",
      )}
    >
      <Card
        className={cn(
          "hover:ring-foreground/25 h-full transition",
          isCritical &&
            "bg-destructive/5 ring-destructive/30 hover:ring-destructive/50",
        )}
      >
        <CardContent className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-muted-foreground truncate text-sm">{label}</p>
            <p
              className={cn(
                "text-foreground text-2xl font-semibold",
                isCritical && "text-destructive",
              )}
            >
              {value}
            </p>
            {helperText ? (
              <p className="text-muted-foreground truncate text-xs">
                {helperText}
              </p>
            ) : null}
          </div>
          <Icon
            className={cn(
              "text-muted-foreground size-5 shrink-0",
              isCritical && "text-destructive",
            )}
            aria-hidden="true"
          />
        </CardContent>
      </Card>
    </Link>
  );
}
