import { v } from "convex/values";

import { internalQuery } from "./_generated/server";
import { getBinOperationalRecord } from "./domain/read_helpers";

function getLimit(limit: number | undefined, maximum: number) {
  const resolved = limit ?? 50;
  if (!Number.isInteger(resolved) || resolved < 1 || resolved > maximum)
    throw new Error(`limit must be an integer between 1 and ${maximum}.`);
  return resolved;
}

export const list = internalQuery({
  args: {},
  handler: async (ctx) => {
    const bins = await ctx.db.query("bins").collect();
    bins.sort((left, right) => left.displayId.localeCompare(right.displayId));
    return Promise.all(bins.map((bin) => getBinOperationalRecord(ctx, bin)));
  },
});

export const getById = internalQuery({
  args: { binId: v.id("bins") },
  handler: async (ctx, args) => {
    const bin = await ctx.db.get(args.binId);
    return bin === null ? null : getBinOperationalRecord(ctx, bin);
  },
});

export const listReadings = internalQuery({
  args: { binId: v.id("bins"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const readings = await ctx.db
      .query("sensorReadings")
      .withIndex("by_binId_and_recordedAt", (q) => q.eq("binId", args.binId))
      .order("desc")
      .take(getLimit(args.limit, 200));
    return readings.reverse();
  },
});
