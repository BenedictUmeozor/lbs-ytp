import { v } from "convex/values";

import { internalQuery, query } from "./_generated/server";
import { getPublicReportStatus } from "./domain/status_rules";
import { publicReportStatusValidator, reportCategoryValidator } from "./domain/validators";

export const list = internalQuery({
  args: {},
  handler: (ctx) => ctx.db.query("citizenReports").order("desc").collect(),
});

export const getById = internalQuery({
  args: { reportId: v.id("citizenReports") },
  handler: (ctx, args) => ctx.db.get(args.reportId),
});

const publicReportValidator = v.union(
  v.object({
    referenceNumber: v.string(),
    category: v.optional(reportCategoryValidator),
    locationSummary: v.string(),
    publicStatus: publicReportStatusValidator,
    submittedAt: v.number(),
    lastStatusUpdate: v.number(),
    resolvedAt: v.optional(v.number()),
  }),
  v.null(),
);

export const getPublicByReference = query({
  args: { referenceNumber: v.string() },
  returns: publicReportValidator,
  handler: async (ctx, args) => {
    const referenceNumber = args.referenceNumber.trim().toUpperCase();
    if (referenceNumber.length === 0) throw new Error("referenceNumber must not be empty.");
    const report = await ctx.db.query("citizenReports").withIndex("by_referenceNumber", (q) => q.eq("referenceNumber", referenceNumber)).unique();
    if (report === null) return null;
    return {
      referenceNumber: report.referenceNumber,
      category: report.category,
      locationSummary: report.landmarkText ?? (report.latitude !== undefined && report.longitude !== undefined ? "Location shared by resident" : "Location unavailable"),
      publicStatus: getPublicReportStatus(report.status),
      submittedAt: report._creationTime,
      lastStatusUpdate: report.statusUpdatedAt,
      resolvedAt: report.resolvedAt,
    };
  },
});
