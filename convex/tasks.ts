import { internalQuery } from "./_generated/server";

export const list = internalQuery({
  args: {},
  handler: (ctx) => ctx.db.query("collectionTasks").order("desc").collect(),
});
