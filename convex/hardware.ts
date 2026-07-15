import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import {
  calculateAutomaticTaskPriority,
  calculateBinStatus,
  isCurrentReading,
  isUnusualReading,
  shouldConfirmEmptying,
} from "./domain/bin_rules";
import { createTaskForBin } from "./domain/task_helpers";
import {
  insertActivityEvent,
  insertNotification,
} from "./domain/write_helpers";

const ingestResultValidator = v.object({
  duplicate: v.boolean(),
  appliedToCurrentState: v.boolean(),
  unusualReading: v.boolean(),
  deviceStatus: v.union(
    v.literal("online"),
    v.literal("offline"),
    v.literal("inactive"),
  ),
  binStatus: v.union(
    v.literal("normal"),
    v.literal("approaching_full"),
    v.literal("collection_required"),
    v.literal("critical"),
    v.literal("awaiting_confirmation"),
  ),
  taskCreated: v.boolean(),
  taskId: v.optional(v.id("collectionTasks")),
  emptyingConfirmed: v.boolean(),
});

export const ingestReading = internalMutation({
  args: {
    deviceIdentifier: v.string(),
    binDisplayId: v.string(),
    fillPercentage: v.number(),
    recordedAt: v.number(),
    receivedAt: v.number(),
  },
  returns: ingestResultValidator,
  handler: async (ctx, args) => {
    const device = await ctx.db
      .query("devices")
      .withIndex("by_deviceIdentifier", (q) =>
        q.eq("deviceIdentifier", args.deviceIdentifier),
      )
      .unique();
    if (device === null) throw new Error("NOT_FOUND: Unknown device.");
    const bin = await ctx.db
      .query("bins")
      .withIndex("by_displayId", (q) => q.eq("displayId", args.binDisplayId))
      .unique();
    if (bin === null) throw new Error("NOT_FOUND: Unknown bin.");
    if (device.assignedBinId !== bin._id)
      throw new Error("CONFLICT: Device is not assigned to this bin.");
    if (device.source !== "real")
      throw new Error(
        "CONFLICT: Simulated devices cannot submit hardware readings.",
      );
    if (device.status === "inactive")
      throw new Error(
        "CONFLICT: Inactive devices cannot submit hardware readings.",
      );

    const duplicate = await ctx.db
      .query("sensorReadings")
      .withIndex("by_deviceId_and_recordedAt", (q) =>
        q.eq("deviceId", device._id).eq("recordedAt", args.recordedAt),
      )
      .unique();
    if (duplicate !== null) {
      return {
        duplicate: true,
        appliedToCurrentState: false,
        unusualReading: duplicate.unusualReading,
        deviceStatus: device.status,
        binStatus: bin.status,
        taskCreated: false,
        emptyingConfirmed: false,
      };
    }

    const previous = await ctx.db
      .query("sensorReadings")
      .withIndex("by_deviceId_and_recordedAt", (q) =>
        q.eq("deviceId", device._id).lt("recordedAt", args.recordedAt),
      )
      .order("desc")
      .first();
    const unusualReading = isUnusualReading(previous, args);
    const readingId = await ctx.db.insert("sensorReadings", {
      deviceId: device._id,
      binId: bin._id,
      fillPercentage: args.fillPercentage,
      recordedAt: args.recordedAt,
      receivedAt: args.receivedAt,
      unusualReading,
    });
    await insertActivityEvent(
      ctx,
      "sensor_reading_received",
      `Received ${args.fillPercentage}% reading from ${device.deviceIdentifier}.`,
      "sensor_reading",
      readingId,
    );

    if (!isCurrentReading(bin.lastReadingAt, args.recordedAt)) {
      return {
        duplicate: false,
        appliedToCurrentState: false,
        unusualReading,
        deviceStatus: device.status,
        binStatus: bin.status,
        taskCreated: false,
        emptyingConfirmed: false,
      };
    }

    let deviceStatus = device.status;
    await ctx.db.patch(device._id, {
      lastSeenAt: args.receivedAt,
      status: "online",
    });
    if (device.status === "offline") {
      deviceStatus = "online";
      await insertActivityEvent(
        ctx,
        "device_online",
        `Device ${device.deviceIdentifier} is online.`,
        "device",
        device._id,
        undefined,
        "offline",
        "online",
      );
    }

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    if (settings === null) throw new Error("Settings are unavailable.");
    const emptyingConfirmed = shouldConfirmEmptying(
      bin.awaitingEmptyConfirmation,
      args.fillPercentage,
      settings,
    );
    const nextStatus = emptyingConfirmed
      ? "normal"
      : calculateBinStatus(args.fillPercentage, settings);
    await ctx.db.patch(bin._id, {
      currentFillPercentage: args.fillPercentage,
      lastReadingAt: args.recordedAt,
      ...(emptyingConfirmed
        ? {
            awaitingEmptyConfirmation: false,
            lastCollectionAt: args.recordedAt,
          }
        : {}),
      status: nextStatus,
    });
    if (emptyingConfirmed) {
      await insertActivityEvent(
        ctx,
        "emptying_confirmed",
        `Sensor reading confirmed ${bin.displayId} was emptied.`,
        "bin",
        bin._id,
      );
    } else if (bin.status !== nextStatus) {
      await insertActivityEvent(
        ctx,
        "bin_status_changed",
        `${bin.displayId} changed from ${bin.status} to ${nextStatus}.`,
        "bin",
        bin._id,
        undefined,
        bin.status,
        nextStatus,
      );
      if (nextStatus === "collection_required")
        await insertNotification(
          ctx,
          "bin_collection_required",
          "warning",
          "Collection required",
          `${bin.displayId} reached the collection-required threshold.`,
          "bin",
          bin._id,
        );
      if (nextStatus === "critical")
        await insertNotification(
          ctx,
          "bin_critical",
          "critical",
          "Critical bin level",
          `${bin.displayId} reached the critical fill threshold.`,
          "bin",
          bin._id,
        );
    }
    const priority = calculateAutomaticTaskPriority(nextStatus);
    const taskResult =
      priority === null
        ? null
        : await createTaskForBin(ctx, {
            binId: bin._id,
            sourceType: "smart_bin",
            priority,
            reason:
              nextStatus === "critical"
                ? "Smart bin reached the critical fill threshold."
                : "Smart bin reached the collection-required threshold.",
          });
    return {
      duplicate: false,
      appliedToCurrentState: true,
      unusualReading,
      deviceStatus,
      binStatus: nextStatus,
      taskCreated: taskResult?.created ?? false,
      taskId: taskResult?.created ? taskResult.task._id : undefined,
      emptyingConfirmed,
    };
  },
});

export const evaluateOfflineDevices = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    if (settings === null) throw new Error("Settings are unavailable.");
    const cutoff =
      Date.now() - settings.deviceOfflineTimeoutMinutes * 60 * 1000;
    const devices = await ctx.db
      .query("devices")
      .withIndex("by_source", (q) => q.eq("source", "real"))
      .collect();
    let transitioned = 0;
    for (const device of devices) {
      if (
        device.status !== "online" ||
        device.lastSeenAt === undefined ||
        device.lastSeenAt > cutoff
      )
        continue;
      await ctx.db.patch(device._id, { status: "offline" });
      await insertNotification(
        ctx,
        "device_offline",
        "warning",
        "Device offline",
        `${device.deviceIdentifier} has not sent a reading within the configured timeout.`,
        "device",
        device._id,
      );
      await insertActivityEvent(
        ctx,
        "device_offline",
        `Device ${device.deviceIdentifier} is offline.`,
        "device",
        device._id,
        undefined,
        "online",
        "offline",
      );
      transitioned += 1;
    }
    return transitioned;
  },
});
