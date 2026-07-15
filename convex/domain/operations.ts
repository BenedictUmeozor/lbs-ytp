import type { TruckStatus } from "./validators";

export const ACTIVE_OPERATIONAL_TRUCK_STATUSES: readonly TruckStatus[] = [
  "assigned",
  "on_route",
  "at_collection_point",
  "returning",
];
