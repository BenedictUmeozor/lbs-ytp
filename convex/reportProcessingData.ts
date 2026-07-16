import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";
import {
  locationResolutionStatusValidator,
  priorityValidator,
  reportCategoryValidator,
} from "./domain/validators";
import { insertActivityEvent } from "./domain/write_helpers";

const cacheResultValidator = v.union(
  v.object({
    found: v.literal(true),
    latitude: v.number(),
    longitude: v.number(),
    displayName: v.optional(v.string()),
  }),
  v.object({ found: v.literal(false) }),
);

export const claimReportForProcessing = internalMutation({
  args: { reportId: v.id("citizenReports") },
  returns: v.union(
    v.object({
      originalMessage: v.string(),
      category: reportCategoryValidator,
      landmarkText: v.optional(v.string()),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (
      report === null ||
      report.category === undefined ||
      report.aiStatus === "completed" ||
      report.aiStatus === "fallback" ||
      (report.aiStatus === "processing" &&
        (report.aiProcessingStartedAt === undefined ||
          report.aiProcessingStartedAt > Date.now() - 5 * 60 * 1000))
    ) {
      return null;
    }

    await ctx.db.patch(args.reportId, {
      aiStatus: "processing",
      aiProcessingStartedAt: Date.now(),
      locationResolutionStatus: report.locationResolutionStatus ?? "pending",
    });
    return {
      originalMessage: report.originalMessage,
      category: report.category,
      landmarkText: report.landmarkText,
      latitude: report.latitude,
      longitude: report.longitude,
    };
  },
});

export const getCachedGeocode = internalQuery({
  args: { normalizedQuery: v.string() },
  returns: v.union(cacheResultValidator, v.null()),
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("geocodingCache")
      .withIndex("by_normalizedQuery", (query) =>
        query.eq("normalizedQuery", args.normalizedQuery),
      )
      .unique();
    if (cached === null) return null;
    return cached.found
      ? {
          found: true as const,
          latitude: cached.latitude!,
          longitude: cached.longitude!,
          displayName: cached.displayName,
        }
      : { found: false as const };
  },
});

export const touchCachedGeocode = internalMutation({
  args: { normalizedQuery: v.string() },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("geocodingCache")
      .withIndex("by_normalizedQuery", (query) =>
        query.eq("normalizedQuery", args.normalizedQuery),
      )
      .unique();
    if (cached !== null)
      await ctx.db.patch(cached._id, { lastUsedAt: Date.now() });
  },
});

export const reserveNominatimRequestSlot = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const throttle = await ctx.db
      .query("externalServiceThrottles")
      .withIndex("by_service", (query) => query.eq("service", "nominatim"))
      .unique();
    const reservedAt = Math.max(now, throttle?.nextAllowedAt ?? now);
    if (throttle === null) {
      await ctx.db.insert("externalServiceThrottles", {
        service: "nominatim",
        nextAllowedAt: reservedAt + 1100,
      });
    } else {
      await ctx.db.patch(throttle._id, { nextAllowedAt: reservedAt + 1100 });
    }
    return reservedAt;
  },
});

export const storeGeocodingCacheResult = internalMutation({
  args: {
    normalizedQuery: v.string(),
    submittedQuery: v.string(),
    result: cacheResultValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("geocodingCache")
      .withIndex("by_normalizedQuery", (query) =>
        query.eq("normalizedQuery", args.normalizedQuery),
      )
      .unique();
    if (existing !== null) return;
    const now = Date.now();
    await ctx.db.insert("geocodingCache", {
      normalizedQuery: args.normalizedQuery,
      submittedQuery: args.submittedQuery,
      found: args.result.found,
      latitude: args.result.found ? args.result.latitude : undefined,
      longitude: args.result.found ? args.result.longitude : undefined,
      displayName: args.result.found ? args.result.displayName : undefined,
      createdAt: now,
      lastUsedAt: now,
    });
  },
});

export const applyReportProcessingResult = internalMutation({
  args: {
    reportId: v.id("citizenReports"),
    locationResolutionStatus: locationResolutionStatusValidator,
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    resolvedLocationName: v.optional(v.string()),
    category: reportCategoryValidator,
    priority: priorityValidator,
    summary: v.string(),
    aiExtractedLocationText: v.string(),
    requiresCollection: v.boolean(),
    aiNeedsClarification: v.boolean(),
    aiSource: v.union(v.literal("gemini"), v.literal("fallback")),
    aiModel: v.optional(v.string()),
    processedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (report === null) return;
    const needsClarification =
      args.locationResolutionStatus === "needs_clarification" ||
      args.locationResolutionStatus === "failed" ||
      args.aiNeedsClarification;
    const nextStatus = needsClarification
      ? "needs_clarification"
      : "under_review";
    await ctx.db.patch(args.reportId, {
      locationResolutionStatus: args.locationResolutionStatus,
      latitude: args.latitude,
      longitude: args.longitude,
      resolvedLocationName: args.resolvedLocationName,
      category: args.category,
      priority: args.priority,
      summary: args.summary,
      aiExtractedLocationText: args.aiExtractedLocationText,
      requiresCollection: args.requiresCollection,
      needsClarification,
      aiStatus: args.aiSource === "gemini" ? "completed" : "fallback",
      aiProcessedAt: args.processedAt,
      aiProcessingStartedAt: undefined,
      aiModel: args.aiSource === "gemini" ? args.aiModel : undefined,
      status: nextStatus,
      statusUpdatedAt:
        report.status === nextStatus
          ? report.statusUpdatedAt
          : args.processedAt,
    });
    await insertActivityEvent(
      ctx,
      "report_classified",
      `Report classified using ${args.aiSource === "gemini" ? "Gemini" : "rules fallback"}.`,
      "citizen_report",
      args.reportId,
    );
    if (report.status !== nextStatus) {
      await insertActivityEvent(
        ctx,
        "report_status_changed",
        `Report status changed from ${report.status} to ${nextStatus}.`,
        "citizen_report",
        args.reportId,
        undefined,
        report.status,
        nextStatus,
      );
    }
  },
});

export const markReportProcessingFailed = internalMutation({
  args: { reportId: v.id("citizenReports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (report !== null) {
      await ctx.db.patch(args.reportId, {
        aiStatus: "failed",
        aiProcessedAt: Date.now(),
        aiProcessingStartedAt: undefined,
      });
    }
  },
});
