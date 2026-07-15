import type { FunctionReturnType } from "convex/server";

import type { api } from "@/convex/_generated/api";

export type OverviewData = FunctionReturnType<
  typeof api.dashboard.getOverviewData
>;
