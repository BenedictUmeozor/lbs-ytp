# D-03 — Device-Offline Evaluation

**Status:** Approved

Real smart-bin devices are evaluated by a Convex cron once per minute. The cron reads `deviceOfflineTimeoutMinutes` from global settings (five minutes by default), persists an online-to-offline transition only for real devices, and records the transition once. Inactive and simulated devices are not changed. A later valid reading restores an offline real device to online.
