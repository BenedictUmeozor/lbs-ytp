import { v } from "convex/values";

import { mutation } from "./_generated/server";
import { requireFleetManager } from "./domain/auth";
import { applyApprovedMaintenanceScenario } from "./domain/maintenance";

export const applyApprovedScenario = mutation({
  args: {
    truckId: v.id("trucks"),
    scenario: v.union(v.literal("medium"), v.literal("high")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireFleetManager(ctx);
    return applyApprovedMaintenanceScenario(
      ctx,
      args.truckId,
      args.scenario,
      Date.now(),
      user._id,
    );
  },
});
