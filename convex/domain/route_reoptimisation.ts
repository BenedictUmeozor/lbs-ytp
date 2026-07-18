import type { Doc, Id } from "../_generated/dataModel";
import {
  DEMO_AVERAGE_SPEED_KM_PER_HOUR,
  hasValidRouteCoordinates,
  orderRouteTasks,
  type RouteCoordinate,
  type RouteTask,
} from "./route_algorithm";
import { haversineDistanceMeters } from "./report_management_rules";
import { isTerminalRouteStopStatus } from "./route_rules";

export const ROUTE_REVIEW_RADIUS_METERS = 1_000;

type StopWithTask = { stop: Doc<"routeStops">; task: Doc<"collectionTasks"> };

export type ReoptimisationStateSnapshotEntry = {
  stopId: Id<"routeStops">;
  stopStatus: Doc<"routeStops">["status"];
  taskId: Id<"collectionTasks">;
  taskStatus: Doc<"collectionTasks">["status"];
  taskPriority: Doc<"collectionTasks">["priority"];
};

export type StopSplit = {
  operationalCurrentIndex: number;
  terminal: StopWithTask[];
  operationalCurrent: StopWithTask | null;
  futurePending: StopWithTask[];
};

export type RemainingMetrics = {
  remainingDistanceKm: number;
  baseTravelMinutes: number;
  remainingTrafficPenaltyMinutes: number;
  remainingRoadConditionPenaltyMinutes: number;
  remainingEstimatedDurationMinutes: number;
};

export function routeTask(task: Doc<"collectionTasks">): RouteTask {
  return {
    id: task._id,
    displayId: task.displayId,
    latitude: task.latitude,
    longitude: task.longitude,
    priority: task.priority,
  };
}

export function buildReoptimisationStateSnapshot(
  stops: readonly StopWithTask[],
): ReoptimisationStateSnapshotEntry[] {
  return stops.map(({ stop, task }) => ({
    stopId: stop._id,
    stopStatus: stop.status,
    taskId: task._id,
    taskStatus: task.status,
    taskPriority: task.priority,
  }));
}

export function reoptimisationSnapshotsMatch(
  left: readonly ReoptimisationStateSnapshotEntry[],
  right: readonly ReoptimisationStateSnapshotEntry[],
) {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return entry.stopId === other.stopId &&
      entry.stopStatus === other.stopStatus &&
      entry.taskId === other.taskId &&
      entry.taskStatus === other.taskStatus &&
      entry.taskPriority === other.taskPriority;
  });
}

export function operationalCurrentStopIndex(stops: readonly StopWithTask[]) {
  const markedCurrent = stops.findIndex(({ stop }) => stop.status === "current");
  if (markedCurrent >= 0) return markedCurrent;
  return stops.findIndex(({ stop }) => !isTerminalRouteStopStatus(stop.status));
}

export function nextOperationalStopIndex(
  stops: readonly StopWithTask[],
  currentIndex = operationalCurrentStopIndex(stops),
) {
  if (currentIndex < 0) return -1;
  return stops.findIndex(
    ({ stop }, index) => index > currentIndex && !isTerminalRouteStopStatus(stop.status),
  );
}

export function splitRouteStops(stops: readonly StopWithTask[]): StopSplit {
  const operationalCurrentIndex = operationalCurrentStopIndex(stops);
  return {
    operationalCurrentIndex,
    terminal: stops.filter(({ stop }) => isTerminalRouteStopStatus(stop.status)),
    operationalCurrent:
      operationalCurrentIndex < 0 ? null : stops[operationalCurrentIndex],
    futurePending:
      operationalCurrentIndex < 0
        ? []
        : stops.slice(operationalCurrentIndex + 1).filter(({ stop }) => stop.status === "pending"),
  };
}

export function remainingRoutePointDistanceMeters(
  candidate: RouteCoordinate,
  truck: RouteCoordinate,
  current: StopWithTask,
  stops: readonly StopWithTask[],
) {
  const points = [
    truck,
    { latitude: current.task.latitude, longitude: current.task.longitude },
    ...stops
      .filter(({ stop }) => !isTerminalRouteStopStatus(stop.status))
      .map(({ task }) => ({ latitude: task.latitude, longitude: task.longitude })),
  ];
  return Math.min(
    ...points.map((point) =>
      haversineDistanceMeters(
        candidate.latitude,
        candidate.longitude,
        point.latitude,
        point.longitude,
      ),
    ),
  );
}

export function isNearRemainingRoute(distanceMeters: number) {
  return distanceMeters <= ROUTE_REVIEW_RADIUS_METERS;
}

export function orderFutureRouteTasks(
  current: RouteCoordinate,
  tasks: readonly RouteTask[],
) {
  return orderRouteTasks(current, tasks);
}

export function proposedOrderedTaskIds(
  stops: readonly StopWithTask[],
  candidate: Doc<"collectionTasks">,
) {
  const split = splitRouteStops(stops);
  if (split.operationalCurrent === null) return null;
  const orderedFuture = orderFutureRouteTasks(
    split.operationalCurrent.task,
    [...split.futurePending.map(({ task }) => routeTask(task)), routeTask(candidate)],
  );
  const pendingIds = orderedFuture.map((task) => task.id);
  let pendingIndex = 0;
  const ordered = stops.map(({ stop, task }, index) => {
    if (index <= split.operationalCurrentIndex || stop.status !== "pending") return task._id;
    return pendingIds[pendingIndex++];
  });
  return [...ordered, ...pendingIds.slice(pendingIndex)];
}

export function calculateRemainingRouteMetrics(
  truck: RouteCoordinate,
  current: StopWithTask,
  remainingPending: readonly RouteTask[],
  totalStopCount: number,
  nonTerminalStopCount: number,
  trafficPenaltyMinutes: number,
  roadConditionPenaltyMinutes: number,
): RemainingMetrics {
  const points = [routeTask(current.task), ...remainingPending];
  let distanceMeters = 0;
  let previous: RouteCoordinate = truck;
  for (const point of points) {
    distanceMeters += haversineDistanceMeters(
      previous.latitude,
      previous.longitude,
      point.latitude,
      point.longitude,
    );
    previous = point;
  }
  const remainingDistanceKm = distanceMeters / 1_000;
  const ratio = totalStopCount === 0 ? 0 : nonTerminalStopCount / totalStopCount;
  const remainingTrafficPenaltyMinutes = Math.round(trafficPenaltyMinutes * ratio);
  const remainingRoadConditionPenaltyMinutes = Math.round(roadConditionPenaltyMinutes * ratio);
  const baseTravelMinutes = (remainingDistanceKm / DEMO_AVERAGE_SPEED_KM_PER_HOUR) * 60;
  return {
    remainingDistanceKm,
    baseTravelMinutes,
    remainingTrafficPenaltyMinutes,
    remainingRoadConditionPenaltyMinutes,
    remainingEstimatedDurationMinutes: Math.ceil(
      baseTravelMinutes + remainingTrafficPenaltyMinutes + remainingRoadConditionPenaltyMinutes,
    ),
  };
}

export function changedStopIds(
  current: readonly Id<"collectionTasks">[],
  proposed: readonly Id<"collectionTasks">[],
) {
  const changed = new Set<Id<"collectionTasks">>();
  const currentPositions = new Map(current.map((id, index) => [id, index]));
  proposed.forEach((id, index) => {
    if (currentPositions.get(id) !== index) changed.add(id);
  });
  return [...changed];
}

export function validUrgentTask(task: Doc<"collectionTasks">) {
  return task.priority === "critical" && task.status === "pending" && task.routeId === undefined && hasValidRouteCoordinates(task);
}
