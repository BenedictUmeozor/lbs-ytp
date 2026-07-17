import type { Id } from "../_generated/dataModel";
import { haversineDistanceMeters } from "./report_management_rules";
import type { Priority } from "./validators";

export type RouteTaskId = Id<"collectionTasks">;

export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type RouteTask = RouteCoordinate & {
  id: RouteTaskId;
  displayId: string;
  priority: Priority;
};

export type RouteMetrics = {
  totalDistanceKm: number;
  baseTravelMinutes: number;
  trafficPenaltyMinutes: number;
  roadConditionPenaltyMinutes: number;
  estimatedDurationMinutes: number;
};

export const DEMO_AVERAGE_SPEED_KM_PER_HOUR = 20;

const PRIORITIES: readonly Priority[] = [
  "critical",
  "high",
  "medium",
  "low",
];

export function hasValidRouteCoordinates(
  coordinate: RouteCoordinate,
): boolean {
  return (
    Number.isFinite(coordinate.latitude) &&
    coordinate.latitude >= -90 &&
    coordinate.latitude <= 90 &&
    Number.isFinite(coordinate.longitude) &&
    coordinate.longitude >= -180 &&
    coordinate.longitude <= 180
  );
}

export function orderTasksByNearestNeighbour(
  startingCoordinate: RouteCoordinate,
  tasks: readonly RouteTask[],
): RouteTask[] {
  const remaining = [...tasks];
  const ordered: RouteTask[] = [];
  let currentCoordinate = startingCoordinate;

  while (remaining.length > 0) {
    const nextIndex = remaining.reduce((bestIndex, task, index) => {
      if (bestIndex === -1) return index;
      const bestTask = remaining[bestIndex];
      const taskDistance = haversineDistanceMeters(
        currentCoordinate.latitude,
        currentCoordinate.longitude,
        task.latitude,
        task.longitude,
      );
      const bestDistance = haversineDistanceMeters(
        currentCoordinate.latitude,
        currentCoordinate.longitude,
        bestTask.latitude,
        bestTask.longitude,
      );
      return (
        taskDistance < bestDistance ||
        (taskDistance === bestDistance && task.displayId < bestTask.displayId)
      )
        ? index
        : bestIndex;
    }, -1);
    const [nextTask] = remaining.splice(nextIndex, 1);
    ordered.push(nextTask);
    currentCoordinate = nextTask;
  }

  return ordered;
}

export function orderRouteTasks(
  depot: RouteCoordinate,
  tasks: readonly RouteTask[],
): RouteTask[] {
  let currentCoordinate = depot;
  const ordered: RouteTask[] = [];

  for (const priority of PRIORITIES) {
    const group = tasks.filter((task) => task.priority === priority);
    const groupOrder = orderTasksByNearestNeighbour(currentCoordinate, group);
    ordered.push(...groupOrder);
    const finalTask = groupOrder.at(-1);
    if (finalTask !== undefined) currentCoordinate = finalTask;
  }

  return ordered;
}

export function calculateRouteMetrics(
  depot: RouteCoordinate,
  orderedTasks: readonly RouteTask[],
  trafficPenaltyMinutes: number,
  roadConditionPenaltyMinutes: number,
): RouteMetrics {
  let totalDistanceMeters = 0;
  let currentCoordinate = depot;

  for (const task of orderedTasks) {
    totalDistanceMeters += haversineDistanceMeters(
      currentCoordinate.latitude,
      currentCoordinate.longitude,
      task.latitude,
      task.longitude,
    );
    currentCoordinate = task;
  }

  const totalDistanceKm = totalDistanceMeters / 1_000;
  const baseTravelMinutes =
    (totalDistanceKm / DEMO_AVERAGE_SPEED_KM_PER_HOUR) * 60;
  return {
    totalDistanceKm,
    baseTravelMinutes,
    trafficPenaltyMinutes,
    roadConditionPenaltyMinutes,
    estimatedDurationMinutes: Math.ceil(
      baseTravelMinutes + trafficPenaltyMinutes + roadConditionPenaltyMinutes,
    ),
  };
}
