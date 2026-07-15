import { internalQuery } from "./_generated/server";

const riskOrder = { high: 0, medium: 1, normal: 2 } as const;

export const listAlerts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const alerts = await ctx.db.query("maintenanceAlerts").collect();
    const records = await Promise.all(alerts.map(async (alert) => {
      const truck = await ctx.db.get(alert.truckId);
      if (truck === null) throw new Error(`Maintenance alert ${alert._id} references a missing truck.`);
      return { alert, truck };
    }));
    return records.sort((left, right) => {
      const resolved = Number(left.alert.resolvedAt !== undefined) - Number(right.alert.resolvedAt !== undefined);
      return resolved || riskOrder[left.alert.risk] - riskOrder[right.alert.risk] || right.alert._creationTime - left.alert._creationTime;
    });
  },
});
