"use client";

import { useConvexAuth, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Play,
  Plus,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  ContentCardSkeleton,
  SummaryCardSkeleton,
} from "@/components/dashboard/loading-skeleton";
import { PageHeader } from "@/components/dashboard/page-header";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";

import { ActiveRoutePanel } from "./active-route-panel";
import { ReoptimisationCandidates } from "./reoptimisation-candidates";
import { ReoptimisationPreview } from "./reoptimisation-preview";
import { RouteBuilder } from "./route-builder";
import { RouteDetailPanel } from "./route-detail-panel";
import { ROUTE_STATUSES, type RouteStatusFilter } from "./route-types";
import { RoutesTable } from "./routes-table";

export function RoutesPage() {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const params = useSearchParams();
  const selectedId = params.get("selected");
  const rawStatus = params.get("status");
  const candidateId = params.get("candidate");

  const status = ROUTE_STATUSES.includes(rawStatus as RouteStatusFilter)
    ? (rawStatus as RouteStatusFilter)
    : "all";

  const routes = useQuery(
    api.routeManagement.listRoutes,
    authLoading || !isAuthenticated ? "skip" : {},
  );
  const detail = useQuery(
    api.routeManagement.getRouteDetail,
    authLoading || !isAuthenticated || selectedId === null
      ? "skip"
      : { routeId: selectedId },
  );

  const activeOperations = useQuery(
    api.routeManagement.getActiveRouteOperations,
    authLoading || !isAuthenticated ? "skip" : {},
  );
  const [showBuilder, setShowBuilder] = useState(false);
  const [reviewCandidateId, setReviewCandidateId] = useState<string | null>(null);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([key, value]) =>
      value === null ? next.delete(key) : next.set(key, value),
    );
    const query = next.toString();
    window.history.pushState(
      null,
      "",
      `/dashboard/routes${query ? `?${query}` : ""}`,
    );
  };

  const onRouteCreated = (routeId: string) => {
    setShowBuilder(false);
    update({ selected: routeId, status: null });
  };

  if (authLoading) return <RoutesSkeleton />;
  if (!isAuthenticated)
    return (
      <div className="border-border flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
        <AlertTriangle className="text-muted-foreground size-8" />
        <p className="font-medium">Session verification failed</p>
        <p className="text-muted-foreground text-sm">
          Please sign in again and retry.
        </p>
      </div>
    );
  if (routes === undefined) return <RoutesSkeleton />;

  const activeRoute = activeOperations ?? null;
  const selectedCandidate = activeRoute?.candidates.find(
    (candidate) => candidate.id === (reviewCandidateId ?? candidateId),
  );

  const filtered = routes.filter(
    (r) => status === "all" || r.status === status,
  );

  const summary = {
    total: routes.length,
    proposed: routes.filter((r) => r.status === "proposed").length,
    assigned: routes.filter((r) => r.status === "assigned").length,
    active: routes.filter((r) => r.status === "active").length,
    completed: routes.filter((r) => r.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Routes"
        description="Generate, assign, and manage collection route proposals for the Bariga pilot."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SummaryCard
          label="Total routes"
          value={summary.total}
          icon={ClipboardList}
          href="/dashboard/routes"
        />
        <SummaryCard
          label="Proposed"
          value={summary.proposed}
          icon={Plus}
          href="/dashboard/routes?status=proposed"
        />
        <SummaryCard
          label="Assigned"
          value={summary.assigned}
          icon={ClipboardList}
          href="/dashboard/routes?status=assigned"
        />
        <SummaryCard
          label="Active"
          value={summary.active}
          icon={Play}
          href="/dashboard/routes?status=active"
        />
        <SummaryCard
          label="Completed"
          value={summary.completed}
          icon={CheckCircle2}
          href="/dashboard/routes?status=completed"
        />
      </div>

      {activeRoute && (
        <div className="space-y-4">
          <ActiveRoutePanel data={activeRoute} />
          <ReoptimisationCandidates
            candidates={activeRoute.candidates}
            onReview={(candidate) => setReviewCandidateId(candidate.id)}
          />
          {selectedCandidate && (
            <ReoptimisationPreview
              route={activeRoute}
              candidate={selectedCandidate}
              onClose={() => {
                setReviewCandidateId(null);
                if (candidateId) update({ candidate: null });
              }}
            />
          )}
        </div>
      )}

      {showBuilder ? (
        <RouteBuilder onCreated={onRouteCreated} />
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium"
            onClick={() => setShowBuilder(true)}
          >
            <Plus className="size-4" />
            New route
          </button>
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <label className="text-sm">
              Status
              <select
                className="bg-background mt-1 block w-44 rounded border p-2"
                value={status}
                onChange={(event) =>
                  update({ status: event.target.value === "all" ? null : event.target.value })
                }
              >
                <option value="all">All</option>
                <option value="proposed">Proposed</option>
                <option value="assigned">Assigned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            {status !== "all" && (
              <button
                type="button"
                className="text-sm underline-offset-2 hover:underline"
                onClick={() => update({ status: null })}
              >
                Clear filter
              </button>
            )}
          </div>
          <RoutesTable
            routes={filtered}
            hasRoutes={routes.length > 0}
            selectedId={selectedId}
            onSelect={(id) => update({ selected: id })}
          />
        </CardContent>
      </Card>

      {selectedId !== null && detail === undefined && (
        <ContentCardSkeleton rows={10} titleWidth="w-40" />
      )}
      {selectedId !== null && detail === null && (
        <div className="border-border rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="font-medium">Route not found</p>
          <button
            className="mt-2 text-sm underline"
            onClick={() => update({ selected: null })}
          >
            Return to route list
          </button>
        </div>
      )}
      {detail !== undefined && detail !== null && (
        <RouteDetailPanel key={detail.route.id} detail={detail} />
      )}
    </div>
  );
}

function RoutesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="bg-muted h-7 w-36 animate-pulse rounded" />
        <div className="bg-muted h-4 w-80 animate-pulse rounded" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <SummaryCardSkeleton key={index} />
        ))}
      </div>
      <ContentCardSkeleton rows={8} />
    </div>
  );
}
