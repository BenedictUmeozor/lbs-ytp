import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  isNearRemainingRoute,
  remainingRoutePointDistanceMeters,
  splitRouteStops,
  validUrgentTask,
} from "./route_reoptimisation";
import { insertNotification } from "./write_helpers";

export async function maybeCreateRouteReoptimisationNotification(
  ctx: MutationCtx,
  task: Doc<"collectionTasks">,
) {
  if (!validUrgentTask(task)) return;
  const route = await ctx.db
    .query("routes")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .first();
  if (route === null) return;
  const [truck, stops] = await Promise.all([
    ctx.db.get(route.truckId),
    ctx.db
      .query("routeStops")
      .withIndex("by_routeId_and_sequenceNumber", (q) => q.eq("routeId", route._id))
      .order("asc")
      .collect(),
  ]);
  if (truck === null) return;
  const joined = await Promise.all(
    stops.map(async (stop) => {
      const routeTask = await ctx.db.get(stop.taskId);
      return routeTask === null ? null : { stop, task: routeTask };
    }),
  );
  const routeStops = joined.filter((item): item is NonNullable<typeof item> => item !== null);
  const current = splitRouteStops(routeStops).operationalCurrent;
  if (current === null) return;
  const existing = await ctx.db
    .query("notifications")
    .withIndex("by_relatedEntityType_and_relatedEntityId", (q) =>
      q.eq("relatedEntityType", "collection_task").eq("relatedEntityId", task._id),
    )
    .collect();
  if (existing.some((notification) => notification.type === "route_reoptimisation_suggested" && notification.readAt === undefined)) return;
  const distanceMeters = remainingRoutePointDistanceMeters(task, truck, current, routeStops);
  const near = isNearRemainingRoute(distanceMeters);
  await insertNotification(
    ctx,
    "route_reoptimisation_suggested",
    "warning",
    "Critical task needs route review",
    near
      ? `${task.displayId} is near the remaining active route. Review re-optimisation.`
      : `${task.displayId} is outside the 1 km route-review radius. Review before adding it.`,
    "collection_task",
    task._id,
  );
}
