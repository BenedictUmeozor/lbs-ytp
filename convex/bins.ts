import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireFleetManager } from "./domain/auth";
import { createTaskForBin } from "./domain/task_helpers";
import {
  binStatusValidator,
  dataSourceValidator,
  deviceStatusValidator,
  priorityValidator,
  taskStatusValidator,
} from "./domain/validators";
import { insertActivityEvent } from "./domain/write_helpers";

const taskValidator = v.object({
  id: v.id("collectionTasks"),
  displayId: v.string(),
  status: taskStatusValidator,
  priority: priorityValidator,
  reason: v.string(),
  completedAt: v.optional(v.number()),
});
const rowValidator = v.object({
  id: v.id("bins"),
  displayId: v.string(),
  name: v.string(),
  address: v.string(),
  latitude: v.number(),
  longitude: v.number(),
  currentFillPercentage: v.number(),
  status: binStatusValidator,
  awaitingEmptyConfirmation: v.boolean(),
  lastReadingAt: v.optional(v.number()),
  lastCollectionAt: v.optional(v.number()),
  source: dataSourceValidator,
  deviceId: v.optional(v.id("devices")),
  deviceIdentifier: v.optional(v.string()),
  deviceStatus: v.optional(deviceStatusValidator),
  deviceLastSeenAt: v.optional(v.number()),
  deviceSource: v.optional(dataSourceValidator),
  activeTask: v.union(taskValidator, v.null()),
});

async function activeTask(ctx: QueryCtx | MutationCtx, binId: Id<"bins">) {
  const tasks = await ctx.db
    .query("collectionTasks")
    .withIndex("by_sourceBinId", (q) => q.eq("sourceBinId", binId))
    .collect();
  return (
    tasks.find((task) =>
      ["pending", "scheduled", "assigned", "en_route"].includes(task.status),
    ) ?? null
  );
}

async function binRow(ctx: QueryCtx | MutationCtx, bin: Doc<"bins">) {
  const device =
    bin.deviceId === undefined ? null : await ctx.db.get(bin.deviceId);
  const task = await activeTask(ctx, bin._id);
  return {
    id: bin._id,
    displayId: bin.displayId,
    name: bin.name,
    address: bin.address,
    latitude: bin.latitude,
    longitude: bin.longitude,
    currentFillPercentage: bin.currentFillPercentage,
    status: bin.status,
    awaitingEmptyConfirmation: bin.awaitingEmptyConfirmation,
    lastReadingAt: bin.lastReadingAt,
    lastCollectionAt: bin.lastCollectionAt,
    source: bin.source,
    deviceId: bin.deviceId,
    deviceIdentifier: device?.deviceIdentifier,
    deviceStatus: device?.status,
    deviceLastSeenAt: device?.lastSeenAt,
    deviceSource: device?.source,
    activeTask:
      task === null
        ? null
        : {
            id: task._id,
            displayId: task.displayId,
            status: task.status,
            priority: task.priority,
            reason: task.reason,
            completedAt: task.completedAt,
          },
  };
}

export const list = query({
  args: {},
  returns: v.array(rowValidator),
  handler: async (ctx) => {
    await requireFleetManager(ctx);
    const bins = await ctx.db.query("bins").collect();
    bins.sort((a, b) => a.displayId.localeCompare(b.displayId));
    return Promise.all(bins.map((bin) => binRow(ctx, bin)));
  },
});

export const getDetail = query({
  args: { binId: v.id("bins") },
  returns: v.union(
    v.object({
      row: rowValidator,
      readings: v.array(
        v.object({
          id: v.id("sensorReadings"),
          recordedAt: v.number(),
          receivedAt: v.number(),
          fillPercentage: v.number(),
          unusualReading: v.boolean(),
        }),
      ),
      unusualReadingCount: v.number(),
      collectionHistory: v.array(taskValidator),
      relatedReports: v.array(
        v.object({
          id: v.id("citizenReports"),
          referenceNumber: v.string(),
          summary: v.optional(v.string()),
          status: v.string(),
          priority: v.optional(priorityValidator),
          createdAt: v.number(),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await requireFleetManager(ctx);
    const bin = await ctx.db.get(args.binId);
    if (bin === null) return null;
    const [readings, tasks, reports] = await Promise.all([
      ctx.db
        .query("sensorReadings")
        .withIndex("by_binId_and_recordedAt", (q) => q.eq("binId", bin._id))
        .order("desc")
        .take(30),
      ctx.db
        .query("collectionTasks")
        .withIndex("by_sourceBinId", (q) => q.eq("sourceBinId", bin._id))
        .collect(),
      ctx.db
        .query("citizenReports")
        .withIndex("by_linkedBinId", (q) => q.eq("linkedBinId", bin._id))
        .collect(),
    ]);
    return {
      row: await binRow(ctx, bin),
      readings: readings
        .reverse()
        .map((reading) => ({
          id: reading._id,
          recordedAt: reading.recordedAt,
          receivedAt: reading.receivedAt,
          fillPercentage: reading.fillPercentage,
          unusualReading: reading.unusualReading,
        })),
      unusualReadingCount: readings.filter((reading) => reading.unusualReading)
        .length,
      collectionHistory: tasks
        .filter((task) => task.status === "collected")
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
        .map((task) => ({
          id: task._id,
          displayId: task.displayId,
          status: task.status,
          priority: task.priority,
          reason: task.reason,
          completedAt: task.completedAt,
        })),
      relatedReports: reports.map((report) => ({
        id: report._id,
        referenceNumber: report.referenceNumber,
        summary: report.summary,
        status: report.status,
        priority: report.priority,
        createdAt: report._creationTime,
      })),
    };
  },
});

export const createManualTask = mutation({
  args: {
    binId: v.id("bins"),
    priority: priorityValidator,
    reason: v.string(),
  },
  returns: taskValidator,
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    if (args.reason.trim() === "") throw new Error("A reason is required.");
    const result = await createTaskForBin(ctx, {
      ...args,
      reason: args.reason.trim(),
      sourceType: "manual",
      actorUserId: user._id,
    });
    if (!result.created)
      throw new Error("This bin already has an active task.");
    const task = result.task;
    return {
      id: task._id,
      displayId: task.displayId,
      status: task.status,
      priority: task.priority,
      reason: task.reason,
      completedAt: task.completedAt,
    };
  },
});

export const markDeviceInactive = mutation({
  args: { binId: v.id("bins") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const bin = await ctx.db.get(args.binId);
    if (bin?.deviceId === undefined) throw new Error("This bin has no device.");
    const device = bin === null ? null : await ctx.db.get(bin.deviceId!);
    if (device === null) throw new Error("Device not found.");
    if (device.status === "inactive") return false;
    await ctx.db.patch(device._id, { status: "inactive" });
    await insertActivityEvent(
      ctx,
      "device_inactive",
      `Device ${device.deviceIdentifier} was marked inactive.`,
      "device",
      device._id,
      user._id,
      device.status,
      "inactive",
    );
    return true;
  },
});

export const updateBinDetails = mutation({
  args: {
    binId: v.id("bins"),
    name: v.string(),
    address: v.string(),
    latitude: v.number(),
    longitude: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const bin = await ctx.db.get(args.binId);
    if (bin === null) throw new Error("Bin not found.");
    if (!args.name.trim() || !args.address.trim())
      throw new Error("Name and address are required.");
    if (
      !Number.isFinite(args.latitude) ||
      args.latitude < -90 ||
      args.latitude > 90 ||
      !Number.isFinite(args.longitude) ||
      args.longitude < -180 ||
      args.longitude > 180
    )
      throw new Error("Coordinates are invalid.");
    await ctx.db.patch(bin._id, {
      name: args.name.trim(),
      address: args.address.trim(),
      latitude: args.latitude,
      longitude: args.longitude,
    });
    await insertActivityEvent(
      ctx,
      "bin_details_updated",
      `Details updated for ${bin.displayId}.`,
      "bin",
      bin._id,
      user._id,
    );
    return null;
  },
});

export const confirmEmptyingManually = mutation({
  args: { binId: v.id("bins") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    const bin = await ctx.db.get(args.binId);
    if (bin === null) throw new Error("Bin not found.");
    if (!bin.awaitingEmptyConfirmation)
      throw new Error("This bin is not awaiting emptying confirmation.");
    const now = Date.now();
    await ctx.db.patch(bin._id, {
      currentFillPercentage: 0,
      status: "normal",
      awaitingEmptyConfirmation: false,
      lastCollectionAt: now,
    });
    await insertActivityEvent(
      ctx,
      "manual_emptying_confirmed",
      `Emptying manually confirmed for ${bin.displayId}.`,
      "bin",
      bin._id,
      user._id,
      "awaiting_confirmation",
      "normal",
    );
    return null;
  },
});

export async function markBinAwaitingEmptyConfirmation(
  ctx: MutationCtx,
  task: Pick<Doc<"collectionTasks">, "_id" | "sourceBinId">,
) {
  if (task.sourceBinId === undefined) return;
  const bin = await ctx.db.get(task.sourceBinId);
  if (bin === null) return;
  await ctx.db.patch(bin._id, {
    status: "awaiting_confirmation",
    awaitingEmptyConfirmation: true,
  });
  await insertActivityEvent(
    ctx,
    "bin_status_changed",
    `Collection task ${task._id} is awaiting sensor confirmation.`,
    "bin",
    bin._id,
    undefined,
    bin.status,
    "awaiting_confirmation",
  );
}
