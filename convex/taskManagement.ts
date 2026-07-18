import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { markBinAwaitingEmptyConfirmation } from "./bins";
import { requireFleetManager } from "./domain/auth";
import {
  removeTaskFromProposedRoute,
  returnTaskToPendingFromProposedRoute,
  scheduleTaskOnProposedRoute,
  updateTaskRouteStopStatus,
} from "./domain/route_task_helpers";
import { resolveLinkedReportsForCollectedTask } from "./domain/task_helpers";
import { maybeCreateRouteReoptimisationNotification } from "./domain/route_reoptimisation_notifications";
import {
  canCancelTask,
  canChangeTaskPriority,
  canMarkTaskCollected,
  canMarkTaskUnableToComplete,
  isTaskEligibleForRoute,
} from "./domain/task_rules";
import { priorityValidator } from "./domain/validators";
import {
  insertActivityEvent,
  insertNotification,
} from "./domain/write_helpers";

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

function requiredReason(reason: string) {
  const value = reason.trim();
  if (value.length < 3 || value.length > 240)
    fail("NOTE_REQUIRED", "Enter a reason between 3 and 240 characters.");
  return value;
}

async function taskOrFail(
  ctx: QueryCtx | MutationCtx,
  taskId: Id<"collectionTasks">,
) {
  const task = await ctx.db.get(taskId);
  if (task === null)
    fail("TASK_NOT_FOUND", "This collection task is unavailable.");
  return task;
}

async function taskSource(ctx: QueryCtx, task: Doc<"collectionTasks">) {
  const [bin, report] = await Promise.all([
    task.sourceBinId === undefined ? null : ctx.db.get(task.sourceBinId),
    task.sourceReportId === undefined ? null : ctx.db.get(task.sourceReportId),
  ]);
  return {
    reference:
      bin?.displayId ??
      report?.referenceNumber ??
      (task.sourceType === "manual" ? "Manager-created" : "—"),
    locationLabel:
      bin?.address ??
      report?.resolvedLocationName ??
      report?.landmarkText ??
      `${task.latitude.toFixed(5)}, ${task.longitude.toFixed(5)}`,
    bin:
      bin === null
        ? null
        : { id: bin._id, displayId: bin.displayId, name: bin.name },
    report:
      report === null
        ? null
        : {
            id: report._id,
            referenceNumber: report.referenceNumber,
            summary: report.summary,
          },
  };
}

async function taskRow(ctx: QueryCtx, task: Doc<"collectionTasks">) {
  const [source, truck, route] = await Promise.all([
    taskSource(ctx, task),
    task.assignedTruckId === undefined
      ? null
      : ctx.db.get(task.assignedTruckId),
    task.routeId === undefined ? null : ctx.db.get(task.routeId),
  ]);
  return {
    id: task._id,
    displayId: task.displayId,
    sourceType: task.sourceType,
    sourceReference: source.reference,
    locationLabel: source.locationLabel,
    latitude: task.latitude,
    longitude: task.longitude,
    priority: task.priority,
    reason: task.reason,
    status: task.status,
    assignedTruck:
      truck === null
        ? null
        : {
            id: truck._id,
            displayId: truck.displayId,
            driverName: truck.driverName,
          },
    route:
      route === null
        ? null
        : { id: route._id, displayId: route.displayId, status: route.status },
    createdAt: task._creationTime,
    scheduledAt: task.scheduledAt,
    completedAt: task.completedAt,
    relatedBin: source.bin,
    linkedReportCount: task.linkedReportIds.length,
  };
}

async function clearCandidateReferences(
  ctx: MutationCtx,
  taskId: Id<"collectionTasks">,
) {
  const reports = await ctx.db
    .query("citizenReports")
    .withIndex("by_candidateTaskId", (q) => q.eq("candidateTaskId", taskId))
    .collect();
  for (const report of reports) {
    await ctx.db.patch(report._id, { candidateTaskId: undefined });
  }
}

async function restoreLinkedReports(
  ctx: MutationCtx,
  task: Doc<"collectionTasks">,
  actorUserId: Id<"users">,
  now: number,
) {
  for (const reportId of task.linkedReportIds) {
    const report = await ctx.db.get(reportId);
    if (
      report === null ||
      ["resolved", "duplicate", "rejected"].includes(report.status)
    )
      continue;
    await ctx.db.patch(report._id, {
      linkedTaskId: undefined,
      candidateTaskId: undefined,
      status: "under_review",
      statusUpdatedAt:
        report.status === "under_review" ? report.statusUpdatedAt : now,
    });
    if (report.status !== "under_review")
      await insertActivityEvent(
        ctx,
        "report_status_changed",
        `Report ${report.referenceNumber} returned to under_review after task ${task.displayId} ended.`,
        "citizen_report",
        report._id,
        actorUserId,
        report.status,
        "under_review",
      );
  }
}

export const listTasks = query({
  args: {},
  handler: async (ctx) => {
    await requireFleetManager(ctx);
    const tasks = await ctx.db.query("collectionTasks").order("desc").collect();
    return Promise.all(tasks.map((task) => taskRow(ctx, task)));
  },
});

export const getTaskDetail = query({
  args: { taskId: v.string() },
  handler: async (ctx, args) => {
    await requireFleetManager(ctx);
    const taskId = ctx.db.normalizeId("collectionTasks", args.taskId);
    if (taskId === null) return null;
    const task = await ctx.db.get(taskId);
    if (task === null) return null;
    const [
      row,
      source,
      linkedReports,
      truck,
      route,
      routeStop,
      history,
      proposedRoutes,
      settings,
    ] = await Promise.all([
      taskRow(ctx, task),
      taskSource(ctx, task),
      Promise.all(task.linkedReportIds.map((id) => ctx.db.get(id))).then(
        (reports) =>
          reports
            .filter(
              (report): report is Doc<"citizenReports"> => report !== null,
            )
            .map((report) => ({
              id: report._id,
              referenceNumber: report.referenceNumber,
              status: report.status,
              priority: report.priority,
              summary: report.summary,
            })),
      ),
      task.assignedTruckId === undefined
        ? null
        : ctx.db.get(task.assignedTruckId),
      task.routeId === undefined ? null : ctx.db.get(task.routeId),
      ctx.db
        .query("routeStops")
        .withIndex("by_taskId", (q) => q.eq("taskId", task._id))
        .first(),
      ctx.db
        .query("activityEvents")
        .withIndex("by_relatedEntityType_and_relatedEntityId", (q) =>
          q
            .eq("relatedEntityType", "collection_task")
            .eq("relatedEntityId", task._id),
        )
        .order("desc")
        .collect(),
      ctx.db
        .query("routes")
        .withIndex("by_status", (q) => q.eq("status", "proposed"))
        .collect(),
      ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", "global"))
        .unique(),
    ]);
    const availableRoutes = await Promise.all(
      proposedRoutes.map(async (proposedRoute) => {
        const stops = await ctx.db
          .query("routeStops")
          .withIndex("by_routeId_and_sequenceNumber", (q) =>
            q.eq("routeId", proposedRoute._id),
          )
          .collect();
        return {
          id: proposedRoute._id,
          displayId: proposedRoute.displayId,
          stopCount: stops.length,
          canAccept:
            settings !== null && stops.length < settings.maximumRouteStops,
        };
      }),
    );
    const proposedRouteStopCount =
      task.status === "scheduled" && route?.status === "proposed"
        ? (
            await ctx.db
              .query("routeStops")
              .withIndex("by_routeId_and_sequenceNumber", (q) =>
                q.eq("routeId", route._id),
              )
              .collect()
          ).length
        : 0;
    const isFinalProposedStop = proposedRouteStopCount === 1;
    const assignedRouteMustStart =
      task.status === "assigned" && route?.status === "assigned";
    const actionNotice = assignedRouteMustStart
      ? "Start the assigned route before marking this task unable to complete."
      : isFinalProposedStop
        ? "This is the proposal’s final stop. Cancel the proposed route instead."
        : undefined;
    const activityHistory = await Promise.all(
      history.map(async (event) => {
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
    return {
      task: row,
      source,
      linkedReports,
      assignedTruck:
        truck === null
          ? null
          : {
              id: truck._id,
              displayId: truck.displayId,
              driverName: truck.driverName,
            },
      route:
        route === null
          ? null
          : { id: route._id, displayId: route.displayId, status: route.status },
      routeStop:
        routeStop === null
          ? null
          : {
              id: routeStop._id,
              sequenceNumber: routeStop.sequenceNumber,
              status: routeStop.status,
            },
      activityHistory,
      proposedRoutes: availableRoutes,
      actions: {
        canEditPriority: canChangeTaskPriority(task),
        canAssignToRoute:
          isTaskEligibleForRoute(task) &&
          availableRoutes.some((routeOption) => routeOption.canAccept),
        canRemoveFromRoute:
          task.status === "scheduled" && route?.status === "proposed" && !isFinalProposedStop,
        canMarkUnableToComplete:
          canMarkTaskUnableToComplete(task) && !assignedRouteMustStart && !isFinalProposedStop,
        canCancel: canCancelTask(task) && !isFinalProposedStop,
        actionNotice,
        canMarkCollected: canMarkTaskCollected(task),
      },
      map: {
        latitude: task.latitude,
        longitude: task.longitude,
        sourceBinId: task.sourceBinId,
        sourceReportId: task.sourceReportId,
      },
    };
  },
});

export const updatePriority = mutation({
  args: { taskId: v.id("collectionTasks"), priority: priorityValidator },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const task = await taskOrFail(ctx, args.taskId);
    if (!canChangeTaskPriority(task))
      fail("TASK_TERMINAL", "Terminal tasks cannot be reprioritised.");
    if (task.priority === args.priority) return { changed: false };
    await ctx.db.patch(task._id, { priority: args.priority });
    const updatedTask = { ...task, priority: args.priority };
    if (updatedTask.priority === "critical" && updatedTask.status === "pending" && updatedTask.routeId === undefined)
      await maybeCreateRouteReoptimisationNotification(ctx, updatedTask);
    await insertActivityEvent(
      ctx,
      "task_status_changed",
      `Task ${task.displayId} priority changed from ${task.priority} to ${args.priority}.`,
      "collection_task",
      task._id,
      user._id,
    );
    return { changed: true };
  },
});

export const markUnableToComplete = mutation({
  args: { taskId: v.id("collectionTasks"), reason: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const task = await taskOrFail(ctx, args.taskId);
    if (task.status === "assigned" && task.routeId !== undefined) {
      const route = await ctx.db.get(task.routeId);
      if (route?.status === "assigned")
        fail("ASSIGNED_ROUTE_MUST_START", "Start the assigned route before marking this task unable to complete.");
    }
    const reason = requiredReason(args.reason);
    if (!canMarkTaskUnableToComplete(task))
      fail(
        "INVALID_TASK_TRANSITION",
        "This task cannot be marked unable to complete.",
      );
    let removedFromProposedRoute = false;
    if (task.status === "scheduled" && task.routeId !== undefined) {
      const route = await ctx.db.get(task.routeId);
      if (route?.status === "proposed") {
        await removeTaskFromProposedRoute(ctx, task._id);
        removedFromProposedRoute = true;
      }
    }
    const now = Date.now();
    await ctx.db.patch(task._id, {
      status: "unable_to_complete",
      statusUpdatedAt: now,
      ...(removedFromProposedRoute
        ? {
            routeId: undefined,
            scheduledAt: undefined,
            assignedTruckId: undefined,
          }
        : {}),
    });
    await restoreLinkedReports(ctx, task, user._id, now);
    if (!removedFromProposedRoute && task.routeId !== undefined) {
      const route = await ctx.db.get(task.routeId);
      if (route !== null && route.status !== "proposed")
        await updateTaskRouteStopStatus(ctx, task, "unable_to_complete", now);
    }
    await clearCandidateReferences(ctx, task._id);
    await insertNotification(
      ctx,
      "task_unable_to_complete",
      "warning",
      "Task unable to complete",
      `${task.displayId}: ${reason}`,
      "collection_task",
      task._id,
    );
    await insertActivityEvent(
      ctx,
      "task_status_changed",
      `Task ${task.displayId} marked unable to complete: ${reason}`,
      "collection_task",
      task._id,
      user._id,
      task.status,
      "unable_to_complete",
    );
    return null;
  },
});

export const cancelTask = mutation({
  args: { taskId: v.id("collectionTasks"), reason: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const task = await taskOrFail(ctx, args.taskId);
    const reason = requiredReason(args.reason);
    if (!canCancelTask(task))
      fail(
        "INVALID_TASK_TRANSITION",
        "Only pending or scheduled tasks can be cancelled.",
      );
    let removedFromProposedRoute = false;
    if (task.status === "scheduled" && task.routeId !== undefined) {
      await removeTaskFromProposedRoute(ctx, task._id);
      removedFromProposedRoute = true;
    }
    const now = Date.now();
    await ctx.db.patch(task._id, {
      status: "cancelled",
      statusUpdatedAt: now,
      ...(removedFromProposedRoute
        ? {
            routeId: undefined,
            scheduledAt: undefined,
            assignedTruckId: undefined,
          }
        : {}),
    });
    await restoreLinkedReports(ctx, task, user._id, now);
    await clearCandidateReferences(ctx, task._id);
    await insertActivityEvent(
      ctx,
      "task_status_changed",
      `Task ${task.displayId} cancelled: ${reason}`,
      "collection_task",
      task._id,
      user._id,
      task.status,
      "cancelled",
    );
    return null;
  },
});

export const markCollected = mutation({
  args: { taskId: v.id("collectionTasks") },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const task = await taskOrFail(ctx, args.taskId);
    if (!canMarkTaskCollected(task))
      fail(
        "INVALID_TASK_TRANSITION",
        "Only an en-route task can be marked collected.",
      );
    const now = Date.now();
    await ctx.db.patch(task._id, {
      status: "collected",
      statusUpdatedAt: now,
      completedAt: now,
    });
    if (task.sourceBinId !== undefined)
      await markBinAwaitingEmptyConfirmation(ctx, task);
    await resolveLinkedReportsForCollectedTask(ctx, task, user._id, now);
    await updateTaskRouteStopStatus(ctx, task, "completed", now);
    await clearCandidateReferences(ctx, task._id);
    await insertActivityEvent(
      ctx,
      "task_status_changed",
      `Task ${task.displayId} marked collected.`,
      "collection_task",
      task._id,
      user._id,
      task.status,
      "collected",
    );
    return null;
  },
});

export const assignToProposedRoute = mutation({
  args: { taskId: v.id("collectionTasks"), routeId: v.id("routes") },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const task = await taskOrFail(ctx, args.taskId);
    if (!isTaskEligibleForRoute(task))
      fail(
        "INVALID_TASK_TRANSITION",
        "Only a pending task without a route can be scheduled.",
      );
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    if (settings === null)
      fail("SETTINGS_UNAVAILABLE", "Route settings are unavailable.");
    await scheduleTaskOnProposedRoute(
      ctx,
      task,
      args.routeId,
      Math.min(settings.maximumRouteStops, 8),
      user._id,
      Date.now(),
    );
    return null;
  },
});

export const removeFromProposedRoute = mutation({
  args: { taskId: v.id("collectionTasks") },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const task = await taskOrFail(ctx, args.taskId);
    const route = await removeTaskFromProposedRoute(ctx, task._id);
    await returnTaskToPendingFromProposedRoute(
      ctx,
      task,
      route,
      user._id,
      Date.now(),
    );
    return null;
  },
});
