"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error("Dashboard error", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <section className="bg-card ring-foreground/10 w-full max-w-md space-y-3 rounded-xl p-8 text-center ring-1">
        <p className="text-muted-foreground text-sm font-medium">
          Bariga pilot
        </p>
        <h1 className="text-foreground text-xl font-semibold">
          Dashboard unavailable
        </h1>
        <p className="text-muted-foreground text-sm">
          The dashboard could not be loaded. Please try again.
        </p>
        <Button onClick={reset}>Try again</Button>
      </section>
    </div>
  );
}
