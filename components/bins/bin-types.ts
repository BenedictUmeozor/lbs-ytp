import type { FunctionReturnType } from "convex/server";

import type { api } from "@/convex/_generated/api";

export type BinList = FunctionReturnType<typeof api.bins.list>;
export type BinRow = BinList[number];
export type BinDetail = Exclude<
  FunctionReturnType<typeof api.bins.getDetail>,
  null
>;
export type BinFilter =
  | "all"
  | "normal"
  | "approaching_full"
  | "collection_required"
  | "critical"
  | "offline"
  | "real"
  | "simulated";
