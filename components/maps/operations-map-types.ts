import type { FunctionReturnType } from "convex/server";

import { api } from "@/convex/_generated/api";

export type OperationsMapData = FunctionReturnType<typeof api.operationsMap.getData>;
export type MapFilter = "all" | "bins" | "reports" | "trucks" | "critical" | "route";
export type SelectedEntity =
  | { type: "bin"; id: OperationsMapData["bins"][number]["id"] }
  | { type: "report"; id: OperationsMapData["reports"][number]["id"] }
  | { type: "truck"; id: OperationsMapData["trucks"][number]["id"] }
  | { type: "routeStop"; id: NonNullable<OperationsMapData["activeRoute"]>["stops"][number]["id"] };
