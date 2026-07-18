import type { FunctionReturnType } from "convex/server";

import type { api } from "@/convex/_generated/api";

export type FleetTruck = FunctionReturnType<
  typeof api.fleetManagement.listTrucks
>[number];
export type TruckDetail = NonNullable<
  FunctionReturnType<typeof api.fleetManagement.getTruckDetail>
>;
export function formatCoordinate(value: number) {
  return value.toFixed(5);
}

export function formatPercentage(value: number) {
  return `${Math.round(value)}%`;
}
