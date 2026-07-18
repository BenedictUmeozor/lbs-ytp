import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { calculateRouteMetrics, type RouteTask } from "./route_algorithm";
import { syncLinkedReportTaskStatus } from "./task_helpers";
import { insertActivityEvent } from "./write_helpers";

type RouteTaskErrorCode =
  | "TASK_NOT_ELIGIBLE_FOR_ROUTE"
  | "ROUTE_NOT_PROPOSED"
  | "TASK_ALREADY_ROUTED"
  | "ROUTE_STOP_LIMIT_REACHED"
  | "ROUTE_STOP_UNAVAILABLE"
  | "FINAL_ROUTE_STOP_REQUIRED";

function fail(code: RouteTaskErrorCode, message: string): never {
  throw new ConvexError({ code, message });
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

export async function recalculateProposedRouteMetrics(
  ctx: MutationCtx,
  route: Doc<"routes">,
  stops: readonly Doc<"routeStops">[],
) {
  const tasks = await Promise.all(stops.map((stop) => ctx.db.get(stop.taskId)));
  const routeTasks: RouteTask[] = [];
  for (const task of tasks) {
    if (task === null)
      fail("ROUTE_STOP_UNAVAILABLE", "The route stop is unavailable.");
    routeTasks.push(toRouteTask(task));
  }
  const metrics = calculateRouteMetrics(
    { latitude: route.depotLatitude, longitude: route.depotLongitude },
    routeTasks,
    route.trafficPenaltyMinutes,
    route.roadConditionPenaltyMinutes,
  );
  const update = {
    orderedStopIds: stops.map((stop) => stop._id),
    estimatedDistanceKm: metrics.totalDistanceKm,
    estimatedDurationMinutes: metrics.estimatedDurationMinutes,
  };
  await ctx.db.patch(route._id, update);
  return update;
}

export async function updateTaskRouteStopStatus(
  ctx: MutationCtx,
  task: Doc<"collectionTasks">,
  status: "completed" | "unable_to_complete",
  now: number,
) {
  const stop = await ctx.db
    .query("routeStops")
    .withIndex("by_taskId", (q) => q.eq("taskId", task._id))
    .first();
  if (stop === null) return null;
  if (task.routeId !== undefined && stop.routeId !== task.routeId)
    throw new Error("The route stop does not belong to the task route.");
  if (["completed", "unable_to_complete"].includes(stop.status)) return stop;
  await ctx.db.patch(stop._id, {
    status,
    ...(status === "completed"
      ? { completedAt: now }
      : { completedAt: undefined }),
  });
  return stop;
}

export async function addTaskToProposedRoute(
  ctx: MutationCtx,
  taskId: Id<"collectionTasks">,
  routeId: Id<"routes">,
  maximumStopCount: number,
) {
  const [task, route, existingStop] = await Promise.all([
    ctx.db.get(taskId),
    ctx.db.get(routeId),
    ctx.db
      .query("routeStops")
      .withIndex("by_taskId", (q) => q.eq("taskId", taskId))
      .first(),
  ]);
  if (task === null)
    fail(
      "TASK_NOT_ELIGIBLE_FOR_ROUTE",
      "Only an unscheduled pending task can be added to a route.",
    );
  if (task.routeId !== undefined || existingStop !== null)
    fail("TASK_ALREADY_ROUTED", "This task already belongs to a route.");
  if (task.status !== "pending")
    fail(
      "TASK_NOT_ELIGIBLE_FOR_ROUTE",
      "Only an unscheduled pending task can be added to a route.",
    );
  if (route === null || route.status !== "proposed")
    fail("ROUTE_NOT_PROPOSED", "Select a proposed route.");
  const stops = await ctx.db
    .query("routeStops")
    .withIndex("by_routeId_and_sequenceNumber", (q) =>
      q.eq("routeId", route._id),
    )
    .order("asc")
    .collect();
  if (stops.length >= maximumStopCount)
    fail(
      "ROUTE_STOP_LIMIT_REACHED",
      "This proposed route is already at its stop limit.",
    );
  const stopId = await ctx.db.insert("routeStops", {
    routeId: route._id,
    taskId,
    sequenceNumber: stops.length + 1,
    status: "pending",
  });
  const updatedStops = await ctx.db
    .query("routeStops")
    .withIndex("by_routeId_and_sequenceNumber", (q) =>
      q.eq("routeId", route._id),
    )
    .order("asc")
    .collect();
  if (updatedStops.at(-1)?._id !== stopId)
    fail("ROUTE_STOP_UNAVAILABLE", "The route stop could not be appended.");
  const update = await recalculateProposedRouteMetrics(
    ctx,
    route,
    updatedStops,
  );
  return { route: { ...route, ...update }, stopId };
}

export async function scheduleTaskOnProposedRoute(
  ctx: MutationCtx,
  task: Doc<"collectionTasks">,
  routeId: Id<"routes">,
  maximumStopCount: number,
  actorUserId: Id<"users">,
  now: number,
) {
  const { route, stopId } = await addTaskToProposedRoute(
    ctx,
    task._id,
    routeId,
    maximumStopCount,
  );
  await ctx.db.patch(task._id, {
    status: "scheduled",
    routeId: route._id,
    scheduledAt: now,
    statusUpdatedAt: now,
  });
  await syncLinkedReportTaskStatus(ctx, task, "scheduled", actorUserId, now);
  await insertActivityEvent(
    ctx,
    "task_status_changed",
    `Task ${task.displayId} scheduled on ${route.displayId}.`,
    "collection_task",
    task._id,
    actorUserId,
    "pending",
    "scheduled",
  );
  await insertActivityEvent(
    ctx,
    "route_task_linked",
    `Task ${task.displayId} added to proposed route ${route.displayId}.`,
    "route",
    route._id,
    actorUserId,
  );
  return stopId;
}

export async function returnTaskToPendingFromProposedRoute(
  ctx: MutationCtx,
  task: Doc<"collectionTasks">,
  route: Doc<"routes">,
  actorUserId: Id<"users">,
  now: number,
) {
  await ctx.db.patch(task._id, {
    status: "pending",
    routeId: undefined,
    scheduledAt: undefined,
    assignedTruckId: undefined,
    statusUpdatedAt: now,
  });
  await syncLinkedReportTaskStatus(ctx, task, "pending", actorUserId, now);
  await insertActivityEvent(
    ctx,
    "task_status_changed",
    `Task ${task.displayId} returned to pending.`,
    "collection_task",
    task._id,
    actorUserId,
    "scheduled",
    "pending",
  );
  await insertActivityEvent(
    ctx,
    "route_task_unlinked",
    `Task ${task.displayId} removed from proposed route ${route.displayId}.`,
    "route",
    route._id,
    actorUserId,
  );
}

export async function removeTaskFromProposedRoute(
  ctx: MutationCtx,
  taskId: Id<"collectionTasks">,
) {
  const task = await ctx.db.get(taskId);
  if (
    task === null ||
    task.status !== "scheduled" ||
    task.routeId === undefined
  )
    fail(
      "TASK_NOT_ELIGIBLE_FOR_ROUTE",
      "Only a scheduled task can be removed from its route.",
    );
  const route = await ctx.db.get(task.routeId);
  if (route === null || route.status !== "proposed")
    fail(
      "ROUTE_NOT_PROPOSED",
      "Only an unstarted proposed route can be changed.",
    );
  const [stop, stops] = await Promise.all([
    ctx.db
      .query("routeStops")
      .withIndex("by_taskId", (q) => q.eq("taskId", task._id))
      .first(),
    ctx.db
      .query("routeStops")
      .withIndex("by_routeId_and_sequenceNumber", (q) =>
        q.eq("routeId", route._id),
      )
      .order("asc")
      .collect(),
  ]);
  if (stop === null || stop.routeId !== route._id)
    fail("ROUTE_STOP_UNAVAILABLE", "The route stop is unavailable.");
  if (stops.length === 1)
    fail(
      "FINAL_ROUTE_STOP_REQUIRED",
      "The final stop cannot be removed. Cancel the proposed route instead.",
    );
  await ctx.db.delete(stop._id);
  const remaining = await ctx.db
    .query("routeStops")
    .withIndex("by_routeId_and_sequenceNumber", (q) =>
      q.eq("routeId", route._id),
    )
    .order("asc")
    .collect();
  for (const [index, routeStop] of remaining.entries()) {
    if (routeStop.sequenceNumber !== index + 1)
      await ctx.db.patch(routeStop._id, { sequenceNumber: index + 1 });
  }
  const update = await recalculateProposedRouteMetrics(ctx, route, remaining);
  return { ...route, ...update };
}
