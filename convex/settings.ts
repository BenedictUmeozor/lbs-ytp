import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";
import { insertActivityEvent } from "./domain/write_helpers";

const settingsFields = {
  approachingFullThreshold: v.optional(v.number()),
  collectionRequiredThreshold: v.optional(v.number()),
  criticalThreshold: v.optional(v.number()),
  emptyConfirmationThreshold: v.optional(v.number()),
  deviceOfflineTimeoutMinutes: v.optional(v.number()),
  duplicateDistanceThresholdMeters: v.optional(v.number()),
  maximumRouteStops: v.optional(v.number()),
  depotLatitude: v.optional(v.number()),
  depotLongitude: v.optional(v.number()),
  simulationStepIntervalSeconds: v.optional(v.number()),
  hardwareDemoIntervalSeconds: v.optional(v.number()),
  trafficPenaltyMinutes: v.optional(v.number()),
  roadConditionPenaltyMinutes: v.optional(v.number()),
};

const settingsUpdateReturn = v.object({
  changed: v.boolean(),
  settingsId: v.id("settings"),
  changedFields: v.array(v.string()),
});

function requireIntegerInRange(name: string, value: number, minimum: number, maximum: number) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
}

type SettingsValues = { [Field in keyof typeof settingsFields]-?: number };

function validateSettings(settings: SettingsValues) {
  for (const [name, value] of Object.entries(settings)) {
    if (!Number.isFinite(value)) throw new Error(`${name} must be a finite number.`);
  }

  const { emptyConfirmationThreshold, approachingFullThreshold, collectionRequiredThreshold, criticalThreshold } = settings;
  for (const [name, value] of Object.entries({ emptyConfirmationThreshold, approachingFullThreshold, collectionRequiredThreshold, criticalThreshold })) {
    if (!Number.isInteger(value)) throw new Error(`${name} must be an integer.`);
  }
  if (!(0 <= emptyConfirmationThreshold && emptyConfirmationThreshold < approachingFullThreshold && approachingFullThreshold < collectionRequiredThreshold && collectionRequiredThreshold < criticalThreshold && criticalThreshold <= 100)) {
    throw new Error("Thresholds must satisfy 0 <= empty < approaching < collection required < critical <= 100.");
  }

  requireIntegerInRange("deviceOfflineTimeoutMinutes", settings.deviceOfflineTimeoutMinutes, 1, 60);
  requireIntegerInRange("duplicateDistanceThresholdMeters", settings.duplicateDistanceThresholdMeters, 1, 5000);
  requireIntegerInRange("maximumRouteStops", settings.maximumRouteStops, 1, 8);
  if (settings.depotLatitude < -90 || settings.depotLatitude > 90) throw new Error("depotLatitude must be between -90 and 90.");
  if (settings.depotLongitude < -180 || settings.depotLongitude > 180) throw new Error("depotLongitude must be between -180 and 180.");
  requireIntegerInRange("simulationStepIntervalSeconds", settings.simulationStepIntervalSeconds, 1, 60);
  requireIntegerInRange("hardwareDemoIntervalSeconds", settings.hardwareDemoIntervalSeconds, 1, 300);
  requireIntegerInRange("trafficPenaltyMinutes", settings.trafficPenaltyMinutes, 0, 120);
  requireIntegerInRange("roadConditionPenaltyMinutes", settings.roadConditionPenaltyMinutes, 0, 120);
}

export const getCurrent = internalQuery({
  args: {},
  handler: (ctx) => ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "global")).unique(),
});

export const update = internalMutation({
  args: settingsFields,
  returns: settingsUpdateReturn,
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "global")).unique();
    if (settings === null) throw new Error("Global settings record does not exist.");

    const suppliedEntries = Object.entries(args).filter((entry): entry is [string, number] => entry[1] !== undefined);
    if (suppliedEntries.length === 0) throw new Error("At least one settings field is required.");

    const merged: SettingsValues = {
      approachingFullThreshold: args.approachingFullThreshold ?? settings.approachingFullThreshold,
      collectionRequiredThreshold: args.collectionRequiredThreshold ?? settings.collectionRequiredThreshold,
      criticalThreshold: args.criticalThreshold ?? settings.criticalThreshold,
      emptyConfirmationThreshold: args.emptyConfirmationThreshold ?? settings.emptyConfirmationThreshold,
      deviceOfflineTimeoutMinutes: args.deviceOfflineTimeoutMinutes ?? settings.deviceOfflineTimeoutMinutes,
      duplicateDistanceThresholdMeters: args.duplicateDistanceThresholdMeters ?? settings.duplicateDistanceThresholdMeters,
      maximumRouteStops: args.maximumRouteStops ?? settings.maximumRouteStops,
      depotLatitude: args.depotLatitude ?? settings.depotLatitude,
      depotLongitude: args.depotLongitude ?? settings.depotLongitude,
      simulationStepIntervalSeconds: args.simulationStepIntervalSeconds ?? settings.simulationStepIntervalSeconds,
      hardwareDemoIntervalSeconds: args.hardwareDemoIntervalSeconds ?? settings.hardwareDemoIntervalSeconds,
      trafficPenaltyMinutes: args.trafficPenaltyMinutes ?? settings.trafficPenaltyMinutes,
      roadConditionPenaltyMinutes: args.roadConditionPenaltyMinutes ?? settings.roadConditionPenaltyMinutes,
    };
    validateSettings(merged);
    const changedFields = suppliedEntries.filter(([name, value]) => settings[name as keyof typeof settings] !== value).map(([name]) => name);
    if (changedFields.length === 0) return { changed: false, settingsId: settings._id, changedFields };

    await ctx.db.patch(settings._id, Object.fromEntries(changedFields.map((name) => [name, merged[name]])));
    await insertActivityEvent(ctx, "settings_updated", `Settings updated: ${changedFields.join(", ")}.`, "settings", settings._id);
    return { changed: true, settingsId: settings._id, changedFields };
  },
});
