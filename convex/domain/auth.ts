import type { QueryCtx } from "../_generated/server";

type AuthContext = Pick<QueryCtx, "auth" | "db">;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function requireFleetManager(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Not authenticated.");
  }

  if (
    typeof identity.email !== "string" ||
    identity.email.trim().length === 0
  ) {
    throw new Error("A verified primary email is required.");
  }

  const email = normalizeEmail(identity.email);
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (query) => query.eq("email", email))
    .unique();

  if (user === null || user.role !== "fleet_manager") {
    throw new Error("Access denied.");
  }

  return { identity, user };
}
