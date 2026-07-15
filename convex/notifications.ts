import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";

function getLimit(limit: number | undefined) {
  const resolved = limit ?? 50;
  if (!Number.isInteger(resolved) || resolved < 1 || resolved > 100)
    throw new Error("limit must be an integer between 1 and 100.");
  return resolved;
}

export const list = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: (ctx, args) =>
    ctx.db.query("notifications").order("desc").take(getLimit(args.limit)),
});

export const markRead = internalMutation({
  args: { notificationId: v.id("notifications") },
  returns: v.object({ changed: v.boolean(), readAt: v.number() }),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (notification === null) throw new Error("Notification does not exist.");
    if (notification.readAt !== undefined)
      return { changed: false, readAt: notification.readAt };
    const readAt = Date.now();
    await ctx.db.patch(notification._id, { readAt });
    return { changed: true, readAt };
  },
});
