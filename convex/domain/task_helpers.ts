import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  haversineDistanceMeters,
  isTerminalReportStatus,
} from "./report_management_rules";
import { isActiveTaskStatus, reportStatusForTaskStatus } from "./task_rules";
import type { Priority, ReportCategory } from "./validators";
import { insertActivityEvent } from "./write_helpers";
import { maybeCreateRouteReoptimisationNotification } from "./route_reoptimisation_notifications";

export async function syncLinkedReportTaskStatus(
  ctx: MutationCtx,
  task: Doc<"collectionTasks">,
  targetTaskStatus: Doc<"collectionTasks">["status"],
  actorUserId: Id<"users"> | undefined,
  now: number,
) {
  const targetReportStatus = reportStatusForTaskStatus(targetTaskStatus);
  if (targetReportStatus === null) return;
  for (const reportId of task.linkedReportIds) {
    const report = await ctx.db.get(reportId);
    if (
      report === null ||
      isTerminalReportStatus(report.status) ||
      report.status === targetReportStatus
    )
      continue;
    await ctx.db.patch(report._id, {
      status: targetReportStatus,
      statusUpdatedAt: now,
    });
    await insertActivityEvent(
      ctx,
      "report_status_changed",
      `Report ${report.referenceNumber} status changed from ${report.status} to ${targetReportStatus}.`,
      "citizen_report",
      report._id,
      actorUserId,
      report.status,
      targetReportStatus,
    );
  }
}

export async function resolveLinkedReportsForCollectedTask(
  ctx: MutationCtx,
  task: Doc<"collectionTasks">,
  actorUserId: Id<"users"> | undefined,
  now: number,
) {
  for (const reportId of task.linkedReportIds) {
    const report = await ctx.db.get(reportId);
    if (report === null || isTerminalReportStatus(report.status)) continue;
    await ctx.db.patch(report._id, {
      status: "resolved",
      resolvedAt: now,
      candidateTaskId: undefined,
      statusUpdatedAt: now,
    });
    await insertActivityEvent(
      ctx,
      "report_status_changed",
      `Report ${report.referenceNumber} status changed from ${report.status} to resolved.`,
      "citizen_report",
      report._id,
      actorUserId,
      report.status,
      "resolved",
    );
    await insertActivityEvent(
      ctx,
      "report_resolved",
      `Report ${report.referenceNumber} resolved after task ${task.displayId} was collected.`,
      "citizen_report",
      report._id,
      actorUserId,
    );
  }
}

export async function getActiveCollectionTask(
  ctx: MutationCtx,
  binId: Id<"bins">,
) {
  const tasks = await ctx.db
    .query("collectionTasks")
    .withIndex("by_sourceBinId", (q) => q.eq("sourceBinId", binId))
    .collect();
  return tasks.find((task) => isActiveTaskStatus(task.status)) ?? null;
}

export async function getNearbyActiveTasks(
  ctx: MutationCtx,
  latitude: number,
  longitude: number,
  radiusMeters: number,
) {
  const taskGroups = await Promise.all(
    (["pending", "scheduled", "assigned", "en_route"] as const).map((status) =>
      ctx.db
        .query("collectionTasks")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect(),
    ),
  );
  return taskGroups
    .flat()
    .filter((task) => isActiveTaskStatus(task.status))
    .map((task) => ({
      task,
      distanceMeters: haversineDistanceMeters(
        latitude,
        longitude,
        task.latitude,
        task.longitude,
      ),
    }))
    .filter((candidate) => candidate.distanceMeters <= radiusMeters)
    .sort(
      (a, b) =>
        a.distanceMeters - b.distanceMeters ||
        a.task._creationTime - b.task._creationTime,
    );
}

export async function getTaskOperationalCategory(
  ctx: MutationCtx,
  task: Doc<"collectionTasks">,
): Promise<ReportCategory | null> {
  if (task.sourceType === "smart_bin") return "overflowing_waste";
  const reportIds = [task.sourceReportId, ...task.linkedReportIds].filter(
    (id): id is Id<"citizenReports"> => id !== undefined,
  );
  for (const reportId of reportIds) {
    const report = await ctx.db.get(reportId);
    if (report?.category !== undefined) return report.category;
  }
  return null;
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
  await maybeCreateRouteReoptimisationNotification(ctx, task);
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
  await maybeCreateRouteReoptimisationNotification(ctx, task);
  return task;
}
