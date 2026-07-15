import { v } from "convex/values";

import { query } from "./_generated/server";
import { requireFleetManager } from "./domain/auth";
import { userRoleValidator } from "./domain/validators";

export const getCurrentFleetManager = query({
  args: {},
  returns: v.object({
    id: v.id("users"),
    name: v.string(),
    email: v.string(),
    role: userRoleValidator,
  }),
  handler: async (ctx) => {
    const { user } = await requireFleetManager(ctx);

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  },
});
