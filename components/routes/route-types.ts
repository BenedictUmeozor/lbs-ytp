import type { FunctionReturnType } from "convex/server";

import type { api } from "@/convex/_generated/api";

export type RouteBuilderData = FunctionReturnType<
  typeof api.routeManagement.getRouteBuilderData
>;
export type RouteList = FunctionReturnType<typeof api.routeManagement.listRoutes>;
export type RouteDetail = NonNullable<
  FunctionReturnType<typeof api.routeManagement.getRouteDetail>
>;

export const ROUTE_STATUSES = [
  "all",
  "proposed",
  "assigned",
  "active",
  "completed",
  "cancelled",
] as const;
export type RouteStatusFilter = (typeof ROUTE_STATUSES)[number];
export type RouteStatus = Exclude<RouteStatusFilter, "all">;
export type OrderedRouteStop = RouteDetail["orderedStops"][number];
export type RouteActions = RouteDetail["actions"];

export function routeStatusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
export function taskPriorityLabel(priority: string) { return routeStatusLabel(priority); }
export function formatDistance(kilometres: number) { return `${kilometres.toFixed(1)} km`; }
export function formatDuration(minutes: number) { return `${Math.round(minutes)} min`; }
export function simulatedPenaltyLabel(kind: "traffic" | "road", minutes: number) { return `Simulated ${kind === "traffic" ? "traffic" : "road-condition"} penalty: +${minutes} min`; }
