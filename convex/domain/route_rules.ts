import type { Doc } from "../_generated/dataModel";
import type { RouteStatus, RouteStopStatus } from "./validators";

const openRouteStatuses = new Set<RouteStatus>(["proposed", "assigned", "active"]);
const terminalStopStatuses = new Set<RouteStopStatus>([
  "completed",
  "unable_to_complete",
]);

export function isOpenRouteStatus(status: RouteStatus) {
  return openRouteStatuses.has(status);
}

export function canEditProposedRoute(route: Doc<"routes">) {
  return route.status === "proposed";
}

export function canAssignRoute(route: Doc<"routes">, stopCount: number) {
  return canEditProposedRoute(route) && stopCount > 0;
}

export function canStartRoute(route: Doc<"routes">) {
  return route.status === "assigned";
}

export function canCancelRoute(route: Doc<"routes">) {
  return route.status === "proposed";
}

export function isTerminalRouteStopStatus(status: RouteStopStatus) {
  return terminalStopStatuses.has(status);
}

export function canCompleteRoute(
  route: Doc<"routes">,
  stopStatuses: readonly RouteStopStatus[],
) {
  return route.status === "active" && stopStatuses.length > 0 && stopStatuses.every(isTerminalRouteStopStatus);
}
