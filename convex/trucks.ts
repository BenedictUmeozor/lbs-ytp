import { internalQuery } from "./_generated/server";

export const list = internalQuery({
  args: {},
  handler: async (ctx) => {
    const trucks = await ctx.db.query("trucks").collect();
    return trucks.sort((left, right) =>
      left.displayId.localeCompare(right.displayId),
    );
  },
});
