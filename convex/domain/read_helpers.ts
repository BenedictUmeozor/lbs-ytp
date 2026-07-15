import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

const ACTIVE_TASK_STATUSES = [
  "pending",
  "scheduled",
  "assigned",
  "en_route",
] as const;

export async function getActiveTaskForBin(
  ctx: QueryCtx,
  binId: Id<"bins">,
): Promise<Doc<"collectionTasks"> | null> {
  const tasks = await ctx.db
    .query("collectionTasks")
    .withIndex("by_sourceBinId", (q) => q.eq("sourceBinId", binId))
    .collect();

  return tasks.find((task) => ACTIVE_TASK_STATUSES.includes(task.status)) ?? null;
}

export async function getBinOperationalRecord(ctx: QueryCtx, bin: Doc<"bins">) {
  const device = bin.deviceId === undefined ? null : await ctx.db.get(bin.deviceId);
  const activeTask = await getActiveTaskForBin(ctx, bin._id);

  return { bin, device, activeTask };
}

export async function getRouteOperationalRecord(
  ctx: QueryCtx,
  route: Doc<"routes">,
) {
  const stops = await ctx.db
    .query("routeStops")
    .withIndex("by_routeId_and_sequenceNumber", (q) => q.eq("routeId", route._id))
    .order("asc")
    .collect();

  return {
    route,
    stops: await Promise.all(
      stops.map(async (stop) => {
        const task = await ctx.db.get(stop.taskId);
        if (task === null) {
          throw new Error(`Route stop ${stop._id} references a missing collection task.`);
        }
        return { stop, task };
      }),
    ),
  };
}
