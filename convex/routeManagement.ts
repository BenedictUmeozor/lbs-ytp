import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { calculateRouteMetrics, DEMO_AVERAGE_SPEED_KM_PER_HOUR, hasValidRouteCoordinates, orderRouteTasks, type RouteTask } from "./domain/route_algorithm";
import { requireFleetManager } from "./domain/auth";
import { canAssignRoute, canCancelRoute, canCompleteRoute, canConfirmReoptimisation, canEditProposedRoute, canStartRoute, isOpenRouteStatus, isUrgentReoptimisationCandidate, isTerminalRouteStopStatus } from "./domain/route_rules";
import { buildReoptimisationStateSnapshot, calculateRemainingRouteMetrics, changedStopIds, isNearRemainingRoute, nextOperationalStopIndex, operationalCurrentStopIndex, proposedOrderedTaskIds, remainingRoutePointDistanceMeters, reoptimisationSnapshotsMatch, routeTask, splitRouteStops } from "./domain/route_reoptimisation";
import { priorityValidator, routeStopStatusValidator, taskStatusValidator } from "./domain/validators";
import { recalculateProposedRouteMetrics, returnTaskToPendingFromProposedRoute, scheduleTaskOnProposedRoute } from "./domain/route_task_helpers";
import { syncLinkedReportTaskStatus } from "./domain/task_helpers";
import { insertActivityEvent } from "./domain/write_helpers";

type RouteErrorCode =
  | "SETTINGS_UNAVAILABLE" | "NO_TASKS_SELECTED" | "TOO_MANY_TASKS"
  | "DUPLICATE_TASK_SELECTION" | "TRUCK_UNAVAILABLE" | "TRUCK_UNDER_MAINTENANCE"
  | "TRUCK_ALREADY_RESERVED" | "TASK_UNAVAILABLE" | "TASK_NOT_PENDING"
  | "TASK_ALREADY_ROUTED" | "INVALID_TASK_COORDINATES" | "ROUTE_UNAVAILABLE"
  | "INVALID_ROUTE_TRANSITION" | "ROUTE_HAS_NO_STOPS" | "ROUTE_STOP_UNAVAILABLE"
  | "INVALID_STOP_MOVE" | "TRUCK_STATE_MISMATCH" | "TASK_STATE_MISMATCH"
  | "ACTIVE_ROUTE_ALREADY_EXISTS" | "ROUTE_HAS_INCOMPLETE_STOPS"
  | "CANCELLATION_REASON_REQUIRED" | "REOPTIMISATION_UNAVAILABLE"
  | "REOPTIMISATION_CANDIDATE_INVALID" | "REOPTIMISATION_ROUTE_FULL"
  | "REOPTIMISATION_PREVIEW_STALE" | "REOPTIMISATION_CURRENT_STOP_UNAVAILABLE";

const MAXIMUM_ROUTE_STOPS = 8;
function fail(code: RouteErrorCode, message: string): never { throw new ConvexError({ code, message }); }
function effectiveMaximumStops(maximumRouteStops: number) { return Math.min(maximumRouteStops, MAXIMUM_ROUTE_STOPS); }
function toRouteTask(task: Doc<"collectionTasks">): RouteTask { return { id: task._id, displayId: task.displayId, latitude: task.latitude, longitude: task.longitude, priority: task.priority }; }
function priorityComposition(tasks: readonly RouteTask[]) { return { critical: tasks.filter((task) => task.priority === "critical").length, high: tasks.filter((task) => task.priority === "high").length, medium: tasks.filter((task) => task.priority === "medium").length, low: tasks.filter((task) => task.priority === "low").length }; }
async function hasOpenRouteForTruck(ctx: QueryCtx | MutationCtx, truckId: Id<"trucks">) { const routes = await ctx.db.query("routes").withIndex("by_truckId", (q) => q.eq("truckId", truckId)).collect(); return routes.some((route) => isOpenRouteStatus(route.status)); }
async function nextRouteDisplayId(ctx: MutationCtx) { const routes = await ctx.db.query("routes").collect(); const highest = routes.reduce((value, route) => { const match = /^RT-(\d+)$/.exec(route.displayId); return match === null ? value : Math.max(value, Number(match[1])); }, 0); return `RT-${String(highest + 1).padStart(3, "0")}`; }
async function sourceDetails(ctx: QueryCtx, task: Doc<"collectionTasks">) { const [bin, report] = await Promise.all([task.sourceBinId === undefined ? null : ctx.db.get(task.sourceBinId), task.sourceReportId === undefined ? null : ctx.db.get(task.sourceReportId)]); return { sourceReference: bin?.displayId ?? report?.referenceNumber, locationLabel: bin?.address ?? report?.resolvedLocationName ?? report?.landmarkText, smartBinFillPercentage: task.sourceType === "smart_bin" ? bin?.currentFillPercentage : undefined }; }
async function routeStops(ctx: QueryCtx | MutationCtx, routeId: Id<"routes">) { return ctx.db.query("routeStops").withIndex("by_routeId_and_sequenceNumber", (q) => q.eq("routeId", routeId)).order("asc").collect(); }
async function routeTasks(ctx: MutationCtx, stops: readonly Doc<"routeStops">[]) { const tasks = await Promise.all(stops.map((stop) => ctx.db.get(stop.taskId))); if (tasks.some((task) => task === null)) fail("TASK_UNAVAILABLE", "A route task is unavailable."); return tasks as Doc<"collectionTasks">[]; }
function cancellationReason(reason: string) { const value = reason.trim(); if (value.length < 3 || value.length > 240) fail("CANCELLATION_REASON_REQUIRED", "Enter a cancellation reason between 3 and 240 characters."); return value; }

const reoptimisationStateEntryValidator = v.object({
  stopId: v.id("routeStops"),
  stopStatus: routeStopStatusValidator,
  taskId: v.id("collectionTasks"),
  taskStatus: taskStatusValidator,
  taskPriority: priorityValidator,
});

export const getRouteBuilderData = query({ args: {}, handler: async (ctx) => { await requireFleetManager(ctx); const [settings, trucks, tasks] = await Promise.all([ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "global")).unique(), ctx.db.query("trucks").withIndex("by_status", (q) => q.eq("status", "available")).collect(), ctx.db.query("collectionTasks").withIndex("by_status", (q) => q.eq("status", "pending")).collect()]); if (settings === null) fail("SETTINGS_UNAVAILABLE", "Route settings are unavailable."); const eligibleTrucks = (await Promise.all(trucks.map(async (truck) => ({ truck, hasOpenRoute: await hasOpenRouteForTruck(ctx, truck._id) })))).filter(({ truck, hasOpenRoute }) => truck.assignedRouteId === undefined && !hasOpenRoute).map(({ truck }) => ({ id: truck._id, displayId: truck.displayId, driverName: truck.driverName, status: truck.status, maintenanceRisk: truck.maintenanceRisk, latitude: truck.latitude, longitude: truck.longitude, capacityPercentage: truck.capacityPercentage, source: truck.source })); const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 }; const eligibleTasks = await Promise.all(tasks.filter((task) => task.routeId === undefined && hasValidRouteCoordinates({ latitude: task.latitude, longitude: task.longitude })).sort((left, right) => priorityRank[left.priority] - priorityRank[right.priority] || left._creationTime - right._creationTime || left.displayId.localeCompare(right.displayId)).map(async (task) => ({ id: task._id, displayId: task.displayId, sourceType: task.sourceType, ...(await sourceDetails(ctx, task)), latitude: task.latitude, longitude: task.longitude, priority: task.priority, reason: task.reason, createdAt: task._creationTime }))); return { settings: { depotLatitude: settings.depotLatitude, depotLongitude: settings.depotLongitude, maximumRouteStops: settings.maximumRouteStops, effectiveMaximumStops: effectiveMaximumStops(settings.maximumRouteStops), trafficPenaltyMinutes: settings.trafficPenaltyMinutes, roadConditionPenaltyMinutes: settings.roadConditionPenaltyMinutes, averageSpeedKmPerHour: DEMO_AVERAGE_SPEED_KM_PER_HOUR }, trucks: eligibleTrucks, tasks: eligibleTasks }; } });

export const generateProposedRoute = mutation({ args: { truckId: v.id("trucks"), taskIds: v.array(v.id("collectionTasks")) }, handler: async (ctx, args) => { const { user } = await requireFleetManager(ctx); const settings = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "global")).unique(); if (settings === null) fail("SETTINGS_UNAVAILABLE", "Route settings are unavailable."); if (!args.taskIds.length) fail("NO_TASKS_SELECTED", "Select at least one pending task."); if (new Set(args.taskIds).size !== args.taskIds.length) fail("DUPLICATE_TASK_SELECTION", "Select each task only once."); const maximumStopCount = effectiveMaximumStops(settings.maximumRouteStops); if (args.taskIds.length > maximumStopCount) fail("TOO_MANY_TASKS", `Select no more than ${maximumStopCount} tasks for this route.`); const truck = await ctx.db.get(args.truckId); if (truck === null) fail("TRUCK_UNAVAILABLE", "Select an available truck."); if (truck.status === "maintenance") fail("TRUCK_UNDER_MAINTENANCE", "Maintenance trucks cannot be routed."); if (truck.status !== "available" || truck.assignedRouteId !== undefined) fail("TRUCK_UNAVAILABLE", "Select an available truck."); if (await hasOpenRouteForTruck(ctx, truck._id)) fail("TRUCK_ALREADY_RESERVED", "This truck already has an open route proposal."); const tasks = await Promise.all(args.taskIds.map((taskId) => ctx.db.get(taskId))); for (const task of tasks) { if (task === null) fail("TASK_UNAVAILABLE", "A selected collection task is unavailable."); if (task.routeId !== undefined) fail("TASK_ALREADY_ROUTED", "A selected task already belongs to a route."); if (task.status !== "pending") fail("TASK_NOT_PENDING", "Selected tasks must still be pending."); if (!hasValidRouteCoordinates(task)) fail("INVALID_TASK_COORDINATES", "A selected task has unusable route coordinates."); } const selectedTasks = tasks as Doc<"collectionTasks">[]; const orderedTasks = orderRouteTasks({ latitude: settings.depotLatitude, longitude: settings.depotLongitude }, selectedTasks.map(toRouteTask)); const metrics = calculateRouteMetrics({ latitude: settings.depotLatitude, longitude: settings.depotLongitude }, orderedTasks, settings.trafficPenaltyMinutes, settings.roadConditionPenaltyMinutes); const routeId = await ctx.db.insert("routes", { displayId: await nextRouteDisplayId(ctx), truckId: truck._id, depotLatitude: settings.depotLatitude, depotLongitude: settings.depotLongitude, status: "proposed", orderedStopIds: [], currentStopIndex: 0, estimatedDistanceKm: metrics.totalDistanceKm, estimatedDurationMinutes: metrics.estimatedDurationMinutes, trafficPenaltyMinutes: metrics.trafficPenaltyMinutes, roadConditionPenaltyMinutes: metrics.roadConditionPenaltyMinutes }); const byId = new Map(selectedTasks.map((task) => [task._id, task])); const now = Date.now(); for (const orderedTask of orderedTasks) { const task = byId.get(orderedTask.id); if (!task) fail("TASK_UNAVAILABLE", "A selected collection task is unavailable."); await scheduleTaskOnProposedRoute(ctx, task, routeId, maximumStopCount, user._id, now); } const route = await ctx.db.get(routeId); if (!route) throw new Error("Route creation failed."); await insertActivityEvent(ctx, "route_created", `Proposed route ${route.displayId} created for ${truck.displayId}.`, "route", route._id, user._id); return { routeId: route._id, displayId: route.displayId }; } });

export const listRoutes = query({ args: {}, handler: async (ctx) => { await requireFleetManager(ctx); const routes = await ctx.db.query("routes").order("desc").collect(); return Promise.all(routes.map(async (route) => { const [truck, stops] = await Promise.all([ctx.db.get(route.truckId), routeStops(ctx, route._id)]); return { id: route._id, displayId: route.displayId, status: route.status, truckDisplayId: truck?.displayId ?? "Unavailable truck", driverName: truck?.driverName ?? "Unavailable driver", stopCount: stops.length, completedStopCount: stops.filter((stop) => stop.status === "completed").length, currentStopIndex: route.currentStopIndex, estimatedDistanceKm: route.estimatedDistanceKm, estimatedDurationMinutes: route.estimatedDurationMinutes, trafficPenaltyMinutes: route.trafficPenaltyMinutes, roadConditionPenaltyMinutes: route.roadConditionPenaltyMinutes, createdAt: route._creationTime, startedAt: route.startedAt, completedAt: route.completedAt }; })); } });

export const getRouteDetail = query({ args: { routeId: v.string() }, handler: async (ctx, args) => { await requireFleetManager(ctx); const routeId = ctx.db.normalizeId("routes", args.routeId); if (!routeId) return null; const route = await ctx.db.get(routeId); if (!route) return null; const [truck, stops, events] = await Promise.all([ctx.db.get(route.truckId), routeStops(ctx, route._id), ctx.db.query("activityEvents").withIndex("by_relatedEntityType_and_relatedEntityId", (q) => q.eq("relatedEntityType", "route").eq("relatedEntityId", route._id)).order("desc").collect()]); const orderedStops = await Promise.all(stops.map(async (stop, index) => { const task = await ctx.db.get(stop.taskId); if (!task) throw new Error(`Route stop ${stop._id} references a missing task.`); return { id: stop._id, sequenceNumber: stop.sequenceNumber, status: stop.status, taskId: task._id, taskDisplayId: task.displayId, taskPriority: task.priority, taskSourceType: task.sourceType, ...(await sourceDetails(ctx, task)), taskReason: task.reason, latitude: task.latitude, longitude: task.longitude, taskStatus: task.status, arrivalAt: stop.arrivalAt, completedAt: stop.completedAt, canMoveUp: canEditProposedRoute(route) && index > 0, canMoveDown: canEditProposedRoute(route) && index < stops.length - 1, canRemove: canEditProposedRoute(route) && stops.length > 1 }; })); const tasksTerminal = orderedStops.every((stop) => ["collected", "unable_to_complete"].includes(stop.taskStatus)); const activityHistory = await Promise.all(events.map(async (event) => { const actor = event.actorUserId === undefined ? null : await ctx.db.get(event.actorUserId); return { id: event._id, description: event.description, eventType: event.eventType, eventTime: event._creationTime, actorName: actor?.name, previousStatus: event.previousStatus, nextStatus: event.nextStatus }; })); const taskList = orderedStops.map((stop) => ({ id: stop.taskId, displayId: stop.taskDisplayId, latitude: stop.latitude, longitude: stop.longitude, priority: stop.taskPriority })); return { route: { id: route._id, displayId: route.displayId, status: route.status, depotLatitude: route.depotLatitude, depotLongitude: route.depotLongitude, currentStopIndex: route.currentStopIndex, estimatedDistanceKm: route.estimatedDistanceKm, baseTravelMinutes: (route.estimatedDistanceKm / DEMO_AVERAGE_SPEED_KM_PER_HOUR) * 60, estimatedDurationMinutes: route.estimatedDurationMinutes, trafficPenaltyMinutes: route.trafficPenaltyMinutes, roadConditionPenaltyMinutes: route.roadConditionPenaltyMinutes, createdAt: route._creationTime, startedAt: route.startedAt, completedAt: route.completedAt }, truck: truck && { id: truck._id, displayId: truck.displayId, driverName: truck.driverName, status: truck.status, latitude: truck.latitude, longitude: truck.longitude, maintenanceRisk: truck.maintenanceRisk, source: truck.source }, orderedStops, priorityComposition: priorityComposition(taskList), activityHistory, actions: { canEditStops: canEditProposedRoute(route), canAssign: canAssignRoute(route, stops.length), canStart: canStartRoute(route), canCancel: canCancelRoute(route), canComplete: canCompleteRoute(route, stops.map((stop) => stop.status)) && tasksTerminal } }; } });

export const moveProposedStop = mutation({ args: { routeId: v.id("routes"), stopId: v.id("routeStops"), direction: v.union(v.literal("up"), v.literal("down")) }, handler: async (ctx, args) => { const { user } = await requireFleetManager(ctx); const route = await ctx.db.get(args.routeId); if (!route) fail("ROUTE_UNAVAILABLE", "The route is unavailable."); if (!canEditProposedRoute(route)) fail("INVALID_ROUTE_TRANSITION", "Only proposed routes can be reordered."); const stops = await routeStops(ctx, route._id); const index = stops.findIndex((stop) => stop._id === args.stopId); if (index < 0) fail("ROUTE_STOP_UNAVAILABLE", "The route stop is unavailable."); const swap = args.direction === "up" ? index - 1 : index + 1; if (swap < 0 || swap >= stops.length) fail("INVALID_STOP_MOVE", "That stop cannot be moved further in this direction."); [stops[index], stops[swap]] = [stops[swap], stops[index]]; for (const [sequence, stop] of stops.entries()) await ctx.db.patch(stop._id, { sequenceNumber: sequence + 1 }); const update = await recalculateProposedRouteMetrics(ctx, route, stops); await insertActivityEvent(ctx, "route_order_changed", `Route ${route.displayId} stop order changed manually.`, "route", route._id, user._id); return update; } });

export const assignRoute = mutation({ args: { routeId: v.id("routes") }, handler: async (ctx, args) => { const { user } = await requireFleetManager(ctx); const route = await ctx.db.get(args.routeId); if (!route) fail("ROUTE_UNAVAILABLE", "The route is unavailable."); const stops = await routeStops(ctx, route._id); if (!canAssignRoute(route, stops.length)) fail(stops.length ? "INVALID_ROUTE_TRANSITION" : "ROUTE_HAS_NO_STOPS", stops.length ? "Only proposed routes can be assigned." : "A route needs at least one stop before assignment."); const settings = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "global")).unique(); if (!settings || stops.length > effectiveMaximumStops(settings.maximumRouteStops)) fail("TOO_MANY_TASKS", "This route exceeds the configured stop limit."); const truck = await ctx.db.get(route.truckId); if (!truck) fail("TRUCK_UNAVAILABLE", "The route truck is unavailable."); if (truck.status === "maintenance") fail("TRUCK_UNDER_MAINTENANCE", "Maintenance trucks cannot be assigned."); if (truck.status !== "available" || truck.assignedRouteId !== undefined) fail("TRUCK_STATE_MISMATCH", "The route truck is no longer available."); if (await hasOpenRouteForTruck(ctx, truck._id)) { const open = await ctx.db.query("routes").withIndex("by_truckId", (q) => q.eq("truckId", truck._id)).collect(); if (open.some((candidate) => candidate._id !== route._id && isOpenRouteStatus(candidate.status))) fail("TRUCK_ALREADY_RESERVED", "This truck is reserved by another open route."); } const tasks = await routeTasks(ctx, stops); for (const task of tasks) if (task.status !== "scheduled" || task.routeId !== route._id || task.assignedTruckId !== undefined) fail("TASK_STATE_MISMATCH", "Every route task must still be scheduled only on this route."); const now = Date.now(); await ctx.db.patch(route._id, { status: "assigned" }); await ctx.db.patch(truck._id, { status: "assigned", assignedRouteId: route._id }); for (const task of tasks) { await ctx.db.patch(task._id, { status: "assigned", assignedTruckId: truck._id, statusUpdatedAt: now }); await syncLinkedReportTaskStatus(ctx, task, "assigned", user._id, now); await insertActivityEvent(ctx, "task_status_changed", `Task ${task.displayId} assigned to ${truck.displayId}.`, "collection_task", task._id, user._id, "scheduled", "assigned"); } await insertActivityEvent(ctx, "route_assigned", `Route ${route.displayId} assigned to ${truck.displayId}.`, "route", route._id, user._id, "proposed", "assigned"); return null; } });

export const startRoute = mutation({ args: { routeId: v.id("routes") }, handler: async (ctx, args) => { const { user } = await requireFleetManager(ctx); const route = await ctx.db.get(args.routeId); if (!route) fail("ROUTE_UNAVAILABLE", "The route is unavailable."); if (!canStartRoute(route)) fail("INVALID_ROUTE_TRANSITION", "Only assigned routes can be started."); const active = await ctx.db.query("routes").withIndex("by_status", (q) => q.eq("status", "active")).first(); if (active) fail("ACTIVE_ROUTE_ALREADY_EXISTS", "Another route is already active."); const [truck, stops] = await Promise.all([ctx.db.get(route.truckId), routeStops(ctx, route._id)]); if (!truck || truck.status !== "assigned" || truck.assignedRouteId !== route._id) fail("TRUCK_STATE_MISMATCH", "The route truck is not assigned to this route."); if (!stops.length) fail("ROUTE_HAS_NO_STOPS", "A route needs at least one stop before starting."); const tasks = await routeTasks(ctx, stops); if (tasks.some((task) => task.status !== "assigned" || task.routeId !== route._id || task.assignedTruckId !== truck._id)) fail("TASK_STATE_MISMATCH", "Every route task must be assigned to the route truck."); const now = Date.now(); await ctx.db.patch(route._id, { status: "active", startedAt: now, currentStopIndex: 0 }); await ctx.db.patch(truck._id, { status: "on_route" }); for (const [index, stop] of stops.entries()) if (index === 0) await ctx.db.patch(stop._id, { status: "current" }); else if (stop.status !== "pending") await ctx.db.patch(stop._id, { status: "pending" }); for (const task of tasks) { await ctx.db.patch(task._id, { status: "en_route", statusUpdatedAt: now }); await syncLinkedReportTaskStatus(ctx, task, "en_route", user._id, now); await insertActivityEvent(ctx, "task_status_changed", `Task ${task.displayId} is en route.`, "collection_task", task._id, user._id, "assigned", "en_route"); } await insertActivityEvent(ctx, "route_started", `Route ${route.displayId} started.`, "route", route._id, user._id, "assigned", "active"); return null; } });

export const cancelProposedRoute = mutation({ args: { routeId: v.id("routes"), reason: v.string() }, handler: async (ctx, args) => { const { user } = await requireFleetManager(ctx); const reason = cancellationReason(args.reason); const route = await ctx.db.get(args.routeId); if (!route) fail("ROUTE_UNAVAILABLE", "The route is unavailable."); if (!canCancelRoute(route)) fail("INVALID_ROUTE_TRANSITION", "Only proposed routes can be cancelled."); const stops = await routeStops(ctx, route._id); const tasks = await routeTasks(ctx, stops); if (tasks.some((task) => task.status !== "scheduled" || task.routeId !== route._id)) fail("TASK_STATE_MISMATCH", "Only scheduled tasks on this proposal can be cancelled."); const now = Date.now(); for (const stop of stops) await ctx.db.delete(stop._id); for (const task of tasks) await returnTaskToPendingFromProposedRoute(ctx, task, route, user._id, now); await ctx.db.patch(route._id, { status: "cancelled", orderedStopIds: [], currentStopIndex: 0, estimatedDistanceKm: 0, estimatedDurationMinutes: 0 }); await insertActivityEvent(ctx, "route_cancelled", `Route ${route.displayId} cancelled: ${reason}`, "route", route._id, user._id, "proposed", "cancelled"); return null; } });

export const completeRoute = mutation({ args: { routeId: v.id("routes") }, handler: async (ctx, args) => { const { user } = await requireFleetManager(ctx); const route = await ctx.db.get(args.routeId); if (!route) fail("ROUTE_UNAVAILABLE", "The route is unavailable."); if (route.status !== "active") fail("INVALID_ROUTE_TRANSITION", "Only active routes can be completed."); const [truck, stops] = await Promise.all([ctx.db.get(route.truckId), routeStops(ctx, route._id)]); if (!truck || truck.assignedRouteId !== route._id || truck.status !== "on_route") fail("TRUCK_STATE_MISMATCH", "The route truck is not active on this route."); const tasks = await routeTasks(ctx, stops); if (!canCompleteRoute(route, stops.map((stop) => stop.status)) || !tasks.every((task) => ["collected", "unable_to_complete"].includes(task.status))) fail("ROUTE_HAS_INCOMPLETE_STOPS", "Complete or mark unable every route stop and task first."); const now = Date.now(); await ctx.db.patch(route._id, { status: "completed", completedAt: now, currentStopIndex: stops.length }); await ctx.db.patch(truck._id, { status: "available", assignedRouteId: undefined }); await insertActivityEvent(ctx, "route_completed", `Route ${route.displayId} completed.`, "route", route._id, user._id, "active", "completed"); return null; } });

async function activeRouteData(ctx: QueryCtx | MutationCtx) {
  const route = await ctx.db.query("routes").withIndex("by_status", (q) => q.eq("status", "active")).first();
  if (route === null) return null;
  const [truck, stops] = await Promise.all([ctx.db.get(route.truckId), routeStops(ctx, route._id)]);
  if (truck === null) return null;
  const tasks = await Promise.all(stops.map((stop) => ctx.db.get(stop.taskId)));
  if (tasks.some((task) => task === null)) fail("TASK_UNAVAILABLE", "A route task is unavailable.");
  return { route, truck, stops: stops.map((stop, index) => ({ stop, task: tasks[index] as Doc<"collectionTasks"> })) };
}

function activeRouteMetrics(data: NonNullable<Awaited<ReturnType<typeof activeRouteData>>>) {
  const split = splitRouteStops(data.stops);
  if (split.operationalCurrent === null) return { split, metrics: null };
  const future = split.futurePending.map(({ task }) => routeTask(task));
  return {
    split,
    metrics: calculateRemainingRouteMetrics(
      data.truck,
      split.operationalCurrent,
      future,
      data.stops.length,
      data.stops.filter(({ stop }) => !isTerminalRouteStopStatus(stop.status)).length,
      data.route.trafficPenaltyMinutes,
      data.route.roadConditionPenaltyMinutes,
    ),
  };
}

export const getActiveRouteOperations = query({ args: {}, handler: async (ctx) => {
  await requireFleetManager(ctx);
  const data = await activeRouteData(ctx);
  if (data === null) return null;
  const [settings] = await Promise.all([
    ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "global")).unique(),
  ]);
  const maximumStopCount = settings === null ? MAXIMUM_ROUTE_STOPS : effectiveMaximumStops(settings.maximumRouteStops);
  const { split, metrics } = activeRouteMetrics(data);
  const currentIndex = split.operationalCurrentIndex;
  const nextIndex = nextOperationalStopIndex(data.stops, currentIndex);
  const candidates = (await Promise.all(
    (await ctx.db.query("collectionTasks").withIndex("by_status_and_priority", (q) => q.eq("status", "pending").eq("priority", "critical")).collect())
      .filter(isUrgentReoptimisationCandidate)
      .map(async (task) => {
        const distanceMeters = split.operationalCurrent === null ? Number.POSITIVE_INFINITY : remainingRoutePointDistanceMeters(task, data.truck, split.operationalCurrent, data.stops);
        const capacityAvailable = data.stops.length < maximumStopCount;
        return { id: task._id, displayId: task.displayId, sourceType: task.sourceType, ...(await sourceDetails(ctx, task)), reason: task.reason, latitude: task.latitude, longitude: task.longitude, createdAt: task._creationTime, distanceMeters, isNearRoute: isNearRemainingRoute(distanceMeters), canReview: split.operationalCurrent !== null && capacityAvailable, unavailabilityReason: capacityAvailable ? undefined : "The active route is at its eight-stop limit." };
      }),
  )).sort((a, b) => Number(b.isNearRoute) - Number(a.isNearRoute) || a.distanceMeters - b.distanceMeters || a.createdAt - b.createdAt || a.displayId.localeCompare(b.displayId));
  return {
    route: { id: data.route._id, displayId: data.route.displayId, status: data.route.status, depotLatitude: data.route.depotLatitude, depotLongitude: data.route.depotLongitude, estimatedDistanceKm: data.route.estimatedDistanceKm, estimatedDurationMinutes: data.route.estimatedDurationMinutes, trafficPenaltyMinutes: data.route.trafficPenaltyMinutes, roadConditionPenaltyMinutes: data.route.roadConditionPenaltyMinutes, startedAt: data.route.startedAt },
    truck: { id: data.truck._id, displayId: data.truck.displayId, driverName: data.truck.driverName, status: data.truck.status, latitude: data.truck.latitude, longitude: data.truck.longitude, source: data.truck.source, locationLabel: data.truck.source === "simulated" ? "Simulated truck location" : "Static operational truck location" },
    stops: data.stops.map(({ stop, task }, index) => ({ id: stop._id, sequenceNumber: stop.sequenceNumber, status: stop.status, taskId: task._id, taskDisplayId: task.displayId, taskPriority: task.priority, taskStatus: task.status, reason: task.reason, latitude: task.latitude, longitude: task.longitude, completedAt: stop.completedAt, isTerminal: isTerminalRouteStopStatus(stop.status), isOperationalCurrent: index === currentIndex, isNext: index === nextIndex, isRemaining: index >= currentIndex && !isTerminalRouteStopStatus(stop.status) })),
    progress: { totalStops: data.stops.length, completedStopCount: data.stops.filter(({ stop }) => stop.status === "completed").length, unableStopCount: data.stops.filter(({ stop }) => stop.status === "unable_to_complete").length, terminalStopCount: data.stops.filter(({ stop }) => isTerminalRouteStopStatus(stop.status)).length, remainingStopCount: data.stops.filter(({ stop }) => !isTerminalRouteStopStatus(stop.status)).length, progressPercentage: data.stops.length === 0 ? 0 : Math.round((data.stops.filter(({ stop }) => isTerminalRouteStopStatus(stop.status)).length / data.stops.length) * 100), operationalCurrentStopId: split.operationalCurrent?.stop._id, nextStopId: nextIndex < 0 ? undefined : data.stops[nextIndex].stop._id, ...metrics },
    candidates,
  };
} });

export const getReoptimisationPreview = query({ args: { routeId: v.id("routes"), candidateTaskId: v.id("collectionTasks") }, handler: async (ctx, args) => {
  await requireFleetManager(ctx);
  const data = await activeRouteData(ctx);
  const candidate = await ctx.db.get(args.candidateTaskId);
  if (data === null || data.route._id !== args.routeId) fail("REOPTIMISATION_UNAVAILABLE", "This route is not the active route.");
  if (candidate === null || !isUrgentReoptimisationCandidate(candidate)) fail("REOPTIMISATION_CANDIDATE_INVALID", "This critical task is no longer eligible for route review.");
  const settings = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "global")).unique();
  const maximumStopCount = settings === null ? MAXIMUM_ROUTE_STOPS : effectiveMaximumStops(settings.maximumRouteStops);
  if (data.stops.length >= maximumStopCount) fail("REOPTIMISATION_ROUTE_FULL", "The active route is at its stop limit.");
  const { split, metrics: currentRemainingMetrics } = activeRouteMetrics(data);
  if (split.operationalCurrent === null || currentRemainingMetrics === null) fail("REOPTIMISATION_CURRENT_STOP_UNAVAILABLE", "The active route has no operational current stop.");
  const proposedTaskIds = proposedOrderedTaskIds(data.stops, candidate);
  if (proposedTaskIds === null) fail("REOPTIMISATION_CURRENT_STOP_UNAVAILABLE", "The active route has no operational current stop.");
  const taskById = new Map<Id<"collectionTasks">, Doc<"collectionTasks">>(
    data.stops.map(({ task }) => [task._id, task] as const),
  );
  taskById.set(candidate._id, candidate);
  const proposedTasks = proposedTaskIds.map((id) => taskById.get(id)).filter((task): task is Doc<"collectionTasks"> => task !== undefined);
  const proposedFuture = proposedTasks.slice(split.operationalCurrentIndex + 1).filter((task) => task.status === "pending" || task._id === candidate._id).map(routeTask);
  const proposedRemainingMetrics = calculateRemainingRouteMetrics(data.truck, split.operationalCurrent, proposedFuture, data.stops.length + 1, data.stops.filter(({ stop }) => !isTerminalRouteStopStatus(stop.status)).length + 1, data.route.trafficPenaltyMinutes, data.route.roadConditionPenaltyMinutes);
  const distanceMeters = remainingRoutePointDistanceMeters(candidate, data.truck, split.operationalCurrent, data.stops);
  const currentTaskIds = data.stops.map(({ task }) => task._id);
  return { routeId: data.route._id, candidate: { id: candidate._id, displayId: candidate.displayId, priority: candidate.priority, reason: candidate.reason, latitude: candidate.latitude, longitude: candidate.longitude }, distanceMeters, isNearRoute: isNearRemainingRoute(distanceMeters), fixedTerminalStops: split.terminal.map(({ stop }) => stop._id), operationalCurrentStop: split.operationalCurrent.stop._id, existingFutureOrder: split.futurePending.map(({ stop }) => stop._id), proposedFutureOrder: proposedTaskIds.slice(split.operationalCurrentIndex + 1), completeProposedTaskOrder: proposedTaskIds, movedTaskIds: changedStopIds(currentTaskIds, proposedTaskIds), currentRemainingMetrics, proposedRemainingMetrics, currentFullRouteMetrics: { distanceKm: data.route.estimatedDistanceKm, durationMinutes: data.route.estimatedDurationMinutes }, proposedFullRouteMetrics: calculateRouteMetrics({ latitude: data.route.depotLatitude, longitude: data.route.depotLongitude }, proposedTasks.map(routeTask), data.route.trafficPenaltyMinutes, data.route.roadConditionPenaltyMinutes), explanation: `The operational current stop remains fixed. ${candidate.displayId} is added after it and only later pending stops are reordered.`, expectedOrderedStopIds: data.stops.map(({ stop }) => stop._id), expectedRouteState: buildReoptimisationStateSnapshot(data.stops), proposedTaskOrder: proposedTaskIds, expectedCurrentStopIndex: split.operationalCurrentIndex };
} });

export const confirmReoptimisation = mutation({ args: { routeId: v.id("routes"), candidateTaskId: v.id("collectionTasks"), expectedRouteState: v.array(reoptimisationStateEntryValidator), proposedTaskOrder: v.array(v.id("collectionTasks")), expectedCurrentStopIndex: v.number(), expectedCandidateLatitude: v.number(), expectedCandidateLongitude: v.number() }, handler: async (ctx, args) => {
  const { user } = await requireFleetManager(ctx);
  const data = await activeRouteData(ctx);
  const candidate = await ctx.db.get(args.candidateTaskId);
  if (data === null || data.route._id !== args.routeId || data.route.status !== "active" || data.truck.status !== "on_route" || data.truck.assignedRouteId !== data.route._id) fail("REOPTIMISATION_UNAVAILABLE", "Route re-optimisation is unavailable.");
  const activeRoutes = await ctx.db.query("routes").withIndex("by_status", (q) => q.eq("status", "active")).collect();
  if (activeRoutes.length !== 1) fail("REOPTIMISATION_UNAVAILABLE", "Route re-optimisation requires one active route.");
  if (candidate === null || !isUrgentReoptimisationCandidate(candidate) || candidate.latitude !== args.expectedCandidateLatitude || candidate.longitude !== args.expectedCandidateLongitude) fail("REOPTIMISATION_CANDIDATE_INVALID", "This critical task is no longer eligible for route review.");
  const settings = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "global")).unique();
  const maximumStopCount = settings === null ? MAXIMUM_ROUTE_STOPS : effectiveMaximumStops(settings.maximumRouteStops);
  if (data.stops.length >= maximumStopCount) fail("REOPTIMISATION_ROUTE_FULL", "The active route is at its stop limit.");
  const stale = () => fail("REOPTIMISATION_PREVIEW_STALE", "The route changed after this preview. Generate a new preview before confirming.");
  const currentSnapshot = buildReoptimisationStateSnapshot(data.stops);
  const currentIndex = operationalCurrentStopIndex(data.stops);
  const routeTasksConsistent = data.stops.every(({ stop, task }) =>
    task.routeId === data.route._id &&
    task.assignedTruckId === data.truck._id &&
    (stop.status === "completed"
      ? task.status === "collected"
      : stop.status === "unable_to_complete"
        ? task.status === "unable_to_complete"
        : task.status === "en_route"),
  );
  if (!routeTasksConsistent || !reoptimisationSnapshotsMatch(currentSnapshot, args.expectedRouteState)) stale();
  const recalculatedProposal = proposedOrderedTaskIds(data.stops, candidate);
  if (currentIndex < 0 || recalculatedProposal === null) fail("REOPTIMISATION_CURRENT_STOP_UNAVAILABLE", "The active route has no operational current stop.");
  if (currentIndex !== args.expectedCurrentStopIndex || recalculatedProposal.length !== args.proposedTaskOrder.length || recalculatedProposal.some((taskId, index) => taskId !== args.proposedTaskOrder[index])) stale();
  const expectedTaskIds = new Set([...data.stops.map(({ task }) => task._id), candidate._id]);
  const submittedTaskIds = new Set(args.proposedTaskOrder);
  if (submittedTaskIds.size !== args.proposedTaskOrder.length || submittedTaskIds.size !== expectedTaskIds.size || args.proposedTaskOrder.some((taskId) => !expectedTaskIds.has(taskId))) stale();
  const taskById = new Map(data.stops.map(({ task }) => [task._id, task] as const));
  taskById.set(candidate._id, candidate);
  if (args.proposedTaskOrder.some((taskId) => !taskById.has(taskId))) stale();
  const split = splitRouteStops(data.stops);
  if (!canConfirmReoptimisation(data.route, split.operationalCurrent !== null, data.stops.length, maximumStopCount, candidate)) fail("REOPTIMISATION_UNAVAILABLE", "Route re-optimisation is unavailable.");
  const now = Date.now();
  await ctx.db.patch(candidate._id, { routeId: data.route._id, scheduledAt: now, statusUpdatedAt: now, status: "scheduled" });
  await syncLinkedReportTaskStatus(ctx, candidate, "scheduled", user._id, now);
  await insertActivityEvent(ctx, "task_status_changed", `Task ${candidate.displayId} scheduled on ${data.route.displayId}.`, "collection_task", candidate._id, user._id, "pending", "scheduled");
  await ctx.db.patch(candidate._id, { assignedTruckId: data.truck._id, status: "assigned", statusUpdatedAt: now });
  await syncLinkedReportTaskStatus(ctx, candidate, "assigned", user._id, now);
  await insertActivityEvent(ctx, "task_status_changed", `Task ${candidate.displayId} assigned to ${data.truck.displayId}.`, "collection_task", candidate._id, user._id, "scheduled", "assigned");
  await ctx.db.patch(candidate._id, { status: "en_route", statusUpdatedAt: now });
  await syncLinkedReportTaskStatus(ctx, candidate, "en_route", user._id, now);
  await insertActivityEvent(ctx, "task_status_changed", `Task ${candidate.displayId} is en route.`, "collection_task", candidate._id, user._id, "assigned", "en_route");
  const newStopId = await ctx.db.insert("routeStops", { routeId: data.route._id, taskId: candidate._id, sequenceNumber: data.stops.length + 1, status: "pending" });
  const stopIdByTaskId = new Map(data.stops.map(({ stop, task }) => [task._id, stop._id]));
  stopIdByTaskId.set(candidate._id, newStopId);
  const orderedStopIds = args.proposedTaskOrder.map((taskId) => stopIdByTaskId.get(taskId)!);
  for (const [index, stopId] of orderedStopIds.entries()) await ctx.db.patch(stopId, { sequenceNumber: index + 1 });
  const orderedTasks = args.proposedTaskOrder.map((taskId) => taskById.get(taskId)!);
  const fullMetrics = calculateRouteMetrics({ latitude: data.route.depotLatitude, longitude: data.route.depotLongitude }, orderedTasks.map(routeTask), data.route.trafficPenaltyMinutes, data.route.roadConditionPenaltyMinutes);
  await ctx.db.patch(data.route._id, { orderedStopIds, currentStopIndex: orderedStopIds.indexOf(data.stops[currentIndex].stop._id), estimatedDistanceKm: fullMetrics.totalDistanceKm, estimatedDurationMinutes: fullMetrics.estimatedDurationMinutes });
  const notifications = await ctx.db.query("notifications").withIndex("by_relatedEntityType_and_relatedEntityId", (q) => q.eq("relatedEntityType", "collection_task").eq("relatedEntityId", candidate._id)).collect();
  for (const notification of notifications) if (notification.type === "route_reoptimisation_suggested" && notification.readAt === undefined) await ctx.db.patch(notification._id, { readAt: now });
  const near = isNearRemainingRoute(remainingRoutePointDistanceMeters(candidate, data.truck, split.operationalCurrent!, data.stops));
  await insertActivityEvent(ctx, "route_task_linked", `Task ${candidate.displayId} linked to ${data.route.displayId}.`, "collection_task", candidate._id, user._id);
  await insertActivityEvent(ctx, "route_reoptimised", `Manager confirmed ${candidate.displayId} ${near ? "near the remaining route" : "outside the 1 km route-review radius"} for ${data.route.displayId}.`, "route", data.route._id, user._id);
  return null;
} });
