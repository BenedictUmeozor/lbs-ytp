"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { AlertTriangle, Map, Recycle, Trash2, Truck, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import {
  ContentCardSkeleton,
  SummaryCardSkeleton,
} from "@/components/dashboard/loading-skeleton";
import { PageHeader } from "@/components/dashboard/page-header";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { LiveOperationsMap } from "./live-operations-map";
import { OperationsMapDetailPanel } from "./operations-map-detail-panel";
import { OperationsMapLegend } from "./operations-map-legend";
import { OperationsMapRoutePanel } from "./operations-map-route-panel";
import type {
  MapFilter,
  OperationsMapData,
  SelectedEntity,
} from "./operations-map-types";

const filters: { id: MapFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "bins", label: "Smart Bins" },
  { id: "reports", label: "Citizen Reports" },
  { id: "trucks", label: "Trucks" },
  { id: "critical", label: "Critical Only" },
  { id: "route", label: "Active Route Only" },
];
function selectionMatchesFilter(
  filter: MapFilter,
  selection: SelectedEntity,
  data: OperationsMapData,
) {
  if (filter === "all") return true;
  if (filter === "bins") return selection.type === "bin";
  if (filter === "reports") return selection.type === "report";
  if (filter === "trucks") return selection.type === "truck";
  if (filter === "critical")
    return (
      (selection.type === "bin" &&
        data.bins.find((item) => item.id === selection.id)?.status ===
          "critical") ||
      (selection.type === "report" &&
        data.reports.find((item) => item.id === selection.id)?.priority ===
          "critical")
    );
  return (
    (selection.type === "truck" &&
      selection.id === data.activeRoute?.truckId) ||
    (selection.type === "routeStop" &&
      data.activeRoute?.stops.some((item) => item.id === selection.id))
  );
}
export function OperationsMapPage() {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const searchParams = useSearchParams();
  const requestedType = searchParams.get("type");
  const requestedId = searchParams.get("selected");
  const handledRequestedSelection = useRef<string | null>(null);
  const data = useQuery(
    api.operationsMap.getData,
    authLoading || !isAuthenticated ? "skip" : {},
  );
  const [filter, setFilter] = useState<MapFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedEntity | null>(null);
  const [focusRequest, setFocusRequest] = useState<{
    coordinates: [number, number];
    key: string;
  } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const allRecords = useMemo(
    () =>
      data === undefined
        ? []
        : [
            ...data.bins.map((item) => ({
              type: "bin" as const,
              item,
              text: `${item.displayId} ${item.name} ${item.address}`,
            })),
            ...data.reports.map((item) => ({
              type: "report" as const,
              item,
              text: `${item.referenceNumber} ${item.landmarkText ?? ""} ${item.summary}`,
            })),
            ...data.trucks.map((item) => ({
              type: "truck" as const,
              item,
              text: `${item.displayId} ${item.driverName}`,
            })),
          ],
    [data],
  );
  const query = search.trim().toLocaleLowerCase();
  const results =
    query === ""
      ? []
      : allRecords.filter((record) =>
          record.text.toLocaleLowerCase().includes(query),
        );
  const select = useCallback(
    (next: SelectedEntity, revealInAll = false) => {
      if (revealInAll) setFilter("all");
      setSelected(next);
      setSearchOpen(false);
      const record =
        next.type === "bin"
          ? data?.bins.find((item) => item.id === next.id)
          : next.type === "report"
            ? data?.reports.find((item) => item.id === next.id)
            : next.type === "truck"
              ? data?.trucks.find((item) => item.id === next.id)
              : data?.activeRoute?.stops.find((item) => item.id === next.id);
      if (record)
        setFocusRequest({
          coordinates: [record.latitude, record.longitude],
          key: crypto.randomUUID(),
        });
    },
    [data],
  );
  useEffect(() => {
    if (
      data === undefined ||
      requestedType !== "bin" ||
      requestedId === null ||
      handledRequestedSelection.current === `${requestedType}:${requestedId}`
    )
      return;
    const bin = data.bins.find((item) => item.id === requestedId);
    if (bin === undefined) return;
    handledRequestedSelection.current = `${requestedType}:${requestedId}`;
    const timeout = window.setTimeout(
      () => select({ type: "bin", id: bin.id }, true),
      0,
    );
    return () => window.clearTimeout(timeout);
  }, [data, requestedId, requestedType, select]);
  const selectedStillExists =
    selected !== null &&
    data !== undefined &&
    (selected.type === "bin"
      ? data.bins.some((item) => item.id === selected.id)
      : selected.type === "report"
        ? data.reports.some((item) => item.id === selected.id)
        : selected.type === "truck"
          ? data.trucks.some((item) => item.id === selected.id)
          : data.activeRoute?.stops.some((item) => item.id === selected.id));
  useEffect(() => {
    if (selected !== null && data !== undefined && !selectedStillExists) {
      const timeout = window.setTimeout(() => setSelected(null));
      return () => window.clearTimeout(timeout);
    }
  }, [data, selected, selectedStillExists]);
  if (authLoading) return <MapSkeleton />;
  if (!isAuthenticated)
    return (
      <EmptyState
        title="Session verification failed"
        description="Your dashboard session could not be verified. Please sign in again and retry."
        icon={AlertTriangle}
      />
    );
  if (data === undefined) return <MapSkeleton />;
  const currentSelection = selectedStillExists ? selected : null;
  const visibleSelection =
    currentSelection !== null &&
    selectionMatchesFilter(filter, currentSelection, data)
      ? currentSelection
      : null;
  const changeFilter = (nextFilter: MapFilter) => {
    setFilter(nextFilter);
    if (
      currentSelection !== null &&
      !selectionMatchesFilter(nextFilter, currentSelection, data)
    )
      setSelected(null);
  };
  const matching = (text: string) =>
    query === "" || text.toLocaleLowerCase().includes(query);
  const base = {
    bins: data.bins.filter((item) =>
      matching(`${item.displayId} ${item.name} ${item.address}`),
    ),
    reports: data.reports.filter((item) =>
      matching(
        `${item.referenceNumber} ${item.landmarkText ?? ""} ${item.summary}`,
      ),
    ),
    trucks: data.trucks.filter((item) =>
      matching(`${item.displayId} ${item.driverName}`),
    ),
    routeStops: data.activeRoute?.stops ?? [],
  };
  const visible =
    filter === "bins"
      ? {
          ...base,
          reports: [],
          trucks: [],
          routeStops: [],
          depot: false,
          route: false,
        }
      : filter === "reports"
        ? {
            ...base,
            bins: [],
            trucks: [],
            routeStops: [],
            depot: false,
            route: false,
          }
        : filter === "trucks"
          ? {
              ...base,
              bins: [],
              reports: [],
              routeStops: [],
              depot: false,
              route: false,
            }
          : filter === "critical"
            ? {
                ...base,
                bins: base.bins.filter((item) => item.status === "critical"),
                reports: base.reports.filter(
                  (item) => item.priority === "critical",
                ),
                trucks: [],
                routeStops: [],
                depot: false,
                route: false,
              }
            : filter === "route"
              ? {
                  bins: [],
                  reports: [],
                  trucks: data.activeRoute
                    ? data.trucks.filter(
                        (item) => item.id === data.activeRoute!.truckId,
                      )
                    : [],
                  routeStops: data.activeRoute?.stops ?? [],
                  depot: true,
                  route: true,
                }
              : { ...base, depot: true, route: true };
  const hasRecords =
    visible.bins.length +
      visible.reports.length +
      visible.trucks.length +
      visible.routeStops.length >
    0;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Operations Map"
        description="Real-time bins, citizen reports, fleet and active-route operations for the Bariga pilot."
        action={
          <div className="flex gap-2">
            <Badge variant="secondary">Bariga pilot</Badge>
            <Badge variant="outline">Proof of concept</Badge>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SummaryCard
          label="Total Bins"
          value={data.summary.totalBins}
          icon={Trash2}
          href="/dashboard/bins"
        />
        <SummaryCard
          label="Critical Bins"
          value={data.summary.criticalBins}
          icon={AlertTriangle}
          href="/dashboard/bins?status=critical"
          emphasis="critical"
        />
        <SummaryCard
          label="Open Reports"
          value={data.summary.openReports}
          icon={Map}
          href="/dashboard/reports"
        />
        <SummaryCard
          label="Active Trucks"
          value={data.summary.activeTrucks}
          icon={Truck}
          href="/dashboard/fleet"
        />
        <SummaryCard
          label="Collections Today"
          value={data.summary.collectionsCompletedToday}
          icon={Recycle}
          href="/dashboard/tasks"
        />
      </div>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="relative">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && results[0]) {
                  event.preventDefault();
                  select(
                    {
                      type: results[0].type,
                      id: results[0].item.id,
                    } as SelectedEntity,
                    true,
                  );
                }
              }}
              placeholder="Search bins, reports or trucks"
              aria-label="Search operational records"
            />
            {searchOpen && query && (
              <div className="bg-popover absolute z-20 mt-1 w-full rounded-lg border p-1 shadow-md">
                {results.length === 0 ? (
                  <p className="text-muted-foreground p-3 text-sm">
                    No search results.
                  </p>
                ) : (
                  results.map((result) => (
                    <button
                      key={`${result.type}-${result.item.id}`}
                      type="button"
                      className="hover:bg-muted block w-full rounded-md px-3 py-2 text-left text-sm"
                      onClick={() =>
                        select(
                          {
                            type: result.type,
                            id: result.item.id,
                          } as SelectedEntity,
                          true,
                        )
                      }
                    >
                      <span className="text-muted-foreground mr-2 text-xs">
                        {result.type === "bin"
                          ? "Smart Bin"
                          : result.type === "report"
                            ? "Citizen Report"
                            : "Truck"}
                      </span>
                      {result.text}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <Button
                key={item.id}
                variant={filter === item.id ? "default" : "outline"}
                size="sm"
                onClick={() => changeFilter(item.id)}
              >
                {item.label}
              </Button>
            ))}
            {selected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(null)}
              >
                <X /> Clear selection
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {hasRecords ? (
            <LiveOperationsMap
              data={data}
              visible={visible}
              selected={visibleSelection}
              focusRequest={focusRequest}
              viewKey={`${filter}:${query}`}
              onSelect={select}
            />
          ) : (
            <EmptyState
              title="No records for this view"
              description="Try a different filter or clear the search."
              icon={Map}
            />
          )}
          <OperationsMapLegend />
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {visibleSelection ? "Operational details" : "Operational list"}
              </CardTitle>
              <CardDescription>
                {visibleSelection
                  ? "Live details for the selected record."
                  : "Keyboard-accessible alternative to the map."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OperationsMapDetailPanel
                data={data}
                visible={visible}
                selected={visibleSelection}
                onSelect={select}
                onClear={() => setSelected(null)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Active route</CardTitle>
            </CardHeader>
            <CardContent>
              <OperationsMapRoutePanel route={data.activeRoute} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
function MapSkeleton() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-label="Loading live operations map"
    >
      <div className="space-y-2">
        <div className="bg-muted h-7 w-64 animate-pulse rounded" />
        <div className="bg-muted h-4 w-96 animate-pulse rounded" />
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
