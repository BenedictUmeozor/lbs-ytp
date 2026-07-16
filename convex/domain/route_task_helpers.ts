import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

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
  if (
    stop.status === status &&
    (status !== "completed" || stop.completedAt !== undefined)
  )
    return stop;
  await ctx.db.patch(stop._id, {
    status,
    ...(status === "completed" ? { completedAt: now } : {}),
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
  if (task === null || task.status !== "pending" || task.routeId !== undefined)
    throw new Error(
      "Only an unscheduled pending task can be added to a route.",
    );
  if (route === null || route.status !== "proposed")
    throw new Error("Select a proposed route.");
  if (existingStop !== null)
    throw new Error("This task already belongs to a route.");
  const stops = await ctx.db
    .query("routeStops")
    .withIndex("by_routeId_and_sequenceNumber", (q) =>
      q.eq("routeId", route._id),
    )
    .order("asc")
    .collect();
  if (stops.length >= maximumStopCount)
    throw new Error("This proposed route is already at its stop limit.");
  const stopId = await ctx.db.insert("routeStops", {
    routeId: route._id,
    taskId,
    sequenceNumber: stops.length + 1,
    status: "pending",
  });
  await ctx.db.patch(route._id, {
    orderedStopIds: [...route.orderedStopIds, stopId],
  });
  return { route, stopId };
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
    throw new Error("Only a scheduled task can be removed from its route.");
  const route = await ctx.db.get(task.routeId);
  if (route === null || route.status !== "proposed")
    throw new Error("Only an unstarted proposed route can be changed.");
  const stop = await ctx.db
    .query("routeStops")
    .withIndex("by_taskId", (q) => q.eq("taskId", task._id))
    .first();
  if (stop === null || stop.routeId !== route._id)
    throw new Error("The route stop is unavailable.");
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
  await ctx.db.patch(route._id, {
    orderedStopIds: remaining.map((routeStop) => routeStop._id),
  });
  return route;
}
