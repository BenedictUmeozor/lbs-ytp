import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval(
  "evaluate real smart-bin devices for offline status",
  { minutes: 1 },
  internal.hardware.evaluateOfflineDevices,
  {},
);

export default crons;
