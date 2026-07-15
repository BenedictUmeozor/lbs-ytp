import { v } from "convex/values";

import { internalQuery } from "./_generated/server";

export const listRecent = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: (ctx, args) => {
    const limit = args.limit ?? 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new Error("limit must be an integer between 1 and 100.");
    return ctx.db.query("activityEvents").order("desc").take(limit);
  },
});
