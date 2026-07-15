"use client";

export default function DashboardError() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <section className="w-full max-w-md space-y-3 rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-zinc-200">
        <p className="text-sm font-medium text-zinc-600">Bariga pilot</p>
        <h1 className="text-xl font-semibold text-zinc-950">Access denied</h1>
        <p className="text-sm text-zinc-600">
          This account is not approved for fleet-manager dashboard access.
        </p>
      </section>
    </main>
  );
}
