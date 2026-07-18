import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  type MutationCtx,
} from "./_generated/server";
import { requireFleetManager } from "./domain/auth";
import {
  getSimulationVersion,
  isSimulationPaused,
  loadRouteStopsWithTasks,
  performSimulationMovement,
  resolveOperationalStop,
  resolveSimulationTarget,
  scheduleSimulationStep,
} from "./domain/truck_simulation";

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

async function movementState(ctx: MutationCtx, routeId: Id<"routes">) {
  const route = await ctx.db.get(routeId);
  if (route === null || route.status !== "active")
    fail("SIMULATION_NOT_ACTIVE", "Simulation is not active.");
  const truck = await ctx.db.get(route.truckId);
  if (truck === null || truck.assignedRouteId !== route._id)
    fail(
      "SIMULATION_STATE_CHANGED",
      "Route simulation state changed; retry the action.",
    );
  const stops = await loadRouteStopsWithTasks(ctx, route._id);
  return { route, truck, stops };
}

export const advanceScheduledSimulation = internalMutation({
  args: {
    routeId: v.id("routes"),
    expectedSimulationVersion: v.number(),
  },
  handler: async (ctx, args) => {
    const route = await ctx.db.get(args.routeId);
    if (
      route === null ||
      route.status !== "active" ||
      isSimulationPaused(route) ||
      getSimulationVersion(route) !== args.expectedSimulationVersion
    )
      return null;
    const truck = await ctx.db.get(route.truckId);
    if (
      truck === null ||
      truck.assignedRouteId !== route._id ||
      !["on_route", "returning"].includes(truck.status)
    )
      return null;
    const stops = await loadRouteStopsWithTasks(ctx, route._id);
    const target = resolveSimulationTarget(route, stops);
    if (
      (target.kind === "current_stop" && truck.status !== "on_route") ||
      (target.kind === "depot" && truck.status !== "returning")
    )
      return null;
    await performSimulationMovement(ctx, route, truck, stops, Date.now());
    return null;
  },
});

export const pause = mutation({
  args: { routeId: v.id("routes") },
  handler: async (ctx, args) => {
    await requireFleetManager(ctx);
    const { route, truck } = await movementState(ctx, args.routeId);
    if (isSimulationPaused(route))
      fail("SIMULATION_ALREADY_PAUSED", "Simulation is already paused.");
    if (
      route.nextSimulationAt === undefined ||
      !["on_route", "returning"].includes(truck.status)
    )
      fail("SIMULATION_NOT_ACTIVE", "Simulation is not active.");
    await ctx.db.patch(route._id, {
      simulationPaused: true,
      simulationVersion: getSimulationVersion(route) + 1,
      nextSimulationAt: undefined,
    });
    return null;
  },
});

export const resume = mutation({
  args: { routeId: v.id("routes") },
  handler: async (ctx, args) => {
    await requireFleetManager(ctx);
    const { route, truck, stops } = await movementState(ctx, args.routeId);
    if (!isSimulationPaused(route))
      fail("SIMULATION_NOT_PAUSED", "Simulation is not paused.");
    const target = resolveSimulationTarget(route, stops);
    if (
      (target.kind === "current_stop" && truck.status !== "on_route") ||
      (target.kind === "depot" && truck.status !== "returning")
    )
      fail(
        "SIMULATION_STATE_CHANGED",
        "Route simulation state changed; retry the action.",
      );
    await scheduleSimulationStep(ctx, route, getSimulationVersion(route) + 1);
    return null;
  },
});

export const advanceNow = mutation({
  args: { routeId: v.id("routes") },
  handler: async (ctx, args) => {
    await requireFleetManager(ctx);
    const { route, truck, stops } = await movementState(ctx, args.routeId);
    const target = resolveSimulationTarget(route, stops);
    const current = resolveOperationalStop(stops);
    const alreadyAtTarget =
      truck.latitude === target.latitude &&
      truck.longitude === target.longitude;
    if (
      (current !== null && truck.status === "at_collection_point") ||
      (current === null &&
        alreadyAtTarget &&
        route.nextSimulationAt === undefined)
    )
      fail(
        "TRUCK_ALREADY_AT_TARGET",
        "Truck is already at the current target.",
      );
    if (
      (target.kind === "current_stop" &&
        !["on_route"].includes(truck.status)) ||
      (target.kind === "depot" && truck.status !== "returning")
    )
      fail(
        "SIMULATION_STATE_CHANGED",
        "Route simulation state changed; retry the action.",
      );
    const version = getSimulationVersion(route) + 1;
    await ctx.db.patch(route._id, {
      simulationPaused: false,
      simulationVersion: version,
      nextSimulationAt: undefined,
    });
    await performSimulationMovement(
      ctx,
      { ...route, simulationVersion: version },
      truck,
      stops,
      Date.now(),
    );
    return null;
  },
});
