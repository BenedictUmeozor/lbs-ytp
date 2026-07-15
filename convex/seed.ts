import { v } from "convex/values";

import type { Id, TableNames } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import {
  demoBins,
  demoDevices,
  demoMaintenanceAlerts,
  demoNotifications,
  demoReports,
  demoTasks,
  demoTrucks,
  globalSettings,
} from "./domain/demo_data";
import { insertActivityEvent, insertNotification } from "./domain/write_helpers";

const MVP_TABLES = [
  "activityEvents",
  "notifications",
  "maintenanceAlerts",
  "routeStops",
  "routes",
  "collectionTasks",
  "citizenReports",
  "whatsappConversations",
  "sensorReadings",
  "devices",
  "bins",
  "trucks",
  "users",
  "settings",
] as const satisfies readonly TableNames[];

type DatasetCounts = Record<(typeof MVP_TABLES)[number], number>;

type DeletedCounts = DatasetCounts;

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const MINUTE_IN_MILLISECONDS = 60 * 1000;

async function clearTable<TableName extends TableNames>(
  ctx: MutationCtx,
  tableName: TableName,
): Promise<number> {
  const documents = await ctx.db.query(tableName).collect();

  for (const document of documents) {
    await ctx.db.delete(document._id);
  }

  return documents.length;
}

async function clearAllMvpTables(ctx: MutationCtx): Promise<DeletedCounts> {
  const deletedCounts = {} as DeletedCounts;

  for (const tableName of MVP_TABLES) {
    deletedCounts[tableName] = await clearTable(ctx, tableName);
  }

  return deletedCounts;
}

async function getDatasetCounts(ctx: MutationCtx): Promise<DatasetCounts> {
  return {
    users: (await ctx.db.query("users").collect()).length,
    devices: (await ctx.db.query("devices").collect()).length,
    bins: (await ctx.db.query("bins").collect()).length,
    sensorReadings: (await ctx.db.query("sensorReadings").collect()).length,
    citizenReports: (await ctx.db.query("citizenReports").collect()).length,
    whatsappConversations: (await ctx.db.query("whatsappConversations").collect())
      .length,
    collectionTasks: (await ctx.db.query("collectionTasks").collect()).length,
    trucks: (await ctx.db.query("trucks").collect()).length,
    routes: (await ctx.db.query("routes").collect()).length,
    routeStops: (await ctx.db.query("routeStops").collect()).length,
    maintenanceAlerts: (await ctx.db.query("maintenanceAlerts").collect()).length,
    notifications: (await ctx.db.query("notifications").collect()).length,
    activityEvents: (await ctx.db.query("activityEvents").collect()).length,
    settings: (await ctx.db.query("settings").collect()).length,
  };
}

async function hasAnyMvpRecords(ctx: MutationCtx): Promise<boolean> {
  for (const tableName of MVP_TABLES) {
    const document = await ctx.db.query(tableName).first();
    if (document !== null) {
      return true;
    }
  }

  return false;
}

async function insertDemoDataset(ctx: MutationCtx, now: number): Promise<void> {
  await ctx.db.insert("settings", globalSettings);

  const truckIds = new Map<string, Id<"trucks">>();
  for (const truck of demoTrucks) {
    const truckId = await ctx.db.insert("trucks", {
      displayId: truck.displayId,
      driverName: truck.driverName,
      status: truck.status,
      latitude: truck.latitude,
      longitude: truck.longitude,
      capacityPercentage: truck.capacityPercentage,
      maintenanceRisk: truck.maintenanceRisk,
      mileageSinceService: truck.mileageSinceService,
      lastServiceAt: now - truck.lastServiceDaysAgo * DAY_IN_MILLISECONDS,
      batteryPercentage: truck.batteryPercentage,
      engineHealthScore: truck.engineHealthScore,
      reportedFault: truck.reportedFault,
      nextRecommendedServiceAt:
        now + truck.nextRecommendedServiceDaysFromNow * DAY_IN_MILLISECONDS,
      source: "simulated",
    });
    truckIds.set(truck.displayId, truckId);
  }

  const binIds = new Map<string, Id<"bins">>();
  for (const bin of demoBins) {
    const binId = await ctx.db.insert("bins", {
      displayId: bin.displayId,
      name: bin.name,
      address: bin.address,
      latitude: bin.latitude,
      longitude: bin.longitude,
      currentFillPercentage: bin.currentFillPercentage,
      status: bin.status,
      lastReadingAt: now - MINUTE_IN_MILLISECONDS,
      source: bin.source,
      awaitingEmptyConfirmation: bin.awaitingEmptyConfirmation,
    });
    binIds.set(bin.displayId, binId);
  }

  const deviceIds = new Map<string, Id<"devices">>();
  for (const device of demoDevices) {
    const assignedBinId = binIds.get(device.binDisplayId);
    if (assignedBinId === undefined) {
      throw new Error(`Missing seeded bin ${device.binDisplayId}.`);
    }

    const deviceId = await ctx.db.insert("devices", {
      deviceIdentifier: device.deviceIdentifier,
      assignedBinId,
      status: device.status,
      lastSeenAt: now - MINUTE_IN_MILLISECONDS,
      source: device.source,
    });
    deviceIds.set(device.deviceIdentifier, deviceId);
  }

  for (const device of demoDevices) {
    const binId = binIds.get(device.binDisplayId);
    const deviceId = deviceIds.get(device.deviceIdentifier);
    if (binId === undefined || deviceId === undefined) {
      throw new Error(`Missing seeded device relationship for ${device.deviceIdentifier}.`);
    }
    await ctx.db.patch("bins", binId, { deviceId });
  }

  const readingIds = new Map<string, Id<"sensorReadings">>();
  const readingOffsets = [60, 30, 1] as const;
  for (const [index, bin] of demoBins.entries()) {
    const binId = binIds.get(bin.displayId);
    const deviceId = deviceIds.get(demoDevices[index].deviceIdentifier);
    if (binId === undefined || deviceId === undefined) {
      throw new Error(`Missing seeded reading relationship for ${bin.displayId}.`);
    }

    for (const [readingIndex, fillPercentage] of bin.readings.entries()) {
      const recordedAt = now - readingOffsets[readingIndex] * MINUTE_IN_MILLISECONDS;
      const readingId = await ctx.db.insert("sensorReadings", {
        deviceId,
        binId,
        fillPercentage,
        recordedAt,
        receivedAt: recordedAt + 1000,
        unusualReading: false,
      });
      if (readingIndex === bin.readings.length - 1) {
        readingIds.set(bin.displayId, readingId);
      }
    }
  }

  const reportIds = new Map<string, Id<"citizenReports">>();
  for (const report of demoReports) {
    const reportId = await ctx.db.insert("citizenReports", {
      referenceNumber: report.referenceNumber,
      source: report.source,
      originalMessage: report.originalMessage,
      category: report.category,
      priority: report.priority,
      summary: report.summary,
      landmarkText: report.landmarkText,
      latitude: report.latitude,
      longitude: report.longitude,
      requiresCollection: report.requiresCollection,
      needsClarification: report.needsClarification,
      aiStatus: report.aiStatus,
      status: report.status,
      statusUpdatedAt: now - report.statusUpdatedMinutesAgo * MINUTE_IN_MILLISECONDS,
      duplicateCandidateReportIds: [],
      resolvedAt:
        report.resolvedMinutesAgo === undefined
          ? undefined
          : now - report.resolvedMinutesAgo * MINUTE_IN_MILLISECONDS,
    });
    reportIds.set(report.referenceNumber, reportId);
  }

  const taskIds = new Map<string, Id<"collectionTasks">>();
  for (const task of demoTasks) {
    const sourceBinId = task.sourceBinDisplayId === undefined
      ? undefined
      : binIds.get(task.sourceBinDisplayId);
    const sourceReportId = task.sourceReportReference === undefined
      ? undefined
      : reportIds.get(task.sourceReportReference);
    const assignedTruckId = task.assignedTruckDisplayId === undefined
      ? undefined
      : truckIds.get(task.assignedTruckDisplayId);
    const linkedReportIds = task.linkedReportReferences.map((reference) => {
      const reportId = reportIds.get(reference);
      if (reportId === undefined) {
        throw new Error(`Missing seeded report ${reference}.`);
      }
      return reportId;
    });

    if (
      (task.sourceBinDisplayId !== undefined && sourceBinId === undefined) ||
      (task.sourceReportReference !== undefined && sourceReportId === undefined) ||
      (task.assignedTruckDisplayId !== undefined && assignedTruckId === undefined)
    ) {
      throw new Error(`Missing seeded task relationship for ${task.displayId}.`);
    }

    const taskId = await ctx.db.insert("collectionTasks", {
      displayId: task.displayId,
      sourceType: task.sourceType,
      sourceBinId,
      sourceReportId,
      linkedReportIds,
      latitude: task.latitude,
      longitude: task.longitude,
      priority: task.priority,
      reason: task.reason,
      status: task.status,
      assignedTruckId,
      statusUpdatedAt: now - task.statusUpdatedMinutesAgo * MINUTE_IN_MILLISECONDS,
      completedAt:
        task.completedMinutesAgo === undefined
          ? undefined
          : now - task.completedMinutesAgo * MINUTE_IN_MILLISECONDS,
    });
    taskIds.set(task.displayId, taskId);
  }

  for (const [reportReference, taskDisplayId] of [
    ["WR-1001", "CT-004"],
    ["WR-1002", "CT-003"],
    ["WR-1006", "CT-005"],
  ] as const) {
    const reportId = reportIds.get(reportReference);
    const taskId = taskIds.get(taskDisplayId);
    if (reportId === undefined || taskId === undefined) {
      throw new Error(`Missing seeded report-task relationship for ${reportReference}.`);
    }
    await ctx.db.patch("citizenReports", reportId, { linkedTaskId: taskId });
  }

  const maintenanceAlertIds = new Map<string, Id<"maintenanceAlerts">>();
  for (const alert of demoMaintenanceAlerts) {
    const truckId = truckIds.get(alert.truckDisplayId);
    if (truckId === undefined) {
      throw new Error(`Missing seeded truck ${alert.truckDisplayId}.`);
    }
    const alertId = await ctx.db.insert("maintenanceAlerts", {
      truckId,
      risk: alert.risk,
      reason: alert.reason,
      recommendation: alert.recommendation,
      simulated: alert.simulated,
    });
    maintenanceAlertIds.set(alert.truckDisplayId, alertId);
  }

  for (const notification of demoNotifications) {
    const relatedEntityId = notification.relatedEntityType === "bin"
      ? binIds.get(notification.relatedEntityKey)
      : notification.relatedEntityType === "citizen_report"
        ? reportIds.get(notification.relatedEntityKey)
        : truckIds.get(notification.relatedEntityKey);
    if (relatedEntityId === undefined) {
      throw new Error(`Missing notification relationship for ${notification.title}.`);
    }
    await insertNotification(
      ctx,
      notification.type,
      notification.severity,
      notification.title,
      notification.description,
      notification.relatedEntityType,
      relatedEntityId,
    );
  }

  const requireId = <TableName extends TableNames>(
    id: Id<TableName> | undefined,
    description: string,
  ): Id<TableName> => {
    if (id === undefined) {
      throw new Error(`Missing seeded ${description}.`);
    }
    return id;
  };

  await insertActivityEvent(ctx, "sensor_reading_received", "Latest reading received from BG-001.", "sensor_reading", requireId(readingIds.get("BG-001"), "BG-001 reading"));
  await insertActivityEvent(ctx, "sensor_reading_received", "Latest reading received from BG-002.", "sensor_reading", requireId(readingIds.get("BG-002"), "BG-002 reading"));
  await insertActivityEvent(ctx, "sensor_reading_received", "Latest reading received from BG-003.", "sensor_reading", requireId(readingIds.get("BG-003"), "BG-003 reading"));
  await insertActivityEvent(ctx, "bin_status_changed", "BG-002 reached collection required.", "bin", requireId(binIds.get("BG-002"), "BG-002 bin"), undefined, "approaching_full", "collection_required");
  await insertActivityEvent(ctx, "bin_status_changed", "BG-003 reached critical.", "bin", requireId(binIds.get("BG-003"), "BG-003 bin"), undefined, "collection_required", "critical");
  await insertActivityEvent(ctx, "report_submitted", "WR-1001 was submitted.", "citizen_report", requireId(reportIds.get("WR-1001"), "WR-1001 report"));
  await insertActivityEvent(ctx, "report_classified", "WR-1001 was classified as high priority.", "citizen_report", requireId(reportIds.get("WR-1001"), "WR-1001 report"));
  await insertActivityEvent(ctx, "report_submitted", "WR-1002 was submitted.", "citizen_report", requireId(reportIds.get("WR-1002"), "WR-1002 report"));
  await insertActivityEvent(ctx, "report_classified", "WR-1002 was classified as critical.", "citizen_report", requireId(reportIds.get("WR-1002"), "WR-1002 report"));
  await insertActivityEvent(ctx, "task_created", "CT-001 was created from BG-003.", "collection_task", requireId(taskIds.get("CT-001"), "CT-001 task"));
  await insertActivityEvent(ctx, "task_created", "CT-002 was created from BG-002.", "collection_task", requireId(taskIds.get("CT-002"), "CT-002 task"));
  await insertActivityEvent(ctx, "task_created", "CT-003 was created from WR-1002.", "collection_task", requireId(taskIds.get("CT-003"), "CT-003 task"));
  await insertActivityEvent(ctx, "task_created", "CT-004 was created from WR-1001.", "collection_task", requireId(taskIds.get("CT-004"), "CT-004 task"));
  await insertActivityEvent(ctx, "task_status_changed", "CT-005 was collected.", "collection_task", requireId(taskIds.get("CT-005"), "CT-005 task"), undefined, "en_route", "collected");
  await insertActivityEvent(ctx, "report_resolved", "WR-1006 was resolved.", "citizen_report", requireId(reportIds.get("WR-1006"), "WR-1006 report"));
  await insertActivityEvent(ctx, "maintenance_alert_created", "High-risk maintenance alert created for TRK-03.", "maintenance_alert", requireId(maintenanceAlertIds.get("TRK-03"), "TRK-03 maintenance alert"));
}

const datasetCountsValidator = v.object({
  users: v.number(),
  devices: v.number(),
  bins: v.number(),
  sensorReadings: v.number(),
  citizenReports: v.number(),
  whatsappConversations: v.number(),
  collectionTasks: v.number(),
  trucks: v.number(),
  routes: v.number(),
  routeStops: v.number(),
  maintenanceAlerts: v.number(),
  notifications: v.number(),
  activityEvents: v.number(),
  settings: v.number(),
});

export const seedDemoData = internalMutation({
  args: {},
  returns: v.object({
    status: v.union(v.literal("seeded"), v.literal("already_seeded")),
    counts: datasetCountsValidator,
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_key", (query) => query.eq("key", "global"))
      .first();

    if (settings !== null) {
      return { status: "already_seeded" as const, counts: await getDatasetCounts(ctx) };
    }

    if (await hasAnyMvpRecords(ctx)) {
      throw new Error(
        "The database contains a partial or unrelated dataset. Use the protected resetDemoData operation before seeding demo data.",
      );
    }

    await insertDemoDataset(ctx, now);
    return { status: "seeded" as const, counts: await getDatasetCounts(ctx) };
  },
});

export const resetDemoData = internalMutation({
  args: {},
  returns: v.object({
    status: v.literal("reset"),
    deletedCounts: datasetCountsValidator,
    seededCounts: datasetCountsValidator,
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const deletedCounts = await clearAllMvpTables(ctx);
    await insertDemoDataset(ctx, now);

    return {
      status: "reset" as const,
      deletedCounts,
      seededCounts: await getDatasetCounts(ctx),
    };
  },
});
