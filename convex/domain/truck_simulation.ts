import { ConvexError } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { isTerminalRouteStopStatus } from "./route_rules";

type RouteStopWithTask = {
  stop: Doc<"routeStops">;
  task: Doc<"collectionTasks">;
};

export function getSimulationVersion(route: Doc<"routes">) {
  return route.simulationVersion ?? 0;
}

export function isSimulationPaused(route: Doc<"routes">) {
  return route.simulationPaused ?? false;
}

export function resolveOperationalStop(stops: readonly RouteStopWithTask[]) {
  const explicitIndex = stops.findIndex(
    ({ stop }) =>
      stop.status === "current" && !isTerminalRouteStopStatus(stop.status),
  );
  const index =
    explicitIndex >= 0
      ? explicitIndex
      : stops.findIndex(({ stop }) => !isTerminalRouteStopStatus(stop.status));
  return index < 0 ? null : { ...stops[index], index };
}

export function resolveSimulationTarget(
  route: Doc<"routes">,
  stops: readonly RouteStopWithTask[],
) {
  const current = resolveOperationalStop(stops);
  return current === null
    ? {
        kind: "depot" as const,
        latitude: route.depotLatitude,
        longitude: route.depotLongitude,
      }
    : {
        kind: "current_stop" as const,
        latitude: current.task.latitude,
        longitude: current.task.longitude,
        current,
      };
}

export async function loadRouteStopsWithTasks(
  ctx: QueryCtx | MutationCtx,
  routeId: Id<"routes">,
) {
  const stops = await ctx.db
    .query("routeStops")
    .withIndex("by_routeId_and_sequenceNumber", (q) => q.eq("routeId", routeId))
    .order("asc")
    .collect();
  const tasks = await Promise.all(stops.map((stop) => ctx.db.get(stop.taskId)));
  if (tasks.some((task) => task === null))
    throw new ConvexError({
      code: "SIMULATION_STATE_CHANGED",
      message: "Route simulation state changed; retry the action.",
    });
  return stops.map((stop, index) => ({
    stop,
    task: tasks[index] as Doc<"collectionTasks">,
  }));
}

export async function scheduleSimulationStep(
  ctx: MutationCtx,
  route: Doc<"routes">,
  simulationVersion: number,
) {
  const settings = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .unique();
  if (settings === null)
    throw new ConvexError({
      code: "SETTINGS_UNAVAILABLE",
      message: "Route settings are unavailable.",
    });
  const delayMs = settings.simulationStepIntervalSeconds * 1_000;
  const nextSimulationAt = Date.now() + delayMs;
  await ctx.db.patch(route._id, {
    simulationPaused: false,
    simulationVersion,
    nextSimulationAt,
  });
  await ctx.scheduler.runAfter(
    delayMs,
    internal.truckSimulation.advanceScheduledSimulation,
    { routeId: route._id, expectedSimulationVersion: simulationVersion },
  );
  return nextSimulationAt;
}

export async function performSimulationMovement(
  ctx: MutationCtx,
  route: Doc<"routes">,
  truck: Doc<"trucks">,
  stops: readonly RouteStopWithTask[],
  now: number,
) {
  const target = resolveSimulationTarget(route, stops);
  await ctx.db.patch(truck._id, {
    latitude: target.latitude,
    longitude: target.longitude,
    status:
      target.kind === "current_stop" ? "at_collection_point" : "returning",
  });
  if (target.kind === "current_stop")
    await ctx.db.patch(target.current.stop._id, { arrivalAt: now });
  await ctx.db.patch(route._id, {
    nextSimulationAt: undefined,
    lastSimulationStepAt: now,
  });
  return target;
}

export async function advanceAfterTerminalStop(
  ctx: MutationCtx,
  routeId: Id<"routes">,
) {
  const route = await ctx.db.get(routeId);
  if (route === null || route.status !== "active") return null;
  const [truck, stops] = await Promise.all([
    ctx.db.get(route.truckId),
    loadRouteStopsWithTasks(ctx, route._id),
  ]);
  if (truck === null || truck.assignedRouteId !== route._id)
    throw new ConvexError({
      code: "SIMULATION_STATE_CHANGED",
      message: "Route simulation state changed; retry the action.",
    });

  const current = resolveOperationalStop(stops);
  for (const { stop } of stops) {
    if (isTerminalRouteStopStatus(stop.status)) continue;
    const nextStatus = stop._id === current?.stop._id ? "current" : "pending";
    if (stop.status !== nextStatus)
      await ctx.db.patch(stop._id, { status: nextStatus });
  }

  const version = getSimulationVersion(route) + 1;
  if (current !== null) {
    await ctx.db.patch(route._id, { currentStopIndex: current.index });
    await ctx.db.patch(truck._id, { status: "on_route" });
  } else {
    await ctx.db.patch(route._id, { currentStopIndex: stops.length });
    await ctx.db.patch(truck._id, { status: "returning" });
  }
  await scheduleSimulationStep(ctx, route, version);
  return current;
}
