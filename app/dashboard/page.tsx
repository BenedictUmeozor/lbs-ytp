"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";

export default function DashboardPage() {
  const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(
    api.users.getCurrentFleetManager,
    isClerkLoaded && isSignedIn && isAuthenticated ? {} : "skip",
  );

  if (!isClerkLoaded) {
    return <DashboardState message="Checking your Clerk session…" />;
  }

  if (!isSignedIn) {
    return <DashboardState message="Redirecting to sign in…" />;
  }

  if (isConvexAuthLoading) {
    return <DashboardState message="Verifying your dashboard access…" />;
  }

  if (!isAuthenticated) {
    return (
      <DashboardState message="Your session could not be verified for dashboard access." />
    );
  }

  if (user === undefined) {
    return <DashboardState message="Loading your fleet-manager profile…" />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <section className="w-full max-w-xl space-y-6 rounded-xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-600">Bariga pilot</p>
            <h1 className="text-2xl font-semibold text-zinc-950">
              Bariga Smart Waste
            </h1>
            <p className="text-sm text-zinc-600">Proof of concept</p>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
        <div className="space-y-1 border-t border-zinc-200 pt-6 text-sm text-zinc-700">
          <p className="font-medium text-zinc-950">{user.name}</p>
          <p>{user.email}</p>
          <p className="capitalize">{user.role.replace("_", " ")}</p>
        </div>
        <p className="text-sm text-zinc-600">
          The operations Overview will be added in Phase 2B.
        </p>
      </section>
    </main>
  );
}

function DashboardState({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <p className="text-sm text-zinc-600" role="status">
        {message}
      </p>
    </main>
  );
}
