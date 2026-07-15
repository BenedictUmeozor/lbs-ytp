import { v } from "convex/values";

import { internalQuery } from "./_generated/server";
import { getBinOperationalRecord, getRouteOperationalRecord } from "./domain/read_helpers";

function getStartOfTodayInLagos(timestamp: number): number {
  const lagosTime = new Date(timestamp + 60 * 60 * 1000);
  return Date.UTC(lagosTime.getUTCFullYear(), lagosTime.getUTCMonth(), lagosTime.getUTCDate()) - 60 * 60 * 1000;
}

export const getOverviewSummary = internalQuery({
  args: {},
  returns: v.object({
    totalMonitoredBins: v.number(),
    binsRequiringCollection: v.number(),
    criticalBins: v.number(),
    openCitizenReports: v.number(),
    pendingCollectionTasks: v.number(),
    activeTrucks: v.number(),
    collectionsCompletedToday: v.number(),
    trucksWithMaintenanceAlerts: v.number(),
  }),
  handler: async (ctx) => {
    const [bins, reports, tasks, trucks, alerts] = await Promise.all([
      ctx.db.query("bins").collect(),
      ctx.db.query("citizenReports").collect(),
      ctx.db.query("collectionTasks").collect(),
      ctx.db.query("trucks").collect(),
      ctx.db.query("maintenanceAlerts").collect(),
    ]);
    const startOfToday = getStartOfTodayInLagos(Date.now());
    return {
      totalMonitoredBins: bins.length,
      binsRequiringCollection: bins.filter((bin) => bin.status === "collection_required" || bin.status === "critical").length,
      criticalBins: bins.filter((bin) => bin.status === "critical").length,
      openCitizenReports: reports.filter((report) => !["resolved", "duplicate", "rejected"].includes(report.status)).length,
      pendingCollectionTasks: tasks.filter((task) => task.status === "pending").length,
      activeTrucks: trucks.filter((truck) => truck.status !== "maintenance" && truck.status !== "offline").length,
      collectionsCompletedToday: tasks.filter((task) => task.status === "collected" && task.completedAt !== undefined && task.completedAt >= startOfToday).length,
      trucksWithMaintenanceAlerts: new Set(alerts.filter((alert) => alert.resolvedAt === undefined).map((alert) => alert.truckId)).size,
    };
  },
});

export const getMapData = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [settings, bins, reports, trucks, route] = await Promise.all([
      ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "global")).unique(),
      ctx.db.query("bins").collect(),
      ctx.db.query("citizenReports").collect(),
      ctx.db.query("trucks").collect(),
      ctx.db.query("routes").withIndex("by_status", (q) => q.eq("status", "active")).first(),
    ]);
    return {
      depot: settings === null ? null : { latitude: settings.depotLatitude, longitude: settings.depotLongitude, label: "Bariga Pilot Depot", source: "simulated" as const },
      bins: await Promise.all(bins.map((bin) => getBinOperationalRecord(ctx, bin))),
      reports: reports.filter((report) => report.latitude !== undefined && report.longitude !== undefined),
      trucks,
      activeRoute: route === null ? null : await getRouteOperationalRecord(ctx, route),
    };
  },
});
