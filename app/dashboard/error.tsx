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
      <section className="w-full max-w-md space-y-3 rounded-xl bg-card p-8 text-center ring-1 ring-foreground/10">
        <p className="text-sm font-medium text-muted-foreground">
          Bariga pilot
        </p>
        <h1 className="text-xl font-semibold text-foreground">
          Dashboard unavailable
        </h1>
        <p className="text-sm text-muted-foreground">
          The dashboard could not be loaded. Please try again.
        </p>
        <Button onClick={reset}>Try again</Button>
      </section>
    </div>
  );
}
