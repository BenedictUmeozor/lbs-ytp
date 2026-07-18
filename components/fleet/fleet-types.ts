import type { FunctionReturnType } from "convex/server";

import type { api } from "@/convex/_generated/api";

export type FleetTruck = FunctionReturnType<
  typeof api.fleetManagement.listTrucks
>[number];
export type TruckDetail = NonNullable<
  FunctionReturnType<typeof api.fleetManagement.getTruckDetail>
>;
export type TruckStatus = FleetTruck["status"];
export type MaintenanceRisk = FleetTruck["maintenanceRisk"];

export function truckStatusLabel(status: TruckStatus) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function maintenanceRiskLabel(risk: MaintenanceRisk) {
  return risk.charAt(0).toUpperCase() + risk.slice(1);
}

export function formatCoordinate(value: number) {
  return value.toFixed(5);
}

export function formatPercentage(value: number) {
  return `${Math.round(value)}%`;
}
