import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { requireFleetManager } from "./domain/auth";
import { isTerminalRouteStopStatus } from "./domain/route_rules";
import { resolveOperationalStop } from "./domain/truck_simulation";

async function assignedRoute(ctx: QueryCtx, truck: Doc<"trucks">) {
  if (truck.assignedRouteId === undefined) return null;
  return ctx.db.get(truck.assignedRouteId);
}

async function orderedStops(ctx: QueryCtx, routeId: Id<"routes">) {
  const stops = await ctx.db
    .query("routeStops")
    .withIndex("by_routeId_and_sequenceNumber", (q) => q.eq("routeId", routeId))
    .order("asc")
    .collect();
  const tasks = await Promise.all(stops.map((stop) => ctx.db.get(stop.taskId)));
  return stops.flatMap((stop, index) => {
    const task = tasks[index];
    return task === null ? [] : [{ stop, task }];
  });
}

async function sourceDetails(ctx: QueryCtx, task: Doc<"collectionTasks">) {
  const [bin, report] = await Promise.all([
    task.sourceBinId === undefined ? null : ctx.db.get(task.sourceBinId),
    task.sourceReportId === undefined ? null : ctx.db.get(task.sourceReportId),
  ]);
  return {
    sourceReference:
      bin?.displayId ??
      report?.referenceNumber ??
      (task.sourceType === "manual" ? "Manager-created" : "—"),
    locationLabel:
      bin?.address ??
      report?.resolvedLocationName ??
      report?.landmarkText ??
      `${task.latitude.toFixed(5)}, ${task.longitude.toFixed(5)}`,
  };
}

function compactStop(
  entry: Awaited<ReturnType<typeof orderedStops>>[number] | undefined,
  locationLabel: string | undefined,
) {
  if (entry === undefined) return null;
  return {
    id: entry.stop._id,
    sequenceNumber: entry.stop.sequenceNumber,
    taskId: entry.task._id,
    taskDisplayId: entry.task.displayId,
    taskLocationLabel:
      locationLabel ??
      `${entry.task.latitude.toFixed(5)}, ${entry.task.longitude.toFixed(5)}`,
  };
}

function locationLabel(
  truck: Doc<"trucks">,
  route: Doc<"routes"> | null,
  stops: Awaited<ReturnType<typeof orderedStops>>,
  depot: { depotLatitude: number; depotLongitude: number } | null,
) {
  const current =
    route?.status === "active" ? resolveOperationalStop(stops) : null;
  if (current !== null && truck.status === "at_collection_point")
    return `At ${current.task.displayId} collection point`;
  if (current !== null && truck.status === "on_route")
    return `Moving to ${current.task.displayId}`;
  if (truck.status === "returning" && route !== null)
    return truck.latitude === route.depotLatitude &&
      truck.longitude === route.depotLongitude
      ? "Bariga depot"
      : "Returning to Bariga depot";
  if (
    depot !== null &&
    truck.latitude === depot.depotLatitude &&
    truck.longitude === depot.depotLongitude
  )
    return "Bariga depot";
  return "Simulated location";
}

async function fleetRow(
  ctx: QueryCtx,
  truck: Doc<"trucks">,
  depot: { depotLatitude: number; depotLongitude: number } | null,
) {
  const route = await assignedRoute(ctx, truck);
  const stops = route === null ? [] : await orderedStops(ctx, route._id);
  const alerts = await ctx.db
    .query("maintenanceAlerts")
    .withIndex("by_truckId", (q) => q.eq("truckId", truck._id))
    .collect();
  return {
    id: truck._id,
    displayId: truck.displayId,
    driverName: truck.driverName,
    status: truck.status,
    latitude: truck.latitude,
    longitude: truck.longitude,
    locationLabel: locationLabel(truck, route, stops, depot),
    assignedRoute:
      route === null
        ? null
        : { id: route._id, displayId: route.displayId, status: route.status },
    remainingStopCount: stops.filter(
      ({ stop }) => !isTerminalRouteStopStatus(stop.status),
    ).length,
    capacityPercentage: truck.capacityPercentage,
    maintenanceRisk: truck.maintenanceRisk,
    lastServiceAt: truck.lastServiceAt,
    source: truck.source,
    unresolvedMaintenanceAlertCount: alerts.filter(
      (alert) => alert.resolvedAt === undefined,
    ).length,
  };
}

export const listTrucks = query({
  args: {},
  handler: async (ctx) => {
    await requireFleetManager(ctx);
    const [trucks, settings] = await Promise.all([
      ctx.db.query("trucks").withIndex("by_displayId").order("asc").collect(),
      ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", "global"))
        .unique(),
    ]);
    return Promise.all(trucks.map((truck) => fleetRow(ctx, truck, settings)));
  },
});

export const getTruckDetail = query({
  args: { truckId: v.string() },
  handler: async (ctx, args) => {
    await requireFleetManager(ctx);
    const truckId = ctx.db.normalizeId("trucks", args.truckId);
    if (truckId === null) return null;
    const truck = await ctx.db.get(truckId);
    if (truck === null) return null;

    const route = await assignedRoute(ctx, truck);
    const [stops, tasks, alerts, settings] = await Promise.all([
      route === null ? [] : orderedStops(ctx, route._id),
      ctx.db
        .query("collectionTasks")
        .withIndex("by_assignedTruckId", (q) =>
          q.eq("assignedTruckId", truck._id),
        )
        .collect(),
      ctx.db
        .query("maintenanceAlerts")
        .withIndex("by_truckId", (q) => q.eq("truckId", truck._id))
        .order("desc")
        .collect(),
      ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", "global"))
        .unique(),
    ]);
    const current =
      route?.status === "active" ? resolveOperationalStop(stops) : null;
    const currentIndex =
      current === null
        ? -1
        : stops.findIndex(({ stop }) => stop._id === current.stop._id);
    const next =
      currentIndex < 0
        ? undefined
        : stops
            .slice(currentIndex + 1)
            .find(({ stop }) => !isTerminalRouteStopStatus(stop.status));
    const stopSources = await Promise.all(
      stops.map(({ task }) => sourceDetails(ctx, task)),
    );
    const terminalTasks = tasks.filter((task) =>
      ["collected", "unable_to_complete"].includes(task.status),
    );
    const history = await Promise.all(
      terminalTasks.map(async (task) => {
        const [source, taskRoute] = await Promise.all([
          sourceDetails(ctx, task),
          task.routeId === undefined ? null : ctx.db.get(task.routeId),
        ]);
        return {
          id: task._id,
          displayId: task.displayId,
          outcome: task.status,
          sourceType: task.sourceType,
          sourceReference: source.sourceReference,
          locationLabel: source.locationLabel,
          route:
            taskRoute === null
              ? null
              : { id: taskRoute._id, displayId: taskRoute.displayId },
          completedAt: task.completedAt,
          statusUpdatedAt: task.statusUpdatedAt,
          eventTime: task.completedAt ?? task.statusUpdatedAt,
        };
      }),
    );
    history.sort((a, b) => b.eventTime - a.eventTime);
    const completedStopCount = stops.filter(
      ({ stop }) => stop.status === "completed",
    ).length;
    const unableStopCount = stops.filter(
      ({ stop }) => stop.status === "unable_to_complete",
    ).length;
    const remainingStopCount = stops.filter(
      ({ stop }) => !isTerminalRouteStopStatus(stop.status),
    ).length;
    return {
      truck: {
        id: truck._id,
        displayId: truck.displayId,
        driverName: truck.driverName,
        status: truck.status,
        latitude: truck.latitude,
        longitude: truck.longitude,
        source: truck.source,
        capacityPercentage: truck.capacityPercentage,
        maintenanceRisk: truck.maintenanceRisk,
        mileageSinceService: truck.mileageSinceService,
        lastServiceAt: truck.lastServiceAt,
        batteryPercentage: truck.batteryPercentage,
        engineHealthScore: truck.engineHealthScore,
        reportedFault: truck.reportedFault,
        nextRecommendedServiceAt: truck.nextRecommendedServiceAt,
      },
      location: {
        label: locationLabel(truck, route, stops, settings),
        latitude: truck.latitude,
        longitude: truck.longitude,
        simulated: truck.source === "simulated",
      },
      currentAssignment:
        route === null
          ? null
          : {
              id: route._id,
              displayId: route.displayId,
              status: route.status,
              currentStop: compactStop(
                current ?? undefined,
                currentIndex < 0
                  ? undefined
                  : stopSources[currentIndex]?.locationLabel,
              ),
              nextStop: compactStop(
                next,
                next === undefined
                  ? undefined
                  : stopSources[
                      stops.findIndex(({ stop }) => stop._id === next.stop._id)
                    ]?.locationLabel,
              ),
              completedStopCount,
              unableStopCount,
              remainingStopCount,
              progressPercentage:
                stops.length === 0
                  ? 0
                  : Math.round(
                      ((completedStopCount + unableStopCount) / stops.length) *
                        100,
                    ),
              startedAt: route.startedAt,
            },
      collectionHistory: history,
      maintenanceAlerts: alerts.map((alert) => ({
        id: alert._id,
        risk: alert.risk,
        reason: alert.reason,
        recommendation: alert.recommendation,
        simulated: alert.simulated,
        createdAt: alert._creationTime,
        resolvedAt: alert.resolvedAt,
      })),
    };
  },
});
