"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { AlertTriangle } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/dashboard/empty-state";
import { ContentCardSkeleton } from "@/components/dashboard/loading-skeleton";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

import { FleetTable } from "./fleet-table";
import { TruckDetailPanel } from "./truck-detail-panel";

export function FleetPage() {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const params = useSearchParams();
  const selectedId = params.get("selected");
  const trucks = useQuery(
    api.fleetManagement.listTrucks,
    authLoading || !isAuthenticated ? "skip" : {},
  );
  const detail = useQuery(
    api.fleetManagement.getTruckDetail,
    authLoading || !isAuthenticated || selectedId === null
      ? "skip"
      : { truckId: selectedId },
  );
  const select = (id: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (id === null) next.delete("selected");
    else next.set("selected", id);
    const query = next.toString();
    window.history.pushState(
      null,
      "",
      `/dashboard/fleet${query ? `?${query}` : ""}`,
    );
  };

  if (authLoading) return <FleetSkeleton />;
  if (!isAuthenticated)
    return (
      <EmptyState
        title="Session verification failed"
        description="Your dashboard session could not be verified. Please sign in again and retry."
        icon={AlertTriangle}
      />
    );
  if (trucks === undefined) return <FleetSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet & Maintenance"
        description="Monitor simulated truck availability, assignments, collection history and prototype vehicle-health information for the Bariga pilot."
      />
      <div className="border-border bg-muted/35 rounded-lg border px-4 py-3 text-sm">
        Truck locations and vehicle-health values are simulated for this
        controlled proof of concept.
      </div>
      <Card>
        <CardContent>
          <FleetTable
            trucks={trucks}
            selectedId={selectedId}
            onSelect={select}
          />
        </CardContent>
      </Card>
      {selectedId !== null && detail === undefined ? (
        <ContentCardSkeleton rows={12} titleWidth="w-56" />
      ) : null}
      {selectedId !== null && detail === null ? (
        <div className="border-border rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="font-medium">Truck not found</p>
          <p className="text-muted-foreground mt-1 text-sm">
            The selected truck is unavailable or the link is invalid.
          </p>
          <button
            className="mt-3 text-sm underline"
            onClick={() => select(null)}
          >
            Return to fleet list
          </button>
        </div>
      ) : null}
      {detail !== undefined && detail !== null ? (
        <TruckDetailPanel
          key={detail.truck.id}
          detail={detail}
          onClose={() => select(null)}
        />
      ) : null}
    </div>
  );
}

function FleetSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading fleet">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <Skeleton className="h-12 w-full" />
      <ContentCardSkeleton rows={5} titleWidth="w-36" />
    </div>
  );
}
