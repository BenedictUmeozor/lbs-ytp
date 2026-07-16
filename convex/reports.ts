import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { internalQuery, mutation, query } from "./_generated/server";
import {
  getNextReportReference,
  isAcceptedReportPhotoSize,
  isAcceptedReportPhotoType,
  normalizeReportReference,
} from "./domain/report_rules";
import { getPublicReportStatus } from "./domain/status_rules";
import {
  publicReportStatusValidator,
  reportCategoryValidator,
} from "./domain/validators";
import { insertActivityEvent } from "./domain/write_helpers";

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
    const referenceNumber = normalizeReportReference(args.referenceNumber);
    if (referenceNumber.length === 0) return null;

    const report = await ctx.db
      .query("citizenReports")
      .withIndex("by_referenceNumber", (q) =>
        q.eq("referenceNumber", referenceNumber),
      )
      .unique();
    if (report === null) return null;

    return {
      referenceNumber: report.referenceNumber,
      category: report.category,
      locationSummary:
        report.latitude !== undefined && report.longitude !== undefined
          ? "Location shared by resident"
          : report.landmarkText !== undefined
            ? "Landmark provided by resident"
            : "Location unavailable",
      publicStatus: getPublicReportStatus(report.status),
      submittedAt: report._creationTime,
      lastStatusUpdate: report.statusUpdatedAt,
      resolvedAt: report.resolvedAt,
    };
  },
});

export const generatePhotoUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: (ctx) => ctx.storage.generateUploadUrl(),
});

type ReportSubmissionErrorData = {
  code:
    | "INVALID_DESCRIPTION"
    | "INVALID_LOCATION"
    | "INVALID_LANDMARK"
    | "INVALID_PHOTO"
    | "SUBMISSION_FAILED";
  field?: "description" | "location" | "landmark" | "photo";
  message: string;
};

function throwReportSubmissionError(data: ReportSubmissionErrorData): never {
  throw new ConvexError(data);
}

const submissionValidator = v.object({
  referenceNumber: v.string(),
  submittedAt: v.number(),
  publicStatus: v.literal("received"),
});

export const submitWebReport = mutation({
  args: {
    category: reportCategoryValidator,
    description: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    landmarkText: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
  },
  returns: submissionValidator,
  handler: async (ctx, args) => {
    const originalMessage = args.description.trim();
    if (originalMessage.length === 0 || originalMessage.length > 1000) {
      throwReportSubmissionError({
        code: "INVALID_DESCRIPTION",
        field: "description",
        message: "Description must be between 1 and 1,000 characters.",
      });
    }

    const hasLatitude = args.latitude !== undefined;
    const hasLongitude = args.longitude !== undefined;
    const landmarkText = args.landmarkText?.trim();
    const hasLandmark = landmarkText !== undefined && landmarkText.length > 0;

    if (hasLatitude !== hasLongitude || (hasLatitude && hasLandmark)) {
      throwReportSubmissionError({
        code: "INVALID_LOCATION",
        field: "location",
        message: "Choose either your current location or a nearby landmark.",
      });
    }

    const hasCoordinates = hasLatitude && hasLongitude;
    const latitude = args.latitude;
    const longitude = args.longitude;
    if (hasCoordinates) {
      if (
        latitude === undefined ||
        longitude === undefined ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        throwReportSubmissionError({
          code: "INVALID_LOCATION",
          field: "location",
          message: "Location coordinates are invalid.",
        });
      }
    } else if (!hasLandmark) {
      throwReportSubmissionError({
        code: "INVALID_LOCATION",
        field: "location",
        message: "Share your current location or enter a nearby landmark.",
      });
    } else if (landmarkText.length < 3 || landmarkText.length > 200) {
      throwReportSubmissionError({
        code: "INVALID_LANDMARK",
        field: "landmark",
        message: "Enter a nearby landmark between 3 and 200 characters.",
      });
    }

    if (args.photoStorageId !== undefined) {
      const metadata = await ctx.db.system.get("_storage", args.photoStorageId);
      if (
        metadata === null ||
        metadata.contentType === undefined ||
        !isAcceptedReportPhotoType(metadata.contentType) ||
        !isAcceptedReportPhotoSize(metadata.size)
      ) {
        throwReportSubmissionError({
          code: "INVALID_PHOTO",
          field: "photo",
          message:
            "The uploaded photo must be a JPEG, PNG or WebP image no larger than 5 MiB.",
        });
      }
    }

    const references: string[] = [];
    for await (const report of ctx.db.query("citizenReports")) {
      references.push(report.referenceNumber);
    }
    const referenceNumber = getNextReportReference(references);
    const submittedAt = Date.now();
    const reportId = await ctx.db.insert("citizenReports", {
      referenceNumber,
      source: "web",
      originalMessage,
      category: args.category,
      landmarkText: hasCoordinates ? undefined : landmarkText,
      latitude: hasCoordinates ? latitude : undefined,
      longitude: hasCoordinates ? longitude : undefined,
      photoStorageId: args.photoStorageId,
      aiStatus: "pending",
      status: "new",
      statusUpdatedAt: submittedAt,
      duplicateCandidateReportIds: [],
    });

    await insertActivityEvent(
      ctx,
      "report_submitted",
      `Public report ${referenceNumber} submitted.`,
      "citizen_report",
      reportId,
    );
    await ctx.scheduler.runAfter(0, internal.reportProcessing.processReport, {
      reportId,
    });

    return {
      referenceNumber,
      submittedAt,
      publicStatus: "received" as const,
    };
  },
});
