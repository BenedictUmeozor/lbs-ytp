import { v } from "convex/values";

import { internalQuery } from "./_generated/server";
import { getRouteOperationalRecord } from "./domain/read_helpers";

export const list = internalQuery({
  args: {},
  handler: (ctx) => ctx.db.query("routes").order("desc").collect(),
});

export const getActive = internalQuery({
  args: {},
  handler: async (ctx) => {
    const route = await ctx.db
      .query("routes")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .first();
    return route === null ? null : getRouteOperationalRecord(ctx, route);
  },
});

export const listStops = internalQuery({
  args: { routeId: v.id("routes") },
  handler: async (ctx, args) => {
    const route = await ctx.db.get(args.routeId);
    if (route === null) return null;
    return (await getRouteOperationalRecord(ctx, route)).stops;
  },
});
