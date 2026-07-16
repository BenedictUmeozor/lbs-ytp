import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  hasValidOperationalCoordinates,
  isTerminalReportStatus,
} from "./report_management_rules";
import {
  createTaskForReport,
  getNearbyActiveTasks,
  getTaskOperationalCategory,
} from "./task_helpers";
import {
  isActiveTaskStatus,
  isAutomaticTaskEligible,
  taskCategoriesMatch,
} from "./task_rules";
import { insertActivityEvent } from "./write_helpers";

export type AutomaticTaskEvaluation =
  | { kind: "ineligible" }
  | { kind: "already_linked" }
  | { kind: "candidate_found"; taskId: Id<"collectionTasks"> }
  | { kind: "task_created"; taskId: Id<"collectionTasks"> };

function automaticTaskReason(report: {
  referenceNumber: string;
  summary?: string;
  category?: string;
}) {
  const detail =
    report.summary?.trim() ||
    report.category?.replaceAll("_", " ") ||
    "waste report";
  return `${report.referenceNumber}: ${detail}`.slice(0, 240);
}

export async function evaluateReportForAutomaticTask(
  ctx: MutationCtx,
  reportId: Id<"citizenReports">,
  actorUserId?: Id<"users">,
): Promise<AutomaticTaskEvaluation> {
  const report = await ctx.db.get(reportId);
  if (report === null || isTerminalReportStatus(report.status)) {
    return { kind: "ineligible" };
  }

  const linkedTask =
    report.linkedTaskId === undefined
      ? null
      : await ctx.db.get(report.linkedTaskId);
  if (linkedTask !== null && isActiveTaskStatus(linkedTask.status)) {
    return { kind: "already_linked" };
  }
  if (
    !isAutomaticTaskEligible(report) ||
    !hasValidOperationalCoordinates(report)
  ) {
    return { kind: "ineligible" };
  }

  const settings = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .unique();
  if (
    settings === null ||
    report.category === undefined ||
    report.priority === undefined
  ) {
    return { kind: "ineligible" };
  }

  const nearby = await getNearbyActiveTasks(
    ctx,
    report.latitude!,
    report.longitude!,
    settings.duplicateDistanceThresholdMeters,
  );
  for (const candidate of nearby) {
    const category = await getTaskOperationalCategory(ctx, candidate.task);
    if (!taskCategoriesMatch(report.category, category)) continue;
    if (report.candidateTaskId === candidate.task._id)
      return { kind: "candidate_found", taskId: candidate.task._id };
    const now = Date.now();
    const nextStatus = "under_review";
    await ctx.db.patch(report._id, {
      candidateTaskId: candidate.task._id,
      status: nextStatus,
      statusUpdatedAt:
        nextStatus === report.status ? report.statusUpdatedAt : now,
    });
    await insertActivityEvent(
      ctx,
      "report_task_candidate_found",
      `Possible task match ${candidate.task.displayId} found for ${report.referenceNumber}; fleet-manager review is required.`,
      "citizen_report",
      report._id,
      actorUserId,
    );
    if (nextStatus !== report.status) {
      await insertActivityEvent(
        ctx,
        "report_status_changed",
        `Report ${report.referenceNumber} status changed from ${report.status} to under_review.`,
        "citizen_report",
        report._id,
        actorUserId,
        report.status,
        "under_review",
      );
    }
    return { kind: "candidate_found", taskId: candidate.task._id };
  }

  const now = Date.now();
  const task = await createTaskForReport(ctx, {
    reportId: report._id,
    priority: report.priority,
    reason: automaticTaskReason(report),
    latitude: report.latitude!,
    longitude: report.longitude!,
    now,
  });
  await ctx.db.patch(report._id, {
    linkedTaskId: task._id,
    candidateTaskId: undefined,
    status: "task_created",
    statusUpdatedAt: now,
  });
  await insertActivityEvent(
    ctx,
    "task_created",
    `Collection task ${task.displayId} created automatically for ${report.referenceNumber}.`,
    "collection_task",
    task._id,
    actorUserId,
  );
  await insertActivityEvent(
    ctx,
    "report_linked_to_task",
    `${report.referenceNumber} linked to task ${task.displayId}.`,
    "citizen_report",
    report._id,
    actorUserId,
  );
  await insertActivityEvent(
    ctx,
    "report_status_changed",
    `Report ${report.referenceNumber} status changed from ${report.status} to task_created.`,
    "citizen_report",
    report._id,
    actorUserId,
    report.status,
    "task_created",
  );
  return { kind: "task_created", taskId: task._id };
}

export async function candidateTaskForReport(
  ctx: MutationCtx,
  reportId: Id<"citizenReports">,
) {
  const report = await ctx.db.get(reportId);
  if (report?.candidateTaskId === undefined) return null;
  const task = await ctx.db.get(report.candidateTaskId);
  if (task !== null && isActiveTaskStatus(task.status)) return task;
  await ctx.db.patch(report._id, { candidateTaskId: undefined });
  return null;
}

export async function candidateStillMatchesReport(
  ctx: MutationCtx,
  reportId: Id<"citizenReports">,
  taskId: Id<"collectionTasks">,
) {
  const [report, task, settings] = await Promise.all([
    ctx.db.get(reportId),
    ctx.db.get(taskId),
    ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique(),
  ]);
  if (
    report === null ||
    task === null ||
    settings === null ||
    report.category === undefined ||
    !hasValidOperationalCoordinates(report) ||
    !isActiveTaskStatus(task.status)
  ) {
    return false;
  }
  const taskCategory = await getTaskOperationalCategory(ctx, task);
  return (
    taskCategoriesMatch(report.category, taskCategory) &&
    (
      await getNearbyActiveTasks(
        ctx,
        report.latitude!,
        report.longitude!,
        settings.duplicateDistanceThresholdMeters,
      )
    ).some((candidate) => candidate.task._id === task._id)
  );
}
