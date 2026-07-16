import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireFleetManager } from "./domain/auth";
import {
  canReceiveManagerActions,
  canTransitionReportManagement,
  formatReportLocationSummary,
  hasValidOperationalCoordinates,
  haversineDistanceMeters,
  isReportProcessingActive,
  validatedManagerNote,
} from "./domain/report_management_rules";
import {
  candidateStillMatchesReport,
  candidateTaskForReport,
  evaluateReportForAutomaticTask,
} from "./domain/report_task_evaluation";
import {
  createTaskForReport,
  getNearbyActiveTasks,
  getTaskOperationalCategory,
} from "./domain/task_helpers";
import {
  isActiveTaskStatus,
  reportStatusForTaskStatus,
  taskCategoriesMatch,
} from "./domain/task_rules";
import {
  priorityValidator,
  reportCategoryValidator,
} from "./domain/validators";
import { insertActivityEvent } from "./domain/write_helpers";

type ErrorCode =
  | "REPORT_NOT_FOUND"
  | "INVALID_REPORT_STATE"
  | "CLASSIFICATION_UNAVAILABLE"
  | "INVALID_COORDINATES"
  | "LOCATION_REQUIRED"
  | "TASK_ALREADY_LINKED"
  | "TASK_NOT_FOUND"
  | "TASK_NOT_ACTIVE"
  | "DUPLICATE_TARGET_INVALID"
  | "DUPLICATE_TOO_FAR"
  | "NOTE_REQUIRED"
  | "LINKED_TASK_NOT_COLLECTED"
  | "REPORT_PROCESSING_ACTIVE"
  | "CANDIDATE_REQUIRED"
  | "CANDIDATE_NO_LONGER_VALID";

function fail(code: ErrorCode, message: string): never {
  throw new ConvexError({ code, message });
}

async function reportOrFail(
  ctx: QueryCtx | MutationCtx,
  reportId: Id<"citizenReports">,
) {
  const report = await ctx.db.get(reportId);
  if (report === null) fail("REPORT_NOT_FOUND", "This report is unavailable.");
  return report;
}

async function activeLinkedTask(
  ctx: QueryCtx | MutationCtx,
  report: Doc<"citizenReports">,
) {
  if (report.linkedTaskId === undefined) return null;
  const task = await ctx.db.get(report.linkedTaskId);
  return task !== null && isActiveTaskStatus(task.status) ? task : null;
}

function requireActionable(report: Doc<"citizenReports">) {
  if (!canReceiveManagerActions(report.status)) {
    fail(
      "INVALID_REPORT_STATE",
      "This action is unavailable for a terminal report.",
    );
  }
}

function requireProcessingSettled(report: Doc<"citizenReports">) {
  if (isReportProcessingActive(report.aiStatus)) {
    fail(
      "REPORT_PROCESSING_ACTIVE",
      "Wait for report processing to finish before taking this action.",
    );
  }
}

function requireCoordinates(report: Doc<"citizenReports">) {
  if (!hasValidOperationalCoordinates(report)) {
    fail(
      "LOCATION_REQUIRED",
      "Set valid Bariga pilot coordinates before taking this action.",
    );
  }
}

async function globalSettings(ctx: QueryCtx | MutationCtx) {
  return ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .unique();
}

async function activityHistory(ctx: QueryCtx, reportId: Id<"citizenReports">) {
  const events = await ctx.db
    .query("activityEvents")
    .withIndex("by_relatedEntityType_and_relatedEntityId", (q) =>
      q
        .eq("relatedEntityType", "citizen_report")
        .eq("relatedEntityId", reportId),
    )
    .order("desc")
    .collect();
  return Promise.all(
    events.map(async (event) => {
      const actor =
        event.actorUserId === undefined
          ? null
          : await ctx.db.get(event.actorUserId);
      return {
        id: event._id,
        eventTime: event._creationTime,
        description: event.description,
        previousStatus: event.previousStatus,
        nextStatus: event.nextStatus,
        actorName: actor?.name,
      };
    }),
  );
}

export const listReports = query({
  args: {},
  handler: async (ctx) => {
    await requireFleetManager(ctx);
    const reports = await ctx.db
      .query("citizenReports")
      .order("desc")
      .collect();
    return Promise.all(
      reports.map(async (report) => {
        const task =
          report.linkedTaskId === undefined
            ? null
            : await ctx.db.get(report.linkedTaskId);
        return {
          id: report._id,
          referenceNumber: report.referenceNumber,
          category: report.category,
          priority: report.priority,
          locationSummary: formatReportLocationSummary(report),
          source: report.source,
          submittedAt: report._creationTime,
          status: report.status,
          aiStatus: report.aiStatus,
          linkedTask:
            task === null
              ? null
              : {
                  id: task._id,
                  displayId: task.displayId,
                  status: task.status,
                },
        };
      }),
    );
  },
});

export const getReportDetail = query({
  args: { reportId: v.string() },
  handler: async (ctx, args) => {
    await requireFleetManager(ctx);
    const reportId = ctx.db.normalizeId("citizenReports", args.reportId);
    if (reportId === null) return null;
    const report = await ctx.db.get(reportId);
    if (report === null) return null;
    const [
      linkedTask,
      candidateTask,
      linkedBin,
      settings,
      allReports,
      allTasks,
      history,
    ] = await Promise.all([
      report.linkedTaskId === undefined
        ? null
        : ctx.db.get(report.linkedTaskId),
      report.candidateTaskId === undefined
        ? null
        : ctx.db.get(report.candidateTaskId),
      report.linkedBinId === undefined ? null : ctx.db.get(report.linkedBinId),
      globalSettings(ctx),
      ctx.db.query("citizenReports").collect(),
      ctx.db.query("collectionTasks").collect(),
      activityHistory(ctx, report._id),
    ]);
    const nearbyReports =
      settings === null || !hasValidOperationalCoordinates(report)
        ? []
        : allReports
            .filter(
              (candidate) =>
                candidate._id !== report._id &&
                canReceiveManagerActions(candidate.status) &&
                hasValidOperationalCoordinates(candidate),
            )
            .map((candidate) => ({
              id: candidate._id,
              referenceNumber: candidate.referenceNumber,
              category: candidate.category,
              priority: candidate.priority,
              status: candidate.status,
              summary: candidate.summary,
              distanceMeters: haversineDistanceMeters(
                report.latitude!,
                report.longitude!,
                candidate.latitude!,
                candidate.longitude!,
              ),
              linkedTaskDisplayId:
                candidate.linkedTaskId === undefined
                  ? undefined
                  : allTasks.find((task) => task._id === candidate.linkedTaskId)
                      ?.displayId,
              submittedAt: candidate._creationTime,
            }))
            .filter(
              (candidate) =>
                candidate.distanceMeters <=
                settings.duplicateDistanceThresholdMeters,
            )
            .sort(
              (a, b) =>
                a.distanceMeters - b.distanceMeters ||
                b.submittedAt - a.submittedAt,
            );
    const eligibleTasks = allTasks
      .filter((task) => isActiveTaskStatus(task.status))
      .map((task) => ({
        id: task._id,
        displayId: task.displayId,
        sourceType: task.sourceType,
        status: task.status,
        priority: task.priority,
        reason: task.reason,
        distanceMeters: hasValidOperationalCoordinates(report)
          ? haversineDistanceMeters(
              report.latitude!,
              report.longitude!,
              task.latitude,
              task.longitude,
            )
          : null,
        createdAt: task._creationTime,
      }))
      .sort(
        (a, b) =>
          (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity) ||
          b.createdAt - a.createdAt,
      )
      .map(({ createdAt, ...task }) => {
        void createdAt;
        return task;
      });
    const duplicateOfReport =
      report.duplicateOfReportId === undefined
        ? null
        : await ctx.db.get(report.duplicateOfReportId);
    const confirmationUser =
      report.classificationConfirmedByUserId === undefined
        ? null
        : await ctx.db.get(report.classificationConfirmedByUserId);
    return {
      report: {
        id: report._id,
        referenceNumber: report.referenceNumber,
        source: report.source,
        originalMessage: report.originalMessage,
        category: report.category,
        priority: report.priority,
        summary: report.summary,
        landmarkText: report.landmarkText,
        aiExtractedLocationText: report.aiExtractedLocationText,
        submittedLatitude:
          report.submittedLatitude ??
          (report.locationResolutionStatus === "provided_coordinates"
            ? report.latitude
            : undefined),
        submittedLongitude:
          report.submittedLongitude ??
          (report.locationResolutionStatus === "provided_coordinates"
            ? report.longitude
            : undefined),
        latitude: report.latitude,
        longitude: report.longitude,
        hasValidOperationalCoordinates: hasValidOperationalCoordinates(report),
        resolvedLocationName: report.resolvedLocationName,
        locationResolutionStatus: report.locationResolutionStatus,
        requiresCollection: report.requiresCollection,
        needsClarification: report.needsClarification,
        aiNeedsClarification: report.aiNeedsClarification,
        aiStatus: report.aiStatus,
        aiModel: report.aiModel,
        aiProcessedAt: report.aiProcessedAt,
        status: report.status,
        statusUpdatedAt: report.statusUpdatedAt,
        submittedAt: report._creationTime,
        resolvedAt: report.resolvedAt,
        linkedTaskId: report.linkedTaskId,
        candidateTaskId: report.candidateTaskId,
        linkedBinId: report.linkedBinId,
        classificationConfirmedAt: report.classificationConfirmedAt,
      },
      photoUrl:
        report.photoStorageId === undefined
          ? null
          : await ctx.storage.getUrl(report.photoStorageId),
      linkedTask:
        linkedTask === null
          ? null
          : {
              id: linkedTask._id,
              displayId: linkedTask.displayId,
              status: linkedTask.status,
              priority: linkedTask.priority,
            },
      candidateTask:
        candidateTask === null || !isActiveTaskStatus(candidateTask.status)
          ? null
          : {
              id: candidateTask._id,
              displayId: candidateTask.displayId,
              sourceType: candidateTask.sourceType,
              priority: candidateTask.priority,
              status: candidateTask.status,
              reason: candidateTask.reason,
              sourceBinId: candidateTask.sourceBinId,
              sourceReportId: candidateTask.sourceReportId,
              distanceMeters: hasValidOperationalCoordinates(report)
                ? haversineDistanceMeters(
                    report.latitude!,
                    report.longitude!,
                    candidateTask.latitude,
                    candidateTask.longitude,
                  )
                : null,
            },
      linkedBin:
        linkedBin === null
          ? null
          : {
              id: linkedBin._id,
              displayId: linkedBin.displayId,
              name: linkedBin.name,
            },
      duplicateOfReport:
        duplicateOfReport === null
          ? null
          : {
              id: duplicateOfReport._id,
              referenceNumber: duplicateOfReport.referenceNumber,
            },
      nearbyReports,
      eligibleTasks,
      activityHistory: history,
      classificationConfirmation:
        report.classificationConfirmedAt === undefined
          ? null
          : {
              confirmedAt: report.classificationConfirmedAt,
              managerName: confirmationUser?.name ?? "Unknown manager",
            },
    };
  },
});

export const confirmClassification = mutation({
  args: { reportId: v.id("citizenReports") },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const report = await reportOrFail(ctx, args.reportId);
    requireActionable(report);
    requireProcessingSettled(report);
    if (
      report.category === undefined ||
      report.priority === undefined ||
      !["completed", "fallback", "failed"].includes(report.aiStatus)
    )
      fail(
        "CLASSIFICATION_UNAVAILABLE",
        "Classification is not ready to confirm.",
      );
    if (report.classificationConfirmedAt !== undefined)
      return { changed: false };
    const now = Date.now();
    await ctx.db.patch(report._id, {
      classificationConfirmedAt: now,
      classificationConfirmedByUserId: user._id,
    });
    await insertActivityEvent(
      ctx,
      "report_classification_confirmed",
      `Operational classification confirmed for ${report.referenceNumber}.`,
      "citizen_report",
      report._id,
      user._id,
    );
    await evaluateReportForAutomaticTask(ctx, report._id, user._id);
    return { changed: true };
  },
});

export const updateClassification = mutation({
  args: {
    reportId: v.id("citizenReports"),
    category: reportCategoryValidator,
    priority: priorityValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const report = await reportOrFail(ctx, args.reportId);
    requireActionable(report);
    requireProcessingSettled(report);
    if (
      report.category === args.category &&
      report.priority === args.priority &&
      report.classificationConfirmedByUserId === user._id
    )
      return { changed: false };
    const now = Date.now();
    await ctx.db.patch(report._id, {
      category: args.category,
      priority: args.priority,
      classificationConfirmedAt: now,
      classificationConfirmedByUserId: user._id,
    });
    await insertActivityEvent(
      ctx,
      "report_classification_updated",
      `Operational classification set to ${args.category}, ${args.priority} for ${report.referenceNumber}.`,
      "citizen_report",
      report._id,
      user._id,
    );
    await evaluateReportForAutomaticTask(ctx, report._id, user._id);
    return { changed: true };
  },
});

export const updateResolvedCoordinates = mutation({
  args: {
    reportId: v.id("citizenReports"),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const report = await reportOrFail(ctx, args.reportId);
    requireActionable(report);
    requireProcessingSettled(report);
    if (
      !Number.isFinite(args.latitude) ||
      !Number.isFinite(args.longitude) ||
      !hasValidOperationalCoordinates({
        latitude: args.latitude,
        longitude: args.longitude,
      })
    )
      fail(
        "INVALID_COORDINATES",
        "Enter finite coordinates within the Bariga pilot.",
      );
    if (await activeLinkedTask(ctx, report))
      fail(
        "TASK_ALREADY_LINKED",
        "This report is linked to an active collection task.",
      );
    const now = Date.now();
    const needsClarification = report.aiNeedsClarification ?? false;
    const nextStatus =
      report.status === "needs_clarification" && !needsClarification
        ? "under_review"
        : report.status;
    await ctx.db.patch(report._id, {
      latitude: args.latitude,
      longitude: args.longitude,
      submittedLatitude:
        report.submittedLatitude ??
        (report.locationResolutionStatus === "provided_coordinates"
          ? report.latitude
          : undefined),
      submittedLongitude:
        report.submittedLongitude ??
        (report.locationResolutionStatus === "provided_coordinates"
          ? report.longitude
          : undefined),
      locationResolutionStatus: "resolved",
      needsClarification,
      status: nextStatus,
      statusUpdatedAt:
        nextStatus === report.status ? report.statusUpdatedAt : now,
    });
    await insertActivityEvent(
      ctx,
      "report_location_updated",
      `Operational coordinates updated for ${report.referenceNumber}.`,
      "citizen_report",
      report._id,
      user._id,
    );
    if (nextStatus !== report.status)
      await insertActivityEvent(
        ctx,
        "report_status_changed",
        `Report ${report.referenceNumber} status changed from ${report.status} to ${nextStatus}.`,
        "citizen_report",
        report._id,
        user._id,
        report.status,
        nextStatus,
      );
    await evaluateReportForAutomaticTask(ctx, report._id, user._id);
    return null;
  },
});

export const requestMoreInformation = mutation({
  args: { reportId: v.id("citizenReports"), note: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const report = await reportOrFail(ctx, args.reportId);
    requireActionable(report);
    requireProcessingSettled(report);
    const note = validatedManagerNote(args.note, true);
    if (note === null)
      fail("NOTE_REQUIRED", "Enter a note between 3 and 240 characters.");
    if (await activeLinkedTask(ctx, report))
      fail(
        "TASK_ALREADY_LINKED",
        "This report is linked to an active collection task.",
      );
    const now = Date.now();
    await ctx.db.patch(report._id, {
      status: "needs_clarification",
      needsClarification: true,
      statusUpdatedAt:
        report.status === "needs_clarification" ? report.statusUpdatedAt : now,
    });
    await insertActivityEvent(
      ctx,
      "report_status_changed",
      `More information requested for ${report.referenceNumber}: ${note}`,
      "citizen_report",
      report._id,
      user._id,
      report.status,
      "needs_clarification",
    );
    return null;
  },
});

export const createCollectionTask = mutation({
  args: {
    reportId: v.id("citizenReports"),
    priority: priorityValidator,
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const report = await reportOrFail(ctx, args.reportId);
    requireActionable(report);
    requireProcessingSettled(report);
    requireCoordinates(report);
    const reason = validatedManagerNote(args.reason, true);
    if (reason === null)
      fail("NOTE_REQUIRED", "Enter a reason between 3 and 240 characters.");
    if (report.category === undefined || report.priority === undefined)
      fail(
        "CLASSIFICATION_UNAVAILABLE",
        "Set an operational category and priority first.",
      );
    if (await activeLinkedTask(ctx, report))
      fail(
        "TASK_ALREADY_LINKED",
        "This report is linked to an active collection task.",
      );
    const settings = await globalSettings(ctx);
    if (settings === null)
      fail("TASK_NOT_FOUND", "Task settings are unavailable.");
    const nearby = await getNearbyActiveTasks(
      ctx,
      report.latitude!,
      report.longitude!,
      settings.duplicateDistanceThresholdMeters,
    );
    for (const nearbyTask of nearby) {
      if (
        !taskCategoriesMatch(
          report.category,
          await getTaskOperationalCategory(ctx, nearbyTask.task),
        )
      )
        continue;
      const now = Date.now();
      const nextStatus =
        report.status === "under_review" ? report.status : "under_review";
      await ctx.db.patch(report._id, {
        candidateTaskId: nearbyTask.task._id,
        status: nextStatus,
        statusUpdatedAt:
          nextStatus === report.status ? report.statusUpdatedAt : now,
      });
      await insertActivityEvent(
        ctx,
        "report_task_candidate_found",
        `Possible task match ${nearbyTask.task.displayId} found for ${report.referenceNumber}; fleet-manager review is required.`,
        "citizen_report",
        report._id,
        user._id,
      );
      return { kind: "candidate_found" as const, taskId: nearbyTask.task._id };
    }
    const now = Date.now();
    const task = await createTaskForReport(ctx, {
      reportId: report._id,
      priority: args.priority,
      reason,
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
      `Collection task ${task.displayId} created for ${report.referenceNumber}.`,
      "collection_task",
      task._id,
      user._id,
    );
    await insertActivityEvent(
      ctx,
      "report_linked_to_task",
      `${report.referenceNumber} linked to task ${task.displayId}.`,
      "citizen_report",
      report._id,
      user._id,
    );
    await insertActivityEvent(
      ctx,
      "report_status_changed",
      `Report ${report.referenceNumber} status changed from ${report.status} to task_created.`,
      "citizen_report",
      report._id,
      user._id,
      report.status,
      "task_created",
    );
    return {
      kind: "task_created" as const,
      taskId: task._id,
      displayId: task.displayId,
    };
  },
});

export const linkExistingTask = mutation({
  args: { reportId: v.id("citizenReports"), taskId: v.id("collectionTasks") },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const report = await reportOrFail(ctx, args.reportId);
    requireActionable(report);
    requireProcessingSettled(report);
    requireCoordinates(report);
    if (await activeLinkedTask(ctx, report))
      fail(
        "TASK_ALREADY_LINKED",
        "This report is linked to an active collection task.",
      );
    const task = await ctx.db.get(args.taskId);
    if (task === null)
      fail("TASK_NOT_FOUND", "This collection task is unavailable.");
    if (!isActiveTaskStatus(task.status))
      fail("TASK_NOT_ACTIVE", "Select an active collection task.");
    const nextStatus = reportStatusForTaskStatus(task.status);
    if (
      nextStatus === null ||
      !canTransitionReportManagement(report.status, nextStatus)
    )
      fail("INVALID_REPORT_STATE", "This task cannot be linked to the report.");
    await ctx.db.patch(task._id, {
      linkedReportIds: task.linkedReportIds.includes(report._id)
        ? task.linkedReportIds
        : [...task.linkedReportIds, report._id],
    });
    const now = Date.now();
    await ctx.db.patch(report._id, {
      linkedTaskId: task._id,
      candidateTaskId: undefined,
      status: nextStatus,
      statusUpdatedAt:
        nextStatus === report.status ? report.statusUpdatedAt : now,
    });
    await insertActivityEvent(
      ctx,
      "report_linked_to_task",
      `${report.referenceNumber} linked to task ${task.displayId}.`,
      "citizen_report",
      report._id,
      user._id,
    );
    if (nextStatus !== report.status)
      await insertActivityEvent(
        ctx,
        "report_status_changed",
        `Report ${report.referenceNumber} status changed from ${report.status} to ${nextStatus}.`,
        "citizen_report",
        report._id,
        user._id,
        report.status,
        nextStatus,
      );
    return null;
  },
});

export const linkCandidateTask = mutation({
  args: { reportId: v.id("citizenReports") },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const report = await reportOrFail(ctx, args.reportId);
    requireActionable(report);
    requireProcessingSettled(report);
    if (await activeLinkedTask(ctx, report))
      fail(
        "TASK_ALREADY_LINKED",
        "This report is linked to an active collection task.",
      );
    const task = await candidateTaskForReport(ctx, report._id);
    if (task === null)
      fail(
        "CANDIDATE_REQUIRED",
        "There is no active candidate task to review.",
      );
    if (!(await candidateStillMatchesReport(ctx, report._id, task._id)))
      fail(
        "CANDIDATE_NO_LONGER_VALID",
        "The candidate task no longer matches this report.",
      );
    const nextStatus = reportStatusForTaskStatus(task.status);
    if (nextStatus === null)
      fail("TASK_NOT_ACTIVE", "The candidate task is no longer active.");
    const now = Date.now();
    await ctx.db.patch(task._id, {
      linkedReportIds: task.linkedReportIds.includes(report._id)
        ? task.linkedReportIds
        : [...task.linkedReportIds, report._id],
    });
    await ctx.db.patch(report._id, {
      linkedTaskId: task._id,
      candidateTaskId: undefined,
      status: nextStatus,
      statusUpdatedAt:
        nextStatus === report.status ? report.statusUpdatedAt : now,
    });
    await insertActivityEvent(
      ctx,
      "report_linked_to_task",
      `${report.referenceNumber} linked to reviewed candidate ${task.displayId}.`,
      "citizen_report",
      report._id,
      user._id,
    );
    if (nextStatus !== report.status)
      await insertActivityEvent(
        ctx,
        "report_status_changed",
        `Report ${report.referenceNumber} status changed from ${report.status} to ${nextStatus}.`,
        "citizen_report",
        report._id,
        user._id,
        report.status,
        nextStatus,
      );
    return { taskId: task._id };
  },
});

export const createSeparateCollectionTask = mutation({
  args: { reportId: v.id("citizenReports"), reason: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const report = await reportOrFail(ctx, args.reportId);
    requireActionable(report);
    requireProcessingSettled(report);
    requireCoordinates(report);
    if (report.category === undefined || report.priority === undefined)
      fail(
        "CLASSIFICATION_UNAVAILABLE",
        "Set an operational category and priority first.",
      );
    const reason = validatedManagerNote(args.reason, true);
    if (reason === null)
      fail("NOTE_REQUIRED", "Enter a reason between 3 and 240 characters.");
    const candidate = await candidateTaskForReport(ctx, report._id);
    if (candidate === null)
      fail(
        "CANDIDATE_REQUIRED",
        "There is no active candidate task to review.",
      );
    if (!(await candidateStillMatchesReport(ctx, report._id, candidate._id)))
      fail(
        "CANDIDATE_NO_LONGER_VALID",
        "The candidate task no longer matches this report.",
      );
    if (await activeLinkedTask(ctx, report))
      fail(
        "TASK_ALREADY_LINKED",
        "This report is linked to an active collection task.",
      );
    const now = Date.now();
    const task = await createTaskForReport(ctx, {
      reportId: report._id,
      priority: report.priority,
      reason,
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
      `Separate task ${task.displayId} created for ${report.referenceNumber} after candidate review.`,
      "collection_task",
      task._id,
      user._id,
    );
    await insertActivityEvent(
      ctx,
      "report_linked_to_task",
      `${report.referenceNumber} linked to separate task ${task.displayId}.`,
      "citizen_report",
      report._id,
      user._id,
    );
    await insertActivityEvent(
      ctx,
      "report_status_changed",
      `Report ${report.referenceNumber} status changed from ${report.status} to task_created.`,
      "citizen_report",
      report._id,
      user._id,
      report.status,
      "task_created",
    );
    return { taskId: task._id, displayId: task.displayId };
  },
});

export const markDuplicate = mutation({
  args: {
    reportId: v.id("citizenReports"),
    duplicateOfReportId: v.id("citizenReports"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    if (args.reportId === args.duplicateOfReportId)
      fail("DUPLICATE_TARGET_INVALID", "Choose a different canonical report.");
    const report = await reportOrFail(ctx, args.reportId);
    const target = await reportOrFail(ctx, args.duplicateOfReportId);
    requireActionable(report);
    requireProcessingSettled(report);
    if (!canReceiveManagerActions(target.status))
      fail(
        "DUPLICATE_TARGET_INVALID",
        "The canonical report must remain open.",
      );
    if (await activeLinkedTask(ctx, report))
      fail(
        "TASK_ALREADY_LINKED",
        "This report is linked to an active collection task.",
      );
    requireCoordinates(report);
    requireCoordinates(target);
    const settings = await globalSettings(ctx);
    if (settings === null)
      fail("DUPLICATE_TARGET_INVALID", "Duplicate settings are unavailable.");
    if (
      haversineDistanceMeters(
        report.latitude!,
        report.longitude!,
        target.latitude!,
        target.longitude!,
      ) > settings.duplicateDistanceThresholdMeters
    )
      fail(
        "DUPLICATE_TOO_FAR",
        "The selected report is outside the duplicate distance threshold.",
      );
    const now = Date.now();
    await ctx.db.patch(report._id, {
      status: "duplicate",
      duplicateOfReportId: target._id,
      needsClarification: false,
      statusUpdatedAt: now,
    });
    await insertActivityEvent(
      ctx,
      "report_status_changed",
      `Report ${report.referenceNumber} marked duplicate of ${target.referenceNumber}.`,
      "citizen_report",
      report._id,
      user._id,
      report.status,
      "duplicate",
    );
    return null;
  },
});

export const rejectReport = mutation({
  args: { reportId: v.id("citizenReports"), reason: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const report = await reportOrFail(ctx, args.reportId);
    requireActionable(report);
    requireProcessingSettled(report);
    const reason = validatedManagerNote(args.reason, true);
    if (reason === null)
      fail("NOTE_REQUIRED", "Enter a reason between 3 and 240 characters.");
    if (await activeLinkedTask(ctx, report))
      fail(
        "TASK_ALREADY_LINKED",
        "This report is linked to an active collection task.",
      );
    const now = Date.now();
    await ctx.db.patch(report._id, {
      status: "rejected",
      needsClarification: false,
      statusUpdatedAt: now,
    });
    await insertActivityEvent(
      ctx,
      "report_status_changed",
      `Report ${report.referenceNumber} rejected: ${reason}`,
      "citizen_report",
      report._id,
      user._id,
      report.status,
      "rejected",
    );
    return null;
  },
});

export const resolveReport = mutation({
  args: { reportId: v.id("citizenReports"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const report = await reportOrFail(ctx, args.reportId);
    requireActionable(report);
    requireProcessingSettled(report);
    const note =
      args.note === undefined ? "" : validatedManagerNote(args.note, false);
    if (note === null)
      fail(
        "NOTE_REQUIRED",
        "Resolution note must be between 3 and 240 characters.",
      );
    const task =
      report.linkedTaskId === undefined
        ? null
        : await ctx.db.get(report.linkedTaskId);
    if (task !== null && task.status !== "collected")
      fail(
        "LINKED_TASK_NOT_COLLECTED",
        "A linked task must be collected before resolving this report.",
      );
    const now = Date.now();
    await ctx.db.patch(report._id, {
      status: "resolved",
      resolvedAt: now,
      needsClarification: false,
      statusUpdatedAt: now,
    });
    await insertActivityEvent(
      ctx,
      "report_status_changed",
      `Report ${report.referenceNumber} resolved${note ? `: ${note}` : "."}`,
      "citizen_report",
      report._id,
      user._id,
      report.status,
      "resolved",
    );
    await insertActivityEvent(
      ctx,
      "report_resolved",
      `Report ${report.referenceNumber} manually resolved.`,
      "citizen_report",
      report._id,
      user._id,
    );
    return null;
  },
});
