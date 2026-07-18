import { v } from "convex/values";

import { query, type QueryCtx } from "./_generated/server";
import { requireFleetManager } from "./domain/auth";
import { ACTIVE_OPERATIONAL_TRUCK_STATUSES } from "./domain/operations";
import {
  getBinOperationalRecord,
  getRouteOperationalRecord,
} from "./domain/read_helpers";
import { hasOperationalReportLocation } from "./domain/report_rules";
import { calculateRemainingRouteMetrics, nextOperationalStopIndex, splitRouteStops } from "./domain/route_reoptimisation";
import { isTerminalRouteStopStatus } from "./domain/route_rules";
import {
  binStatusValidator,
  dataSourceValidator,
  deviceStatusValidator,
  maintenanceRiskValidator,
  priorityValidator,
  reportCategoryValidator,
  reportSourceValidator,
  reportStatusValidator,
  routeStatusValidator,
  routeStopStatusValidator,
  taskStatusValidator,
  truckStatusValidator,
} from "./domain/validators";

const mapDataValidator = v.object({
  summary: v.object({
    totalBins: v.number(),
    criticalBins: v.number(),
    openReports: v.number(),
    activeTrucks: v.number(),
    collectionsCompletedToday: v.number(),
  }),
  depot: v.object({
    latitude: v.number(),
    longitude: v.number(),
    label: v.string(),
    source: dataSourceValidator,
  }),
  bins: v.array(
    v.object({
      id: v.id("bins"),
      displayId: v.string(),
      name: v.string(),
      address: v.string(),
      latitude: v.number(),
      longitude: v.number(),
      currentFillPercentage: v.number(),
      status: binStatusValidator,
      lastReadingAt: v.optional(v.number()),
      lastCollectionAt: v.optional(v.number()),
      source: dataSourceValidator,
      deviceIdentifier: v.optional(v.string()),
      deviceStatus: v.optional(deviceStatusValidator),
      activeTaskId: v.optional(v.id("collectionTasks")),
      activeTaskDisplayId: v.optional(v.string()),
      activeTaskStatus: v.optional(taskStatusValidator),
    }),
  ),
  reports: v.array(
    v.object({
      id: v.id("citizenReports"),
      referenceNumber: v.string(),
      category: v.optional(reportCategoryValidator),
      priority: v.optional(priorityValidator),
      summary: v.string(),
      source: reportSourceValidator,
      status: reportStatusValidator,
      landmarkText: v.optional(v.string()),
      latitude: v.number(),
      longitude: v.number(),
      submittedAt: v.number(),
      linkedTaskId: v.optional(v.id("collectionTasks")),
      linkedTaskDisplayId: v.optional(v.string()),
      linkedTaskStatus: v.optional(taskStatusValidator),
    }),
  ),
  trucks: v.array(
    v.object({
      id: v.id("trucks"),
      displayId: v.string(),
      driverName: v.string(),
      status: truckStatusValidator,
      latitude: v.number(),
      longitude: v.number(),
      maintenanceRisk: maintenanceRiskValidator,
      source: dataSourceValidator,
      assignedRouteId: v.optional(v.id("routes")),
      assignedRouteDisplayId: v.optional(v.string()),
      currentStopNumber: v.optional(v.number()),
      remainingStopCount: v.optional(v.number()),
    }),
  ),
  activeRoute: v.union(
    v.object({
      id: v.id("routes"),
      displayId: v.string(),
      status: routeStatusValidator,
      truckId: v.id("trucks"),
      truckDisplayId: v.string(),
      depotLatitude: v.number(),
      depotLongitude: v.number(),
      estimatedDistanceKm: v.number(),
      estimatedDurationMinutes: v.number(),
      currentStopIndex: v.number(),
      totalStops: v.number(),
      completedStopCount: v.number(),
      unableStopCount: v.number(),
      terminalStopCount: v.number(),
      remainingStopCount: v.number(),
      progressPercentage: v.number(),
      operationalCurrentStopId: v.optional(v.id("routeStops")),
      nextStopId: v.optional(v.id("routeStops")),
      remainingDistanceKm: v.optional(v.number()),
      remainingBaseTravelMinutes: v.optional(v.number()),
      remainingTrafficPenaltyMinutes: v.optional(v.number()),
      remainingRoadConditionPenaltyMinutes: v.optional(v.number()),
      remainingEstimatedDurationMinutes: v.optional(v.number()),
      stops: v.array(
        v.object({
          id: v.id("routeStops"),
          sequenceNumber: v.number(),
          status: routeStopStatusValidator,
          taskId: v.id("collectionTasks"),
          taskDisplayId: v.string(),
          taskPriority: priorityValidator,
          taskReason: v.string(),
          latitude: v.number(),
          longitude: v.number(),
          completedAt: v.optional(v.number()),
          isTerminal: v.boolean(),
          isOperationalCurrent: v.boolean(),
          isNext: v.boolean(),
          isRemaining: v.boolean(),
        }),
      ),
    }),
    v.null(),
  ),
});

function startOfTodayInLagos(timestamp: number) {
  const lagos = new Date(timestamp + 60 * 60 * 1000);
  return (
    Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate()) -
    60 * 60 * 1000
  );
}

async function getMapData(ctx: QueryCtx) {
  // These bounds intentionally cover the Bariga MVP demo dataset; revisit before a larger deployment.
  const [settings, bins, reports, trucks, tasks, routes] = await Promise.all([
    ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique(),
    ctx.db.query("bins").take(100),
    ctx.db.query("citizenReports").take(100),
    ctx.db.query("trucks").take(100),
    ctx.db.query("collectionTasks").take(200),
    ctx.db.query("routes").take(100),
  ]);
  const route = routes.find((item) => item.status === "active") ?? null;
  const routesById = new Map(routes.map((item) => [item._id, item]));
  const activeRouteRecord =
    route === null ? null : await getRouteOperationalRecord(ctx, route);
  const binRecords = await Promise.all(
    bins.map((bin) => getBinOperationalRecord(ctx, bin)),
  );
  const reportRecords = await Promise.all(
    reports.map(async (report) => ({
      report,
      task:
        report.linkedTaskId === undefined
          ? null
          : await ctx.db.get(report.linkedTaskId),
    })),
  );
  const activeRoute =
    activeRouteRecord === null
      ? null
      : (() => {
          const { route: currentRoute, stops } = activeRouteRecord;
          const split = splitRouteStops(stops);
          const currentIndex = split.operationalCurrentIndex;
          const nextIndex = nextOperationalStopIndex(stops, currentIndex);
          const completedStopCount = stops.filter(
            ({ stop }) => stop.status === "completed",
          ).length;
          const unableStopCount = stops.filter(
            ({ stop }) => stop.status === "unable_to_complete",
          ).length;
          const terminalStopCount = stops.filter(({ stop }) =>
            isTerminalRouteStopStatus(stop.status),
          ).length;
          const truck = trucks.find(
            (item) => item._id === currentRoute.truckId,
          );
          if (truck === undefined)
            throw new Error(
              `Route ${currentRoute._id} references a missing truck.`,
            );
          const remaining =
            split.operationalCurrent === null
              ? null
              : calculateRemainingRouteMetrics(
                  truck,
                  split.operationalCurrent,
                  split.futurePending.map(({ task }) => ({ id: task._id, displayId: task.displayId, latitude: task.latitude, longitude: task.longitude, priority: task.priority })),
                  stops.length,
                  stops.length - terminalStopCount,
                  currentRoute.trafficPenaltyMinutes,
                  currentRoute.roadConditionPenaltyMinutes,
                );
          return {
            id: currentRoute._id,
            displayId: currentRoute.displayId,
            status: currentRoute.status,
            truckId: truck._id,
            truckDisplayId: truck.displayId,
            depotLatitude: currentRoute.depotLatitude,
            depotLongitude: currentRoute.depotLongitude,
            estimatedDistanceKm: currentRoute.estimatedDistanceKm,
            estimatedDurationMinutes: currentRoute.estimatedDurationMinutes,
            currentStopIndex: currentRoute.currentStopIndex,
            totalStops: stops.length,
            completedStopCount,
            unableStopCount,
            terminalStopCount,
            remainingStopCount: stops.length - terminalStopCount,
            progressPercentage: stops.length === 0 ? 0 : Math.round((terminalStopCount / stops.length) * 100),
            operationalCurrentStopId: split.operationalCurrent?.stop._id,
            nextStopId: nextIndex < 0 ? undefined : stops[nextIndex].stop._id,
            remainingDistanceKm: remaining?.remainingDistanceKm,
            remainingBaseTravelMinutes: remaining?.baseTravelMinutes,
            remainingTrafficPenaltyMinutes: remaining?.remainingTrafficPenaltyMinutes,
            remainingRoadConditionPenaltyMinutes: remaining?.remainingRoadConditionPenaltyMinutes,
            remainingEstimatedDurationMinutes: remaining?.remainingEstimatedDurationMinutes,
            stops: stops.map(({ stop, task }, index) => ({
              id: stop._id,
              sequenceNumber: stop.sequenceNumber,
              status: stop.status,
              taskId: task._id,
              taskDisplayId: task.displayId,
              taskPriority: task.priority,
              taskReason: task.reason,
              latitude: task.latitude,
              longitude: task.longitude,
              completedAt: stop.completedAt,
              isTerminal: isTerminalRouteStopStatus(stop.status),
              isOperationalCurrent: index === currentIndex,
              isNext: index === nextIndex,
              isRemaining: index >= currentIndex && !isTerminalRouteStopStatus(stop.status),
            })),
          };
        })();
  const startToday = startOfTodayInLagos(Date.now());
  return {
    summary: {
      totalBins: bins.length,
      criticalBins: bins.filter((bin) => bin.status === "critical").length,
      openReports: reports.filter(
        (report) =>
          !["resolved", "duplicate", "rejected"].includes(report.status),
      ).length,
      activeTrucks: trucks.filter((truck) =>
        ACTIVE_OPERATIONAL_TRUCK_STATUSES.includes(truck.status),
      ).length,
      collectionsCompletedToday: tasks.filter(
        (task) =>
          task.status === "collected" &&
          task.completedAt !== undefined &&
          task.completedAt >= startToday,
      ).length,
    },
    depot: {
      latitude: settings?.depotLatitude ?? 6.5385,
      longitude: settings?.depotLongitude ?? 3.3868,
      label: "Bariga Pilot Depot",
      source: "simulated" as const,
    },
    bins: binRecords.map(({ bin, device, activeTask }) => ({
      id: bin._id,
      displayId: bin.displayId,
      name: bin.name,
      address: bin.address,
      latitude: bin.latitude,
      longitude: bin.longitude,
      currentFillPercentage: bin.currentFillPercentage,
      status: bin.status,
      lastReadingAt: bin.lastReadingAt,
      lastCollectionAt: bin.lastCollectionAt,
      source: bin.source,
      deviceIdentifier: device?.deviceIdentifier,
      deviceStatus: device?.status,
      activeTaskId: activeTask?._id,
      activeTaskDisplayId: activeTask?.displayId,
      activeTaskStatus: activeTask?.status,
    })),
    reports: reportRecords
      .filter(({ report }) => hasOperationalReportLocation(report))
      .map(({ report, task }) => ({
        id: report._id,
        referenceNumber: report.referenceNumber,
        category: report.category,
        priority: report.priority,
        summary: report.summary ?? report.originalMessage,
        source: report.source,
        status: report.status,
        landmarkText: report.landmarkText,
        latitude: report.latitude!,
        longitude: report.longitude!,
        submittedAt: report._creationTime,
        linkedTaskId: task?._id,
        linkedTaskDisplayId: task?.displayId,
        linkedTaskStatus: task?.status,
      })),
    trucks: trucks.map((truck) => ({
      id: truck._id,
      displayId: truck.displayId,
      driverName: truck.driverName,
      status: truck.status,
      latitude: truck.latitude,
      longitude: truck.longitude,
      maintenanceRisk: truck.maintenanceRisk,
      source: truck.source,
      assignedRouteId: truck.assignedRouteId,
      assignedRouteDisplayId:
        truck.assignedRouteId === undefined
          ? undefined
          : routesById.get(truck.assignedRouteId)?.displayId,
      currentStopNumber:
        truck._id === activeRoute?.truckId
          ? activeRoute.stops.find((stop) => stop.isOperationalCurrent)?.sequenceNumber
          : undefined,
      remainingStopCount:
        truck._id === activeRoute?.truckId
          ? activeRoute.remainingStopCount
          : undefined,
    })),
    activeRoute,
  };
}

export const getData = query({
  args: {},
  returns: mapDataValidator,
  handler: async (ctx) => {
    await requireFleetManager(ctx);
    return getMapData(ctx);
  },
});
