"use node";

import { GoogleGenAI } from "@google/genai";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import {
  getAcceptableNominatimResult,
  isObviouslyVagueLandmark,
  normalizeLandmarkQuery,
  redactContactDetails,
} from "./domain/location_rules";
import {
  classifyReportWithRules,
  isValidGeminiTriageResult,
  trimGeminiTriageResult,
  type GeminiTriageResult,
} from "./domain/report_triage";

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const MAX_THROTTLE_WAIT_MS = 30_000;

const responseSchema = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: [
        "overflowing_waste",
        "illegal_dumpsite",
        "missed_collection",
        "drainage_blockage",
        "other",
      ],
    },
    priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
    locationText: { type: "string" },
    summary: { type: "string" },
    requiresCollection: { type: "boolean" },
    needsClarification: { type: "boolean" },
  },
  required: [
    "category",
    "priority",
    "locationText",
    "summary",
    "requiresCollection",
    "needsClarification",
  ],
  additionalProperties: false,
};

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isTemporaryGeminiError(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  const status = (error as Error & { status?: number }).status;
  return (
    status === undefined || status === 408 || status === 429 || status >= 500
  );
}

async function getGeminiTriage(input: {
  description: string;
  category: string;
  landmark?: string;
  hasCoordinates: boolean;
}): Promise<GeminiTriageResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey === undefined || apiKey.trim().length === 0) return null;
  const ai = new GoogleGenAI({ apiKey });
  const prompt = [
    "Classify this submitted waste-management report for Bariga, Lagos.",
    "Return only the requested JSON structure. Do not include reasoning, explanations, confidence scores, or invented facts.",
    "Classify only the submitted report. Illegal dumpsites may require investigation rather than automatic collection. Critical is only for immediate danger.",
    `Resident-selected category: ${input.category}`,
    `Location input: ${input.hasCoordinates ? "coordinates supplied" : input.landmark ? `landmark: ${input.landmark}` : "none"}`,
    `Description: ${input.description}`,
  ].join("\n");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const interaction = await ai.interactions.create({
        model: GEMINI_MODEL,
        input: prompt,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: responseSchema,
        },
      });
      const text = interaction.output_text;
      if (text !== undefined && text.length > 0) {
        const parsed: unknown = JSON.parse(text);
        if (isValidGeminiTriageResult(parsed))
          return trimGeminiTriageResult(parsed);
      }
    } catch (error) {
      if (!isTemporaryGeminiError(error)) return null;
    }
    if (attempt === 0) await sleep(500);
  }
  return null;
}

export const processReport = internalAction({
  args: { reportId: v.id("citizenReports") },
  handler: async (ctx, args) => {
    const report = await ctx.runMutation(
      internal.reportProcessingData.claimReportForProcessing,
      args,
    );
    if (report === null) return;

    const sanitizedDescription = redactContactDetails(report.originalMessage);
    const sanitizedLandmark =
      report.landmarkText === undefined
        ? undefined
        : redactContactDetails(report.landmarkText.trim());
    let locationResolutionStatus:
      "provided_coordinates" | "resolved" | "needs_clarification" | "failed" =
      "failed";
    let latitude = report.latitude;
    let longitude = report.longitude;
    let resolvedLocationName: string | undefined;

    try {
      if (
        latitude !== undefined &&
        longitude !== undefined &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      ) {
        locationResolutionStatus = "provided_coordinates";
      } else if (
        sanitizedLandmark === undefined ||
        isObviouslyVagueLandmark(sanitizedLandmark)
      ) {
        locationResolutionStatus = "needs_clarification";
        latitude = undefined;
        longitude = undefined;
      } else {
        const normalizedQuery = normalizeLandmarkQuery(sanitizedLandmark);
        let cached = await ctx.runQuery(
          internal.reportProcessingData.getCachedGeocode,
          { normalizedQuery },
        );
        if (cached !== null) {
          await ctx.runMutation(
            internal.reportProcessingData.touchCachedGeocode,
            { normalizedQuery },
          );
        } else {
          const reservedAt = await ctx.runMutation(
            internal.reportProcessingData.reserveNominatimRequestSlot,
            {},
          );
          const wait = reservedAt - Date.now();
          if (wait > MAX_THROTTLE_WAIT_MS) {
            locationResolutionStatus = "failed";
          } else {
            if (wait > 0) await sleep(wait);
            cached = await ctx.runQuery(
              internal.reportProcessingData.getCachedGeocode,
              { normalizedQuery },
            );
            if (cached === null) {
              const baseUrl = (
                process.env.NOMINATIM_BASE_URL ||
                "https://nominatim.openstreetmap.org"
              ).replace(/\/$/, "");
              const url = new URL(`${baseUrl}/search`);
              url.search = new URLSearchParams({
                q: `${sanitizedLandmark}, Bariga, Lagos, Nigeria`,
                format: "jsonv2",
                limit: "1",
                countrycodes: "ng",
                addressdetails: "1",
                bounded: "1",
                viewbox: "3.35,6.57,3.43,6.50",
              }).toString();
              const response = await fetch(url, {
                headers: {
                  "User-Agent": "BarigaSmartWasteMVP/0.1",
                  Accept: "application/json",
                  "Accept-Language": "en",
                },
              });
              if (response.status === 429 || response.status >= 500) {
                locationResolutionStatus = "failed";
              } else if (!response.ok) {
                locationResolutionStatus = "failed";
              } else {
                const payload: unknown = await response.json();
                if (!Array.isArray(payload)) {
                  locationResolutionStatus = "failed";
                } else if (payload.length === 0) {
                  await ctx.runMutation(
                    internal.reportProcessingData.storeGeocodingCacheResult,
                    {
                      normalizedQuery,
                      submittedQuery: sanitizedLandmark,
                      result: { found: false },
                    },
                  );
                  cached = { found: false };
                } else {
                  const result = getAcceptableNominatimResult(payload[0]);
                  if (result === null) {
                    locationResolutionStatus = "needs_clarification";
                  } else {
                    await ctx.runMutation(
                      internal.reportProcessingData.storeGeocodingCacheResult,
                      {
                        normalizedQuery,
                        submittedQuery: sanitizedLandmark,
                        result: { found: true, ...result },
                      },
                    );
                    cached = { found: true, ...result };
                  }
                }
              }
            }
          }
        }
        if (cached?.found) {
          locationResolutionStatus = "resolved";
          latitude = cached.latitude;
          longitude = cached.longitude;
          resolvedLocationName = cached.displayName;
        } else if (cached?.found === false) {
          locationResolutionStatus = "needs_clarification";
          latitude = undefined;
          longitude = undefined;
        }
      }

      const locationResolved =
        locationResolutionStatus === "provided_coordinates" ||
        locationResolutionStatus === "resolved";
      const geminiResult = await getGeminiTriage({
        description: sanitizedDescription,
        category: report.category,
        landmark: sanitizedLandmark,
        hasCoordinates: locationResolutionStatus === "provided_coordinates",
      });
      const triage =
        geminiResult ??
        classifyReportWithRules({
          description: sanitizedDescription,
          residentCategory: report.category,
          locationResolved,
          landmark: sanitizedLandmark,
        });
      await ctx.runMutation(
        internal.reportProcessingData.applyReportProcessingResult,
        {
          reportId: args.reportId,
          locationResolutionStatus,
          latitude:
            locationResolutionStatus === "provided_coordinates" ||
            locationResolutionStatus === "resolved"
              ? latitude
              : undefined,
          longitude:
            locationResolutionStatus === "provided_coordinates" ||
            locationResolutionStatus === "resolved"
              ? longitude
              : undefined,
          resolvedLocationName,
          category: triage.category,
          priority: triage.priority,
          summary: triage.summary,
          aiExtractedLocationText: triage.locationText,
          requiresCollection: triage.requiresCollection,
          aiNeedsClarification: triage.needsClarification,
          aiSource: geminiResult === null ? "fallback" : "gemini",
          aiModel: geminiResult === null ? undefined : GEMINI_MODEL,
          processedAt: Date.now(),
        },
      );
    } catch {
      try {
        const fallback = classifyReportWithRules({
          description: sanitizedDescription,
          residentCategory: report.category,
          locationResolved: false,
          landmark: sanitizedLandmark,
        });
        await ctx.runMutation(
          internal.reportProcessingData.applyReportProcessingResult,
          {
            reportId: args.reportId,
            locationResolutionStatus: "failed",
            category: fallback.category,
            priority: fallback.priority,
            summary: fallback.summary,
            aiExtractedLocationText: fallback.locationText,
            requiresCollection: fallback.requiresCollection,
            aiNeedsClarification: true,
            aiSource: "fallback",
            processedAt: Date.now(),
          },
        );
      } catch {
        await ctx.runMutation(
          internal.reportProcessingData.markReportProcessingFailed,
          args,
        );
      }
    }
  },
});
