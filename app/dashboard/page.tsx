"use client";

import { useConvexAuth, useQuery } from "convex/react";
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  ClipboardList,
  Map,
  MessageSquareWarning,
  Recycle,
  Route as RouteIcon,
  Trash2,
  Truck,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { DataSourceLabel } from "@/components/dashboard/data-source-label";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  ContentCardSkeleton,
  SummaryCardSkeleton,
} from "@/components/dashboard/loading-skeleton";
import type { OverviewData } from "@/components/dashboard/overview-types";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  StatusBadge,
  humanizeStatus,
} from "@/components/dashboard/status-badge";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { OperationsMapLegend } from "@/components/maps/operations-map-legend";
import { OperationsMapPreview } from "@/components/maps/operations-map-preview";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

const dateTimeFormatter = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDateTime(timestamp: number): string {
  return dateTimeFormatter.format(new Date(timestamp));
}

export default function DashboardOverviewPage() {
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const data = useQuery(
    api.dashboard.getOverviewData,
    isConvexAuthLoading || !isAuthenticated ? "skip" : {},
  );

  if (isConvexAuthLoading) {
    return <OverviewSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Session verification failed"
        description="Your dashboard session could not be verified. Please sign in again and retry."
        icon={AlertTriangle}
      />
    );
  }

  if (data === undefined) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Overview"
        description="Real-time summary of smart bins, citizen reports, collection tasks and the simulated Bariga fleet."
        action={
          <div className="flex gap-2">
            <Badge variant="secondary">Bariga pilot</Badge>
            <Badge variant="outline">Proof of concept</Badge>
          </div>
        }
      />

      <SummaryCardsGrid summary={data.summary} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Operations map</CardTitle>
            <CardDescription>
              Bin, truck, depot and citizen-report positions across the Bariga
              pilot area.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <OperationsMapCard map={data.map} />
          </CardContent>
        </Card>

        <CriticalAlertsCard alerts={data.criticalAlerts} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentActivityCard activity={data.recentActivity} />
        <CollectionProgressCard progress={data.collectionProgress} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ActiveRouteCard route={data.activeRoute} />
        <VehicleHealthCard trucks={data.vehicleHealth} />
      </div>
    </div>
  );
}

function SummaryCardsGrid({ summary }: { summary: OverviewData["summary"] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <SummaryCard
        label="Total monitored bins"
        value={summary.totalMonitoredBins}
        icon={Trash2}
        href="/dashboard/bins"
      />
      <SummaryCard
        label="Bins requiring collection"
        value={summary.binsRequiringCollection}
        icon={AlertTriangle}
        href="/dashboard/bins?status=collection_required"
        emphasis="critical"
      />
      <SummaryCard
        label="Critical bins"
        value={summary.criticalBins}
        icon={AlertOctagon}
        href="/dashboard/bins?status=critical"
        emphasis="critical"
      />
      <SummaryCard
        label="Open citizen reports"
        value={summary.openCitizenReports}
        icon={MessageSquareWarning}
        href="/dashboard/reports?status=open"
      />
      <SummaryCard
        label="Pending collection tasks"
        value={summary.pendingCollectionTasks}
        icon={ClipboardList}
        href="/dashboard/tasks?status=pending"
      />
      <SummaryCard
        label="Active trucks"
        value={summary.activeTrucks}
        icon={Truck}
        href="/dashboard/fleet?status=active"
      />
      <SummaryCard
        label="Collections completed today"
        value={summary.collectionsCompletedToday}
        icon={Recycle}
        href="/dashboard/tasks?status=collected_today"
      />
      <SummaryCard
        label="Trucks with maintenance alerts"
        value={summary.trucksWithMaintenanceAlerts}
        icon={Wrench}
        href="/dashboard/fleet?view=maintenance_alerts"
        emphasis="critical"
      />
    </div>
  );
}

function OperationsMapCard({ map }: { map: OverviewData["map"] }) {
  const hasOperationalData =
    map.depot !== null ||
    map.bins.length > 0 ||
    map.reports.length > 0 ||
    map.trucks.length > 0 ||
    map.activeRoutePath.length > 0;

  if (!hasOperationalData) {
    return (
      <EmptyState
        title="No operational map data"
        description="Map locations will appear when depot, bin, report, truck or active-route data is available."
        icon={Map}
        action={{ label: "Open full map", href: "/dashboard/map" }}
      />
    );
  }

  return (
    <>
      <OperationsMapPreview {...map} />
      <OperationsMapLegend />
      <Link
        href="/dashboard/map"
        className="text-primary inline-block text-sm font-medium hover:underline"
      >
        Open full map
      </Link>
    </>
  );
}

function CriticalAlertsCard({
  alerts,
}: {
  alerts: OverviewData["criticalAlerts"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Critical alerts</CardTitle>
        <CardDescription>
          Unread warning and critical notifications, most urgent first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <EmptyState
            title="No urgent alerts"
            description="There are currently no unread warning or critical operational notifications."
            icon={Bell}
          />
        ) : (
          <ul className="space-y-3">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className="border-border space-y-1 border-b pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={alert.severity} />
                  <span className="text-muted-foreground text-xs">
                    {formatDateTime(alert.createdAt)}
                  </span>
                </div>
                <p className="text-foreground text-sm font-medium">
                  {alert.title}
                </p>
                <p className="text-muted-foreground text-sm">
                  {alert.description}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecentActivityCard({
  activity,
}: {
  activity: OverviewData["recentActivity"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>
          The eight most recent operational events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <EmptyState
            title="No recent activity"
            description="Operational activity will appear here as it happens."
            icon={ClipboardList}
          />
        ) : (
          <ul className="space-y-3">
            {activity.map((event) => (
              <li
                key={event.id}
                className="border-border space-y-1 border-b pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-foreground text-sm font-medium">
                    {humanizeStatus(event.eventType)}
                  </p>
                  <span className="text-muted-foreground text-xs">
                    {formatDateTime(event.createdAt)}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {event.description}
                </p>
                {event.previousStatus !== undefined &&
                event.nextStatus !== undefined ? (
                  <p className="text-muted-foreground text-xs">
                    {humanizeStatus(event.previousStatus)} →{" "}
                    {humanizeStatus(event.nextStatus)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CollectionProgressCard({
  progress,
}: {
  progress: OverviewData["collectionProgress"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Collection progress</CardTitle>
        <CardDescription>
          Collected tasks as a share of all non-cancelled collection tasks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress.totalCount === 0 ? (
          <EmptyState
            title="No collection tasks yet"
            description="Collection progress will appear once collection tasks are created."
            icon={ClipboardList}
          />
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium">
                  {progress.completionPercentage}% collected
                </span>
                <span className="text-muted-foreground">
                  {progress.collectedCount} of {progress.totalCount}{" "}
                  non-cancelled tasks
                </span>
              </div>
              <Progress
                value={progress.completionPercentage}
                aria-label={`${progress.completionPercentage}% of non-cancelled collection tasks collected`}
              />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Pending</dt>
                <dd className="text-foreground font-medium">
                  {progress.pendingCount}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Active</dt>
                <dd className="text-foreground font-medium">
                  {progress.activeCount}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Collected</dt>
                <dd className="text-foreground font-medium">
                  {progress.collectedCount}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Unable to complete</dt>
                <dd className="text-foreground font-medium">
                  {progress.unableToCompleteCount}
                </dd>
              </div>
            </dl>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveRouteCard({ route }: { route: OverviewData["activeRoute"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active route</CardTitle>
        <CardDescription>Current truck route progress.</CardDescription>
      </CardHeader>
      <CardContent>
        {route === null ? (
          <EmptyState
            title="No active route"
            description="Pending collection tasks are ready for route generation."
            icon={RouteIcon}
            action={{ label: "Open Routes", href: "/dashboard/routes" }}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-foreground text-sm font-medium">
                  {route.displayId}
                </p>
                <p className="text-muted-foreground text-xs">
                  Truck {route.truckDisplayId}
                </p>
              </div>
              <StatusBadge status={route.status} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Total stops</dt>
                <dd className="text-foreground font-medium">
                  {route.totalStops}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Current stop</dt>
                <dd className="text-foreground font-medium">
                  {route.currentStopNumber}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Completed stops</dt>
                <dd className="text-foreground font-medium">
                  {route.completedStops}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Remaining stops</dt>
                <dd className="text-foreground font-medium">
                  {route.remainingStops}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Est. distance</dt>
                <dd className="text-foreground font-medium">
                  {route.estimatedDistanceKm.toFixed(1)} km
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Est. duration</dt>
                <dd className="text-foreground font-medium">
                  {route.estimatedDurationMinutes} min
                </dd>
              </div>
            </dl>
            <Link
              href="/dashboard/routes"
              className="text-primary inline-block text-sm font-medium hover:underline"
            >
              Open Routes
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VehicleHealthCard({
  trucks,
}: {
  trucks: OverviewData["vehicleHealth"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prototype vehicle health</CardTitle>
        <CardDescription>
          Prototype vehicle-health data — simulated. Not real telemetry or real
          predictive maintenance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {trucks.length === 0 ? (
          <EmptyState
            title="No vehicle health data"
            description="Vehicle health details will appear when fleet trucks are available."
            icon={Truck}
            action={{
              label: "Open Fleet & Maintenance",
              href: "/dashboard/fleet?view=maintenance_alerts",
            }}
          />
        ) : (
          <>
            <ul className="space-y-3">
              {trucks.map((truck) => (
                <li
                  key={truck.id}
                  className="border-border space-y-1 border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-foreground text-sm font-medium">
                        {truck.displayId}
                      </p>
                      <StatusBadge status={truck.maintenanceRisk} />
                      <StatusBadge status={truck.status} />
                    </div>
                    <DataSourceLabel source={truck.source} />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Driver {truck.driverName} · Battery{" "}
                    {truck.batteryPercentage}% · Engine health{" "}
                    {truck.engineHealthScore}
                  </p>
                  {truck.reportedFault !== undefined ? (
                    <p className="text-muted-foreground text-xs">
                      Fault: {truck.reportedFault}
                    </p>
                  ) : null}
                  {truck.nextRecommendedServiceAt !== undefined ? (
                    <p className="text-muted-foreground text-xs">
                      Next service:{" "}
                      {formatDateTime(truck.nextRecommendedServiceAt)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <Link
              href="/dashboard/fleet?view=maintenance_alerts"
              className="text-primary inline-block text-sm font-medium hover:underline"
            >
              Open Fleet & Maintenance
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function OverviewSkeleton() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-label="Loading operations overview"
    >
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <SummaryCardSkeleton key={index} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ContentCardSkeleton rows={5} />
        </div>
        <ContentCardSkeleton rows={4} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ContentCardSkeleton rows={4} />
        <ContentCardSkeleton rows={4} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ContentCardSkeleton rows={4} />
        <ContentCardSkeleton rows={4} />
      </div>
    </div>
  );
}
