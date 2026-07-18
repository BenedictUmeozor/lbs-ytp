import { ConvexError } from "convex/values";

const simulationErrors: Record<string, string> = {
  SIMULATION_NOT_ACTIVE: "Simulation is not active.",
  SIMULATION_ALREADY_PAUSED: "Simulation is already paused.",
  SIMULATION_NOT_PAUSED: "Simulation is not paused.",
  TRUCK_ALREADY_AT_TARGET: "Truck is already at the current target.",
  CURRENT_STOP_REQUIRED: "Only the current stop can be completed.",
  TRUCK_NOT_AT_COLLECTION_POINT: "Truck has not reached the collection point.",
  ROUTE_RETURN_PENDING: "Truck is still returning to the depot.",
  SIMULATION_STATE_CHANGED: "Route simulation state changed; retry the action.",
};

export function getRouteActionError(error: unknown) {
  if (
    error instanceof ConvexError &&
    typeof error.data === "object" &&
    error.data !== null
  ) {
    if ("code" in error.data && typeof error.data.code === "string") {
      const mapped = simulationErrors[error.data.code];
      if (mapped) return mapped;
    }
    if ("message" in error.data && typeof error.data.message === "string")
      return error.data.message;
  }
  return "The route could not be updated. Please retry.";
}
