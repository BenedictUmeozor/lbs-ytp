import { v } from "convex/values";

import { internalQuery, query, type QueryCtx } from "./_generated/server";
import { requireFleetManager } from "./domain/auth";
import {
  getBinOperationalRecord,
  getRouteOperationalRecord,
} from "./domain/read_helpers";
import { hasOperationalReportLocation } from "./domain/report_rules";
import {
  activityEventTypeValidator,
  binStatusValidator,
  dataSourceValidator,
  maintenanceRiskValidator,
  notificationTypeValidator,
  priorityValidator,
  relatedEntityIdValidator,
  relatedEntityTypeValidator,
  reportSourceValidator,
  reportStatusValidator,
  routeStatusValidator,
  truckStatusValidator,
  type MaintenanceRisk,
} from "./domain/validators";

function getStartOfTodayInLagos(timestamp: number): number {
  const lagosTime = new Date(timestamp + 60 * 60 * 1000);
  return (
    Date.UTC(
      lagosTime.getUTCFullYear(),
      lagosTime.getUTCMonth(),
      lagosTime.getUTCDate(),
    ) -
    60 * 60 * 1000
  );
}

const overviewSummaryValidator = v.object({
  totalMonitoredBins: v.number(),
  binsRequiringCollection: v.number(),
  criticalBins: v.number(),
  openCitizenReports: v.number(),
  pendingCollectionTasks: v.number(),
  activeTrucks: v.number(),
  collectionsCompletedToday: v.number(),
  trucksWithMaintenanceAlerts: v.number(),
});

async function computeOverviewSummary(ctx: QueryCtx) {
  const [bins, reports, tasks, trucks, alerts] = await Promise.all([
    ctx.db.query("bins").collect(),
    ctx.db.query("citizenReports").collect(),
    ctx.db.query("collectionTasks").collect(),
    ctx.db.query("trucks").collect(),
    ctx.db.query("maintenanceAlerts").collect(),
  ]);
  const startOfToday = getStartOfTodayInLagos(Date.now());
  return {
    totalMonitoredBins: bins.length,
    binsRequiringCollection: bins.filter(
      (bin) =>
        bin.status === "collection_required" || bin.status === "critical",
    ).length,
    criticalBins: bins.filter((bin) => bin.status === "critical").length,
    openCitizenReports: reports.filter(
      (report) =>
        !["resolved", "duplicate", "rejected"].includes(report.status),
    ).length,
    pendingCollectionTasks: tasks.filter((task) => task.status === "pending")
      .length,
    activeTrucks: trucks.filter(
      (truck) => truck.status !== "maintenance" && truck.status !== "offline",
    ).length,
    collectionsCompletedToday: tasks.filter(
      (task) =>
        task.status === "collected" &&
        task.completedAt !== undefined &&
        task.completedAt >= startOfToday,
    ).length,
    trucksWithMaintenanceAlerts: new Set(
      alerts
        .filter((alert) => alert.resolvedAt === undefined)
        .map((alert) => alert.truckId),
    ).size,
  };
}

export const getOverviewSummary = internalQuery({
  args: {},
  returns: overviewSummaryValidator,
  handler: (ctx) => computeOverviewSummary(ctx),
});

async function loadMapRecords(ctx: QueryCtx) {
  const [settings, bins, reports, trucks, route] = await Promise.all([
    ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique(),
    ctx.db.query("bins").collect(),
    ctx.db.query("citizenReports").collect(),
    ctx.db.query("trucks").collect(),
    ctx.db
      .query("routes")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .first(),
  ]);

  return { settings, bins, reports, trucks, route };
}

type MapRecords = Awaited<ReturnType<typeof loadMapRecords>>;

export const getMapData = internalQuery({
  args: {},
  handler: async (ctx) => {
    const { settings, bins, reports, trucks, route } =
      await loadMapRecords(ctx);
    return {
      depot:
        settings === null
          ? null
          : {
              latitude: settings.depotLatitude,
              longitude: settings.depotLongitude,
              label: "Bariga Pilot Depot",
              source: "simulated" as const,
            },
      bins: await Promise.all(
        bins.map((bin) => getBinOperationalRecord(ctx, bin)),
      ),
      reports: reports.filter(hasOperationalReportLocation),
      trucks,
      activeRoute:
        route === null ? null : await getRouteOperationalRecord(ctx, route),
    };
  },
});

type ActiveRouteRecord = Awaited<ReturnType<typeof getRouteOperationalRecord>>;

async function getActiveRouteRecord(
  ctx: QueryCtx,
  route: MapRecords["route"],
): Promise<ActiveRouteRecord | null> {
  return route === null ? null : getRouteOperationalRecord(ctx, route);
}

const overviewMapValidator = v.object({
  depot: v.union(
    v.object({
      latitude: v.number(),
      longitude: v.number(),
      label: v.string(),
      source: dataSourceValidator,
    }),
    v.null(),
  ),
  bins: v.array(
    v.object({
      id: v.id("bins"),
      displayId: v.string(),
      latitude: v.number(),
      longitude: v.number(),
      currentFillPercentage: v.number(),
      status: binStatusValidator,
      source: dataSourceValidator,
    }),
  ),
  reports: v.array(
    v.object({
      id: v.id("citizenReports"),
      referenceNumber: v.string(),
      latitude: v.number(),
      longitude: v.number(),
      priority: v.optional(priorityValidator),
      status: reportStatusValidator,
      source: reportSourceValidator,
    }),
  ),
  trucks: v.array(
    v.object({
      id: v.id("trucks"),
      displayId: v.string(),
      latitude: v.number(),
      longitude: v.number(),
      status: truckStatusValidator,
      maintenanceRisk: maintenanceRiskValidator,
      source: dataSourceValidator,
    }),
  ),
  activeRoutePath: v.array(
    v.object({ latitude: v.number(), longitude: v.number() }),
  ),
});

function buildOverviewMap(
  { settings, bins, reports, trucks }: MapRecords,
  activeRouteRecord: ActiveRouteRecord | null,
) {
  const depot =
    settings === null
      ? null
      : {
          latitude: settings.depotLatitude,
          longitude: settings.depotLongitude,
          label: "Bariga Pilot Depot",
          source: "simulated" as const,
        };

  const activeRoutePath =
    depot === null || activeRouteRecord === null
      ? []
      : [
          { latitude: depot.latitude, longitude: depot.longitude },
          ...activeRouteRecord.stops.map(({ task }) => ({
            latitude: task.latitude,
            longitude: task.longitude,
          })),
        ];

  return {
    depot,
    bins: bins.map((bin) => ({
      id: bin._id,
      displayId: bin.displayId,
      latitude: bin.latitude,
      longitude: bin.longitude,
      currentFillPercentage: bin.currentFillPercentage,
      status: bin.status,
      source: bin.source,
    })),
    reports: reports.filter(hasOperationalReportLocation).map((report) => ({
      id: report._id,
      referenceNumber: report.referenceNumber,
      latitude: report.latitude,
      longitude: report.longitude,
      priority: report.priority,
      status: report.status,
      source: report.source,
    })),
    trucks: trucks.map((truck) => ({
      id: truck._id,
      displayId: truck.displayId,
      latitude: truck.latitude,
      longitude: truck.longitude,
      status: truck.status,
      maintenanceRisk: truck.maintenanceRisk,
      source: truck.source,
    })),
    activeRoutePath,
  };
}

const criticalAlertSeverityValidator = v.union(
  v.literal("critical"),
  v.literal("warning"),
);

const criticalAlertValidator = v.object({
  id: v.id("notifications"),
  severity: criticalAlertSeverityValidator,
  type: notificationTypeValidator,
  title: v.string(),
  description: v.string(),
  relatedEntityType: relatedEntityTypeValidator,
  relatedEntityId: relatedEntityIdValidator,
  createdAt: v.number(),
});

async function buildCriticalAlerts(ctx: QueryCtx) {
  const unread = await ctx.db
    .query("notifications")
    .withIndex("by_readAt", (q) => q.eq("readAt", undefined))
    .collect();

  const severityRank = { critical: 0, warning: 1 } as const;
  const relevant = unread.filter(
    (
      notification,
    ): notification is typeof notification & {
      severity: "critical" | "warning";
    } =>
      notification.severity === "critical" ||
      notification.severity === "warning",
  );
  relevant.sort(
    (left, right) =>
      severityRank[left.severity] - severityRank[right.severity] ||
      right._creationTime - left._creationTime,
  );

  return relevant.slice(0, 5).map((notification) => ({
    id: notification._id,
    severity: notification.severity,
    type: notification.type,
    title: notification.title,
    description: notification.description,
    relatedEntityType: notification.relatedEntityType,
    relatedEntityId: notification.relatedEntityId,
    createdAt: notification._creationTime,
  }));
}

const recentActivityEventValidator = v.object({
  id: v.id("activityEvents"),
  eventType: activityEventTypeValidator,
  description: v.string(),
  relatedEntityType: relatedEntityTypeValidator,
  relatedEntityId: relatedEntityIdValidator,
  actorUserId: v.optional(v.id("users")),
  previousStatus: v.optional(v.string()),
  nextStatus: v.optional(v.string()),
  createdAt: v.number(),
});

async function buildRecentActivity(ctx: QueryCtx) {
  const events = await ctx.db.query("activityEvents").order("desc").take(8);
  return events.map((event) => ({
    id: event._id,
    eventType: event.eventType,
    description: event.description,
    relatedEntityType: event.relatedEntityType,
    relatedEntityId: event.relatedEntityId,
    actorUserId: event.actorUserId,
    previousStatus: event.previousStatus,
    nextStatus: event.nextStatus,
    createdAt: event._creationTime,
  }));
}

const collectionProgressValidator = v.object({
  totalCount: v.number(),
  pendingCount: v.number(),
  activeCount: v.number(),
  collectedCount: v.number(),
  unableToCompleteCount: v.number(),
  completionPercentage: v.number(),
});

async function buildCollectionProgress(ctx: QueryCtx) {
  const tasks = await ctx.db.query("collectionTasks").collect();
  const nonCancelled = tasks.filter((task) => task.status !== "cancelled");

  const pendingCount = nonCancelled.filter(
    (task) => task.status === "pending",
  ).length;
  const activeCount = nonCancelled.filter(
    (task) =>
      task.status === "scheduled" ||
      task.status === "assigned" ||
      task.status === "en_route",
  ).length;
  const collectedCount = nonCancelled.filter(
    (task) => task.status === "collected",
  ).length;
  const unableToCompleteCount = nonCancelled.filter(
    (task) => task.status === "unable_to_complete",
  ).length;
  const totalCount = nonCancelled.length;
  const completionPercentage =
    totalCount === 0 ? 0 : Math.round((collectedCount / totalCount) * 100);

  return {
    totalCount,
    pendingCount,
    activeCount,
    collectedCount,
    unableToCompleteCount,
    completionPercentage,
  };
}

const activeRouteSummaryValidator = v.union(
  v.object({
    id: v.id("routes"),
    displayId: v.string(),
    status: routeStatusValidator,
    truckDisplayId: v.string(),
    totalStops: v.number(),
    currentStopNumber: v.number(),
    completedStops: v.number(),
    remainingStops: v.number(),
    estimatedDistanceKm: v.number(),
    estimatedDurationMinutes: v.number(),
  }),
  v.null(),
);

async function buildActiveRouteSummary(
  ctx: QueryCtx,
  activeRouteRecord: ActiveRouteRecord | null,
) {
  if (activeRouteRecord === null) return null;
  const { route, stops } = activeRouteRecord;

  const truck = await ctx.db.get(route.truckId);
  if (truck === null)
    throw new Error(`Route ${route._id} references a missing truck.`);

  const totalStops = stops.length;
  const completedStops = stops.filter(
    ({ stop }) => stop.status === "completed",
  ).length;
  const remainingStops = totalStops - completedStops;
  const currentStopNumber = Math.min(route.currentStopIndex + 1, totalStops);

  return {
    id: route._id,
    displayId: route.displayId,
    status: route.status,
    truckDisplayId: truck.displayId,
    totalStops,
    currentStopNumber,
    completedStops,
    remainingStops,
    estimatedDistanceKm: route.estimatedDistanceKm,
    estimatedDurationMinutes: route.estimatedDurationMinutes,
  };
}

const vehicleHealthEntryValidator = v.object({
  id: v.id("trucks"),
  displayId: v.string(),
  driverName: v.string(),
  status: truckStatusValidator,
  maintenanceRisk: maintenanceRiskValidator,
  batteryPercentage: v.number(),
  engineHealthScore: v.number(),
  reportedFault: v.optional(v.string()),
  nextRecommendedServiceAt: v.optional(v.number()),
  source: dataSourceValidator,
});

const maintenanceRiskOrder: Record<MaintenanceRisk, number> = {
  high: 0,
  medium: 1,
  normal: 2,
};

async function buildVehicleHealth(ctx: QueryCtx) {
  const trucks = await ctx.db.query("trucks").collect();
  const sorted = [...trucks].sort(
    (left, right) =>
      maintenanceRiskOrder[left.maintenanceRisk] -
      maintenanceRiskOrder[right.maintenanceRisk],
  );

  return sorted.map((truck) => ({
    id: truck._id,
    displayId: truck.displayId,
    driverName: truck.driverName,
    status: truck.status,
    maintenanceRisk: truck.maintenanceRisk,
    batteryPercentage: truck.batteryPercentage,
    engineHealthScore: truck.engineHealthScore,
    reportedFault: truck.reportedFault,
    nextRecommendedServiceAt: truck.nextRecommendedServiceAt,
    source: truck.source,
  }));
}

export const getOverviewData = query({
  args: {},
  returns: v.object({
    summary: overviewSummaryValidator,
    map: overviewMapValidator,
    criticalAlerts: v.array(criticalAlertValidator),
    recentActivity: v.array(recentActivityEventValidator),
    collectionProgress: collectionProgressValidator,
    activeRoute: activeRouteSummaryValidator,
    vehicleHealth: v.array(vehicleHealthEntryValidator),
  }),
  handler: async (ctx) => {
    await requireFleetManager(ctx);

    const mapRecords = await loadMapRecords(ctx);
    const activeRouteRecord = await getActiveRouteRecord(ctx, mapRecords.route);

    const [
      summary,
      map,
      criticalAlerts,
      recentActivity,
      collectionProgress,
      activeRoute,
      vehicleHealth,
    ] = await Promise.all([
      computeOverviewSummary(ctx),
      buildOverviewMap(mapRecords, activeRouteRecord),
      buildCriticalAlerts(ctx),
      buildRecentActivity(ctx),
      buildCollectionProgress(ctx),
      buildActiveRouteSummary(ctx, activeRouteRecord),
      buildVehicleHealth(ctx),
    ]);

    return {
      summary,
      map,
      criticalAlerts,
      recentActivity,
      collectionProgress,
      activeRoute,
      vehicleHealth,
    };
  },
});
