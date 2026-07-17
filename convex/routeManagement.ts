import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import {
  calculateRouteMetrics,
  DEMO_AVERAGE_SPEED_KM_PER_HOUR,
  hasValidRouteCoordinates,
  orderRouteTasks,
  type RouteTask,
} from "./domain/route_algorithm";
import { requireFleetManager } from "./domain/auth";
import { scheduleTaskOnProposedRoute } from "./domain/route_task_helpers";
import { insertActivityEvent } from "./domain/write_helpers";

type RouteErrorCode =
  | "SETTINGS_UNAVAILABLE"
  | "NO_TASKS_SELECTED"
  | "TOO_MANY_TASKS"
  | "DUPLICATE_TASK_SELECTION"
  | "TRUCK_UNAVAILABLE"
  | "TRUCK_UNDER_MAINTENANCE"
  | "TRUCK_ALREADY_RESERVED"
  | "TASK_UNAVAILABLE"
  | "TASK_NOT_PENDING"
  | "TASK_ALREADY_ROUTED"
  | "INVALID_TASK_COORDINATES";

const MAXIMUM_ROUTE_STOPS = 8;
const OPEN_ROUTE_STATUSES = new Set(["proposed", "assigned", "active"]);

function fail(code: RouteErrorCode, message: string): never {
  throw new ConvexError({ code, message });
}

function effectiveMaximumStops(maximumRouteStops: number) {
  return Math.min(maximumRouteStops, MAXIMUM_ROUTE_STOPS);
}

function toRouteTask(task: Doc<"collectionTasks">): RouteTask {
  return {
    id: task._id,
    displayId: task.displayId,
    latitude: task.latitude,
    longitude: task.longitude,
    priority: task.priority,
  };
}

function priorityComposition(tasks: readonly RouteTask[]) {
  return {
    critical: tasks.filter((task) => task.priority === "critical").length,
    high: tasks.filter((task) => task.priority === "high").length,
    medium: tasks.filter((task) => task.priority === "medium").length,
    low: tasks.filter((task) => task.priority === "low").length,
  };
}

async function hasOpenRouteForTruck(ctx: QueryCtx, truckId: Id<"trucks">) {
  const routes = await ctx.db
    .query("routes")
    .withIndex("by_truckId", (q) => q.eq("truckId", truckId))
    .collect();
  return routes.some((route) => OPEN_ROUTE_STATUSES.has(route.status));
}

async function nextRouteDisplayId(ctx: QueryCtx) {
  const routes = await ctx.db.query("routes").collect();
  const highest = routes.reduce((value, route) => {
    const match = /^RT-(\d+)$/.exec(route.displayId);
    return match === null ? value : Math.max(value, Number(match[1]));
  }, 0);
  return `RT-${String(highest + 1).padStart(3, "0")}`;
}

async function sourceDetails(ctx: QueryCtx, task: Doc<"collectionTasks">) {
  const [bin, report] = await Promise.all([
    task.sourceBinId === undefined ? null : ctx.db.get(task.sourceBinId),
    task.sourceReportId === undefined ? null : ctx.db.get(task.sourceReportId),
  ]);
  return {
    sourceReference: bin?.displayId ?? report?.referenceNumber,
    locationLabel:
      bin?.address ?? report?.resolvedLocationName ?? report?.landmarkText,
    smartBinFillPercentage:
      task.sourceType === "smart_bin" ? bin?.currentFillPercentage : undefined,
  };
}

async function routeStops(ctx: QueryCtx, routeId: Id<"routes">) {
  return ctx.db
    .query("routeStops")
    .withIndex("by_routeId_and_sequenceNumber", (q) => q.eq("routeId", routeId))
    .order("asc")
    .collect();
}

export const getRouteBuilderData = query({
  args: {},
  handler: async (ctx) => {
    await requireFleetManager(ctx);
    const [settings, trucks, tasks] = await Promise.all([
      ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", "global"))
        .unique(),
      ctx.db.query("trucks").withIndex("by_status", (q) => q.eq("status", "available")).collect(),
      ctx.db
        .query("collectionTasks")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .collect(),
    ]);
    if (settings === null)
      fail("SETTINGS_UNAVAILABLE", "Route settings are unavailable.");

    const eligibleTrucks = (
      await Promise.all(
        trucks.map(async (truck) => ({
          truck,
          hasOpenRoute: await hasOpenRouteForTruck(ctx, truck._id),
        })),
      )
    )
      .filter(
        ({ truck, hasOpenRoute }) =>
          truck.status === "available" &&
          truck.assignedRouteId === undefined &&
          !hasOpenRoute,
      )
      .map(({ truck }) => ({
        id: truck._id,
        displayId: truck.displayId,
        driverName: truck.driverName,
        status: truck.status,
        maintenanceRisk: truck.maintenanceRisk,
        latitude: truck.latitude,
        longitude: truck.longitude,
        capacityPercentage: truck.capacityPercentage,
        source: truck.source,
      }));

    const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
    const eligibleTasks = await Promise.all(
      tasks
        .filter(
          (task) =>
            task.routeId === undefined &&
            hasValidRouteCoordinates({
              latitude: task.latitude,
              longitude: task.longitude,
            }),
        )
        .sort(
          (left, right) =>
            priorityRank[left.priority] - priorityRank[right.priority] ||
            left._creationTime - right._creationTime ||
            left.displayId.localeCompare(right.displayId),
        )
        .map(async (task) => {
          const source = await sourceDetails(ctx, task);
          return {
            id: task._id,
            displayId: task.displayId,
            sourceType: task.sourceType,
            ...source,
            latitude: task.latitude,
            longitude: task.longitude,
            priority: task.priority,
            reason: task.reason,
            createdAt: task._creationTime,
          };
        }),
    );

    return {
      settings: {
        depotLatitude: settings.depotLatitude,
        depotLongitude: settings.depotLongitude,
        maximumRouteStops: settings.maximumRouteStops,
        effectiveMaximumStops: effectiveMaximumStops(settings.maximumRouteStops),
        trafficPenaltyMinutes: settings.trafficPenaltyMinutes,
        roadConditionPenaltyMinutes: settings.roadConditionPenaltyMinutes,
        averageSpeedKmPerHour: DEMO_AVERAGE_SPEED_KM_PER_HOUR,
      },
      trucks: eligibleTrucks,
      tasks: eligibleTasks,
    };
  },
});

export const generateProposedRoute = mutation({
  args: {
    truckId: v.id("trucks"),
    taskIds: v.array(v.id("collectionTasks")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    if (settings === null)
      fail("SETTINGS_UNAVAILABLE", "Route settings are unavailable.");
    if (args.taskIds.length === 0)
      fail("NO_TASKS_SELECTED", "Select at least one pending task.");
    if (new Set(args.taskIds).size !== args.taskIds.length)
      fail("DUPLICATE_TASK_SELECTION", "Select each task only once.");
    const maximumStopCount = effectiveMaximumStops(settings.maximumRouteStops);
    if (args.taskIds.length > maximumStopCount)
      fail(
        "TOO_MANY_TASKS",
        `Select no more than ${maximumStopCount} tasks for this route.`,
      );

    const truck = await ctx.db.get(args.truckId);
    if (truck === null) fail("TRUCK_UNAVAILABLE", "Select an available truck.");
    if (truck.status === "maintenance")
      fail("TRUCK_UNDER_MAINTENANCE", "Maintenance trucks cannot be routed.");
    if (truck.status !== "available")
      fail("TRUCK_UNAVAILABLE", "Select an available truck.");
    if (truck.assignedRouteId !== undefined)
      fail("TRUCK_UNAVAILABLE", "This truck already has an assigned route.");
    if (await hasOpenRouteForTruck(ctx, truck._id))
      fail(
        "TRUCK_ALREADY_RESERVED",
        "This truck already has an open route proposal.",
      );

    const tasks = await Promise.all(args.taskIds.map((taskId) => ctx.db.get(taskId)));
    for (let index = 0; index < tasks.length; index += 1) {
      const task = tasks[index];
      if (task === null)
        fail("TASK_UNAVAILABLE", "A selected collection task is unavailable.");
      if (task.status !== "pending")
        fail("TASK_NOT_PENDING", "Selected tasks must still be pending.");
      if (task.routeId !== undefined)
        fail("TASK_ALREADY_ROUTED", "A selected task already belongs to a route.");
      if (
        !hasValidRouteCoordinates({
          latitude: task.latitude,
          longitude: task.longitude,
        })
      )
        fail(
          "INVALID_TASK_COORDINATES",
          "A selected task has unusable route coordinates.",
        );
    }
    const selectedTasks = tasks as Doc<"collectionTasks">[];
    const orderedTasks = orderRouteTasks(
      { latitude: settings.depotLatitude, longitude: settings.depotLongitude },
      selectedTasks.map(toRouteTask),
    );
    const metrics = calculateRouteMetrics(
      { latitude: settings.depotLatitude, longitude: settings.depotLongitude },
      orderedTasks,
      settings.trafficPenaltyMinutes,
      settings.roadConditionPenaltyMinutes,
    );
    const routeId = await ctx.db.insert("routes", {
      displayId: await nextRouteDisplayId(ctx),
      truckId: truck._id,
      depotLatitude: settings.depotLatitude,
      depotLongitude: settings.depotLongitude,
      status: "proposed",
      orderedStopIds: [],
      currentStopIndex: 0,
      estimatedDistanceKm: metrics.totalDistanceKm,
      estimatedDurationMinutes: metrics.estimatedDurationMinutes,
      trafficPenaltyMinutes: metrics.trafficPenaltyMinutes,
      roadConditionPenaltyMinutes: metrics.roadConditionPenaltyMinutes,
    });
    const tasksById = new Map(selectedTasks.map((task) => [task._id, task]));
    const now = Date.now();
    const orderedStops: { id: Id<"routeStops">; task: RouteTask }[] = [];
    for (const orderedTask of orderedTasks) {
      const task = tasksById.get(orderedTask.id);
      if (task === undefined) throw new Error("Selected task is unavailable.");
      const stopId = await scheduleTaskOnProposedRoute(
        ctx,
        task,
        routeId,
        maximumStopCount,
        user._id,
        now,
      );
      orderedStops.push({ id: stopId, task: orderedTask });
    }
    const route = await ctx.db.get(routeId);
    if (route === null) throw new Error("Route creation failed.");
    await insertActivityEvent(
      ctx,
      "route_created",
      `Proposed route ${route.displayId} created for ${truck.displayId}.`,
      "route",
      route._id,
      user._id,
    );

    return {
      routeId: route._id,
      displayId: route.displayId,
      status: route.status,
      truck: {
        id: truck._id,
        displayId: truck.displayId,
        driverName: truck.driverName,
      },
      orderedStops: orderedStops.map(({ id, task }, index) => ({
        id,
        sequenceNumber: index + 1,
        taskId: task.id,
        taskDisplayId: task.displayId,
        priority: task.priority,
        latitude: task.latitude,
        longitude: task.longitude,
      })),
      stopCount: orderedStops.length,
      estimatedDistanceKm: metrics.totalDistanceKm,
      baseTravelMinutes: metrics.baseTravelMinutes,
      trafficPenaltyMinutes: metrics.trafficPenaltyMinutes,
      roadConditionPenaltyMinutes: metrics.roadConditionPenaltyMinutes,
      estimatedDurationMinutes: metrics.estimatedDurationMinutes,
      priorityComposition: priorityComposition(orderedTasks),
    };
  },
});

export const listRoutes = query({
  args: {},
  handler: async (ctx) => {
    await requireFleetManager(ctx);
    const routes = await ctx.db.query("routes").order("desc").collect();
    return Promise.all(
      routes.map(async (route) => {
        const [truck, stops] = await Promise.all([
          ctx.db.get(route.truckId),
          routeStops(ctx, route._id),
        ]);
        return {
          id: route._id,
          displayId: route.displayId,
          status: route.status,
          truckDisplayId: truck?.displayId ?? "Unavailable truck",
          driverName: truck?.driverName ?? "Unavailable driver",
          stopCount: stops.length,
          completedStopCount: stops.filter((stop) => stop.status === "completed")
            .length,
          currentStopIndex: route.currentStopIndex,
          estimatedDistanceKm: route.estimatedDistanceKm,
          estimatedDurationMinutes: route.estimatedDurationMinutes,
          trafficPenaltyMinutes: route.trafficPenaltyMinutes,
          roadConditionPenaltyMinutes: route.roadConditionPenaltyMinutes,
          createdAt: route._creationTime,
          startedAt: route.startedAt,
          completedAt: route.completedAt,
        };
      }),
    );
  },
});

export const getRouteDetail = query({
  args: { routeId: v.string() },
  handler: async (ctx, args) => {
    await requireFleetManager(ctx);
    const routeId = ctx.db.normalizeId("routes", args.routeId);
    if (routeId === null) return null;
    const route = await ctx.db.get(routeId);
    if (route === null) return null;
    const [truck, stops, events] = await Promise.all([
      ctx.db.get(route.truckId),
      routeStops(ctx, route._id),
      ctx.db
        .query("activityEvents")
        .withIndex("by_relatedEntityType_and_relatedEntityId", (q) =>
          q.eq("relatedEntityType", "route").eq("relatedEntityId", route._id),
        )
        .order("desc")
        .collect(),
    ]);
    const orderedStops = await Promise.all(
      stops.map(async (stop) => {
        const task = await ctx.db.get(stop.taskId);
        if (task === null)
          throw new Error(`Route stop ${stop._id} references a missing task.`);
        const source = await sourceDetails(ctx, task);
        return {
          id: stop._id,
          sequenceNumber: stop.sequenceNumber,
          status: stop.status,
          taskId: task._id,
          taskDisplayId: task.displayId,
          taskPriority: task.priority,
          taskSourceType: task.sourceType,
          taskSourceReference: source.sourceReference,
          taskReason: task.reason,
          latitude: task.latitude,
          longitude: task.longitude,
          taskStatus: task.status,
          arrivalAt: stop.arrivalAt,
          completedAt: stop.completedAt,
        };
      }),
    );
    const activityHistory = await Promise.all(
      events.map(async (event) => {
        const actor =
          event.actorUserId === undefined
            ? null
            : await ctx.db.get(event.actorUserId);
        return {
          id: event._id,
          description: event.description,
          eventType: event.eventType,
          eventTime: event._creationTime,
          actorName: actor?.name,
          previousStatus: event.previousStatus,
          nextStatus: event.nextStatus,
        };
      }),
    );
    const routeTasks = orderedStops.map((stop) => ({
      id: stop.taskId,
      displayId: stop.taskDisplayId,
      latitude: stop.latitude,
      longitude: stop.longitude,
      priority: stop.taskPriority,
    }));

    return {
      route: {
        id: route._id,
        displayId: route.displayId,
        status: route.status,
        depotLatitude: route.depotLatitude,
        depotLongitude: route.depotLongitude,
        currentStopIndex: route.currentStopIndex,
        estimatedDistanceKm: route.estimatedDistanceKm,
        baseTravelMinutes: (route.estimatedDistanceKm / DEMO_AVERAGE_SPEED_KM_PER_HOUR) * 60,
        estimatedDurationMinutes: route.estimatedDurationMinutes,
        trafficPenaltyMinutes: route.trafficPenaltyMinutes,
        roadConditionPenaltyMinutes: route.roadConditionPenaltyMinutes,
        createdAt: route._creationTime,
        startedAt: route.startedAt,
        completedAt: route.completedAt,
      },
      truck:
        truck === null
          ? null
          : {
              id: truck._id,
              displayId: truck.displayId,
              driverName: truck.driverName,
              status: truck.status,
              latitude: truck.latitude,
              longitude: truck.longitude,
              maintenanceRisk: truck.maintenanceRisk,
              source: truck.source,
            },
      orderedStops,
      priorityComposition: priorityComposition(routeTasks),
      activityHistory,
    };
  },
});
