"use client";

export default function DashboardError() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <section className="w-full max-w-md space-y-3 rounded-xl bg-card p-8 text-center ring-1 ring-foreground/10">
        <p className="text-sm font-medium text-muted-foreground">Bariga pilot</p>
        <h1 className="text-xl font-semibold text-foreground">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          This account is not approved for fleet-manager dashboard access.
        </p>
      </section>
    </div>
  );
}
