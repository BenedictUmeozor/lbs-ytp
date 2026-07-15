"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/dashboard/empty-state";
import {
  ContentCardSkeleton,
  SummaryCardSkeleton,
} from "@/components/dashboard/loading-skeleton";
import { PageHeader } from "@/components/dashboard/page-header";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";

import { BinDetailPanel } from "./bin-detail-panel";
import type { BinFilter } from "./bin-types";
import { SmartBinsTable } from "./smart-bins-table";

const filters: { id: BinFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "normal", label: "Normal" },
  { id: "approaching_full", label: "Approaching full" },
  { id: "collection_required", label: "Collection required" },
  { id: "critical", label: "Critical" },
  { id: "offline", label: "Offline" },
  { id: "real", label: "Real hardware" },
  { id: "simulated", label: "Simulated" },
];
export function SmartBinsPage() {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const params = useSearchParams();
  const selectedId = params.get("selected");
  const requestedFilter = params.get("status");
  const filter: BinFilter = filters.some((item) => item.id === requestedFilter)
    ? (requestedFilter as BinFilter)
    : "all";
  const bins = useQuery(
    api.bins.list,
    authLoading || !isAuthenticated ? "skip" : {},
  );
  const detail = useQuery(
    api.bins.getDetail,
    authLoading || !isAuthenticated || selectedId === null
      ? "skip"
      : { binId: selectedId as never },
  );
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([key, value]) =>
      value === null ? next.delete(key) : next.set(key, value),
    );
    window.history.pushState(null, "", `/dashboard/bins?${next.toString()}`);
  };
  if (authLoading || bins === undefined) return <BinsSkeleton />;
  if (!isAuthenticated)
    return (
      <EmptyState
        title="Session verification failed"
        description="Your dashboard session could not be verified. Please sign in again and retry."
        icon={AlertTriangle}
      />
    );
  const summary = {
    total: bins.length,
    collection: bins.filter((bin) => bin.status === "collection_required")
      .length,
    critical: bins.filter((bin) => bin.status === "critical").length,
    offline: bins.filter(
      (bin) => bin.source === "real" && bin.deviceStatus === "offline",
    ).length,
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Bins"
        description="Live monitoring for the Bariga pilot. Real hardware and simulated bins are shown together for this proof of concept."
        action={
          <div className="flex gap-2">
            <Badge variant="secondary">Bariga pilot</Badge>
            <Badge variant="outline">Proof of concept</Badge>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Total bins" value={summary.total} icon={Trash2} />
        <SummaryCard
          label="Collection required"
          value={summary.collection}
          icon={Trash2}
        />
        <SummaryCard
          label="Critical"
          value={summary.critical}
          icon={AlertTriangle}
          emphasis="critical"
        />
        <SummaryCard
          label="Offline real devices"
          value={summary.offline}
          icon={AlertTriangle}
        />
      </div>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={filter === item.id ? "default" : "outline"}
                onClick={() =>
                  update({ status: item.id === "all" ? null : item.id })
                }
              >
                {item.label}
              </Button>
            ))}
          </div>
          <SmartBinsTable
            bins={bins}
            filter={filter}
            selectedId={selectedId}
            onSelect={(id) => update({ selected: id })}
          />
        </CardContent>
      </Card>
      {selectedId !== null && detail === undefined && (
        <ContentCardSkeleton rows={8} />
      )}
      {selectedId !== null && detail === null && (
        <EmptyState
          title="Smart bin not found"
          description="The selected bin is unavailable or the link is invalid."
          icon={AlertTriangle}
        />
      )}
      {detail !== undefined && detail !== null && (
        <BinDetailPanel detail={detail} />
      )}
    </div>
  );
}
function BinsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="bg-muted h-7 w-48 animate-pulse rounded" />
        <div className="bg-muted h-4 w-96 animate-pulse rounded" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SummaryCardSkeleton key={index} />
        ))}
      </div>
      <ContentCardSkeleton rows={8} />
    </div>
  );
}
