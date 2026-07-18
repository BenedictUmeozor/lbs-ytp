import type { Doc } from "../_generated/dataModel";
import type { RouteStatus, RouteStopStatus } from "./validators";
import { hasValidRouteCoordinates } from "./route_algorithm";

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

export function isActiveRoute(route: Doc<"routes">) {
  return route.status === "active";
}

export function isUrgentReoptimisationCandidate(task: Doc<"collectionTasks">) {
  return task.priority === "critical" && task.status === "pending" && task.routeId === undefined && hasValidRouteCoordinates(task);
}

export function canReviewReoptimisation(
  route: Doc<"routes">,
  hasOperationalCurrentStop: boolean,
  stopCount: number,
  maximumStopCount: number,
) {
  return isActiveRoute(route) && hasOperationalCurrentStop && stopCount < maximumStopCount;
}

export function canConfirmReoptimisation(
  route: Doc<"routes">,
  hasOperationalCurrentStop: boolean,
  stopCount: number,
  maximumStopCount: number,
  task: Doc<"collectionTasks">,
) {
  return canReviewReoptimisation(route, hasOperationalCurrentStop, stopCount, maximumStopCount) && isUrgentReoptimisationCandidate(task);
}

export function canCompleteRoute(
  route: Doc<"routes">,
  stopStatuses: readonly RouteStopStatus[],
) {
  return isActiveRoute(route) && stopStatuses.length > 0 && stopStatuses.every(isTerminalRouteStopStatus);
}
