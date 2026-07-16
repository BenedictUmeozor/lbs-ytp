import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { Priority } from "./validators";
import { insertActivityEvent } from "./write_helpers";

const activeStatuses = new Set([
  "pending",
  "scheduled",
  "assigned",
  "en_route",
]);

export async function getActiveCollectionTask(
  ctx: MutationCtx,
  binId: Id<"bins">,
) {
  const tasks = await ctx.db
    .query("collectionTasks")
    .withIndex("by_sourceBinId", (q) => q.eq("sourceBinId", binId))
    .collect();
  return tasks.find((task) => activeStatuses.has(task.status)) ?? null;
}

async function nextDisplayId(ctx: MutationCtx): Promise<string> {
  const tasks = await ctx.db.query("collectionTasks").collect();
  const highest = tasks.reduce((value, task) => {
    const match = /^CT-(\d+)$/.exec(task.displayId);
    return match === null ? value : Math.max(value, Number(match[1]));
  }, 0);
  return `CT-${String(highest + 1).padStart(3, "0")}`;
}

export async function nextCollectionTaskDisplayId(
  ctx: MutationCtx,
): Promise<string> {
  return nextDisplayId(ctx);
}

export async function createTaskForBin(
  ctx: MutationCtx,
  args: {
    binId: Id<"bins">;
    sourceType: "smart_bin" | "manual";
    priority: Priority;
    reason: string;
    actorUserId?: Id<"users">;
  },
) {
  const existing = await getActiveCollectionTask(ctx, args.binId);
  if (existing !== null) return { task: existing, created: false };
  const bin = await ctx.db.get(args.binId);
  if (bin === null) throw new Error("Bin not found.");
  const taskId = await ctx.db.insert("collectionTasks", {
    displayId: await nextDisplayId(ctx),
    sourceType: args.sourceType,
    sourceBinId: bin._id,
    linkedReportIds: [],
    latitude: bin.latitude,
    longitude: bin.longitude,
    priority: args.priority,
    reason: args.reason,
    status: "pending",
    statusUpdatedAt: Date.now(),
  });
  const task = await ctx.db.get(taskId);
  if (task === null) throw new Error("Task creation failed.");
  await insertActivityEvent(
    ctx,
    "task_created",
    `Collection task ${task.displayId} created for ${bin.displayId}.`,
    "collection_task",
    taskId,
    args.actorUserId,
  );
  return { task, created: true };
}

export async function createTaskForReport(
  ctx: MutationCtx,
  args: {
    reportId: Id<"citizenReports">;
    priority: Priority;
    reason: string;
    latitude: number;
    longitude: number;
    now: number;
  },
): Promise<Doc<"collectionTasks">> {
  const taskId = await ctx.db.insert("collectionTasks", {
    displayId: await nextDisplayId(ctx),
    sourceType: "citizen_report",
    sourceReportId: args.reportId,
    linkedReportIds: [args.reportId],
    latitude: args.latitude,
    longitude: args.longitude,
    priority: args.priority,
    reason: args.reason,
    status: "pending",
    statusUpdatedAt: args.now,
  });
  const task = await ctx.db.get(taskId);
  if (task === null) throw new Error("Task creation failed.");
  return task;
}
