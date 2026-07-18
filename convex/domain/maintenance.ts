import { ConvexError } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { insertActivityEvent, insertNotification } from "./write_helpers";

export type ApprovedMaintenanceScenario = "medium" | "high";

type MaintenanceErrorCode =
  | "TRUCK_NOT_FOUND"
  | "SIMULATED_MAINTENANCE_ONLY"
  | "TRUCK_RESERVED_FOR_ROUTE"
  | "MAINTENANCE_SCENARIO_UNAVAILABLE"
  | "MAINTENANCE_RISK_DOWNGRADE_NOT_ALLOWED";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const RISK_ORDER = { normal: 0, medium: 1, high: 2 } as const;

const SCENARIOS = {
  medium: {
    mileageSinceService: 4650,
    lastServiceDaysAgo: 82,
    batteryPercentage: 76,
    engineHealthScore: 72,
    reportedFault: "Approaching service interval",
    nextRecommendedServiceDaysFromNow: 5,
    recommendation: "Inspect after current operations",
  },
  high: {
    mileageSinceService: 7900,
    lastServiceDaysAgo: 145,
    batteryPercentage: 41,
    engineHealthScore: 48,
    reportedFault: "Simulated battery anomaly and overdue service",
    nextRecommendedServiceDaysFromNow: 0,
    recommendation: "Keep unavailable and schedule inspection",
  },
} as const;

function fail(code: MaintenanceErrorCode, message: string): never {
  throw new ConvexError({ code, message });
}

export async function applyApprovedMaintenanceScenario(
  ctx: MutationCtx,
  truckId: Id<"trucks">,
  scenario: ApprovedMaintenanceScenario,
  now: number,
  actorUserId?: Id<"users">,
) {
  const truck = await ctx.db.get(truckId);
  if (truck === null) fail("TRUCK_NOT_FOUND", "The truck was not found.");
  if (truck.source !== "simulated")
    fail(
      "SIMULATED_MAINTENANCE_ONLY",
      "Maintenance scenarios are available only for simulated trucks.",
    );

  const routes = await ctx.db
    .query("routes")
    .withIndex("by_truckId", (q) => q.eq("truckId", truckId))
    .collect();
  if (
    truck.assignedRouteId !== undefined ||
    routes.some((route) =>
      ["proposed", "assigned", "active"].includes(route.status),
    )
  )
    fail(
      "TRUCK_RESERVED_FOR_ROUTE",
      "The truck is reserved for an open route.",
    );

  if (RISK_ORDER[scenario] < RISK_ORDER[truck.maintenanceRisk])
    fail(
      "MAINTENANCE_RISK_DOWNGRADE_NOT_ALLOWED",
      "Maintenance risk cannot be downgraded through a scenario.",
    );
  if (scenario === "medium" && truck.status !== "available")
    fail(
      "MAINTENANCE_SCENARIO_UNAVAILABLE",
      "The Medium scenario requires an available truck.",
    );

  const approved = SCENARIOS[scenario];
  const alerts = await ctx.db
    .query("maintenanceAlerts")
    .withIndex("by_truckId", (q) => q.eq("truckId", truckId))
    .collect();
  const alert = alerts.find(
    (candidate) =>
      candidate.resolvedAt === undefined &&
      candidate.risk === scenario &&
      candidate.reason === approved.reportedFault &&
      candidate.simulated,
  );

  const approvedServiceWindow =
    (approved.lastServiceDaysAgo + approved.nextRecommendedServiceDaysFromNow) *
    DAY_IN_MILLISECONDS;
  const hasApprovedServiceWindow =
    alert !== undefined &&
    truck.nextRecommendedServiceAt !== undefined &&
    truck.nextRecommendedServiceAt - truck.lastServiceAt ===
      approvedServiceWindow;
  const lastServiceAt = hasApprovedServiceWindow
    ? truck.lastServiceAt
    : now - approved.lastServiceDaysAgo * DAY_IN_MILLISECONDS;
  const nextRecommendedServiceAt = hasApprovedServiceWindow
    ? truck.nextRecommendedServiceAt
    : now + approved.nextRecommendedServiceDaysFromNow * DAY_IN_MILLISECONDS;
  const patch = {
    maintenanceRisk: scenario,
    mileageSinceService: approved.mileageSinceService,
    lastServiceAt,
    batteryPercentage: approved.batteryPercentage,
    engineHealthScore: approved.engineHealthScore,
    reportedFault: approved.reportedFault,
    nextRecommendedServiceAt,
    ...(scenario === "high" ? { status: "maintenance" as const } : {}),
  };
  const truckChanged =
    truck.maintenanceRisk !== patch.maintenanceRisk ||
    truck.mileageSinceService !== patch.mileageSinceService ||
    truck.lastServiceAt !== patch.lastServiceAt ||
    truck.batteryPercentage !== patch.batteryPercentage ||
    truck.engineHealthScore !== patch.engineHealthScore ||
    truck.reportedFault !== patch.reportedFault ||
    truck.nextRecommendedServiceAt !== patch.nextRecommendedServiceAt ||
    (scenario === "high" && truck.status !== "maintenance");
  if (truckChanged) await ctx.db.patch(truckId, patch);

  let alertId: Id<"maintenanceAlerts"> | undefined;
  if (alert === undefined) {
    alertId = await ctx.db.insert("maintenanceAlerts", {
      truckId,
      risk: scenario,
      reason: approved.reportedFault,
      recommendation: approved.recommendation,
      simulated: true,
    });
    await insertActivityEvent(
      ctx,
      "maintenance_alert_created",
      `Simulated ${scenario}-risk maintenance alert created for ${truck.displayId}.`,
      "maintenance_alert",
      alertId,
      actorUserId,
      truck.maintenanceRisk,
      scenario,
    );
  }

  let notificationId: Id<"notifications"> | undefined;
  if (scenario === "high") {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_relatedEntityType_and_relatedEntityId", (q) =>
        q.eq("relatedEntityType", "truck").eq("relatedEntityId", truckId),
      )
      .collect();
    const existing = notifications.find(
      (notification) =>
        notification.type === "maintenance_high_risk" &&
        notification.readAt === undefined,
    );
    if (existing === undefined) {
      notificationId = await insertNotification(
        ctx,
        "maintenance_high_risk",
        "critical",
        `${truck.displayId} has high maintenance risk`,
        "Keep the simulated truck unavailable pending inspection.",
        "truck",
        truckId,
      );
    }
  }

  return {
    changed:
      truckChanged || alertId !== undefined || notificationId !== undefined,
    truckId,
    alertId,
    notificationId,
  };
}
