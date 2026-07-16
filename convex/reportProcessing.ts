"use node";

import { GoogleGenAI } from "@google/genai";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, type ActionCtx } from "./_generated/server";
import {
  getAcceptableNominatimResult,
  isCoordinateInsideBarigaPilot,
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
const NOMINATIM_TIMEOUT_MS = 8_000;
const GEMINI_TIMEOUT_MS = 15_000;

type ProcessingLocationResult = {
  status:
    "provided_coordinates" | "resolved" | "needs_clarification" | "failed";
  latitude?: number;
  longitude?: number;
  resolvedLocationName?: string;
};

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
      const interaction = await ai.interactions.create(
        {
          model: GEMINI_MODEL,
          input: prompt,
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: responseSchema,
          },
        },
        { timeout: GEMINI_TIMEOUT_MS },
      );
      if (
        interaction.output_text !== undefined &&
        interaction.output_text.length > 0
      ) {
        const parsed: unknown = JSON.parse(interaction.output_text);
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

async function resolveLocation(
  ctx: ActionCtx,
  report: {
    landmarkText?: string;
    latitude?: number;
    longitude?: number;
  },
  sanitizedLandmark: string | undefined,
): Promise<ProcessingLocationResult> {
  if (report.latitude !== undefined && report.longitude !== undefined) {
    if (
      Number.isFinite(report.latitude) &&
      Number.isFinite(report.longitude) &&
      report.latitude >= -90 &&
      report.latitude <= 90 &&
      report.longitude >= -180 &&
      report.longitude <= 180 &&
      isCoordinateInsideBarigaPilot(report.latitude, report.longitude)
    ) {
      return {
        status: "provided_coordinates",
        latitude: report.latitude,
        longitude: report.longitude,
      };
    }
    return { status: "needs_clarification" };
  }
  if (
    sanitizedLandmark === undefined ||
    isObviouslyVagueLandmark(sanitizedLandmark)
  ) {
    return { status: "needs_clarification" };
  }

  try {
    const normalizedQuery = normalizeLandmarkQuery(sanitizedLandmark);
    let cached = await ctx.runQuery(
      internal.reportProcessingData.getCachedGeocode,
      { normalizedQuery },
    );
    if (cached !== null) {
      await ctx.runMutation(internal.reportProcessingData.touchCachedGeocode, {
        normalizedQuery,
      });
    } else {
      const reservedAt = await ctx.runMutation(
        internal.reportProcessingData.reserveNominatimRequestSlot,
        {},
      );
      const wait = reservedAt - Date.now();
      if (wait > MAX_THROTTLE_WAIT_MS) return { status: "failed" };
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
          limit: "3",
          countrycodes: "ng",
          addressdetails: "1",
          bounded: "1",
          viewbox: "3.35,6.57,3.43,6.50",
        }).toString();
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          NOMINATIM_TIMEOUT_MS,
        );
        let response: Response;
        try {
          response = await fetch(url, {
            signal: controller.signal,
            headers: {
              "User-Agent": "BarigaSmartWasteMVP/0.1",
              Accept: "application/json",
              "Accept-Language": "en",
            },
          });
        } catch {
          return { status: "failed" };
        } finally {
          clearTimeout(timeout);
        }
        if (!response.ok) return { status: "failed" };
        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          return { status: "failed" };
        }
        if (!Array.isArray(payload)) return { status: "failed" };
        const result = payload
          .map(getAcceptableNominatimResult)
          .find((candidate) => candidate !== null);
        if (result === undefined) {
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
    return cached?.found
      ? {
          status: "resolved",
          latitude: cached.latitude,
          longitude: cached.longitude,
          resolvedLocationName: cached.displayName,
        }
      : { status: "needs_clarification" };
  } catch {
    return { status: "failed" };
  }
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
    const location = await resolveLocation(ctx, report, sanitizedLandmark);
    const locationResolved =
      location.status === "provided_coordinates" ||
      location.status === "resolved";
    const geminiResult = await getGeminiTriage({
      description: sanitizedDescription,
      category: report.category,
      landmark: sanitizedLandmark,
      hasCoordinates: location.status === "provided_coordinates",
    });
    const triage =
      geminiResult ??
      classifyReportWithRules({
        description: sanitizedDescription,
        residentCategory: report.category,
        locationResolved,
        landmark: sanitizedLandmark,
      });

    try {
      await ctx.runMutation(
        internal.reportProcessingData.applyReportProcessingResult,
        {
          reportId: args.reportId,
          attempt: report.attempt,
          locationResolutionStatus: location.status,
          latitude: location.latitude,
          longitude: location.longitude,
          resolvedLocationName: location.resolvedLocationName,
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
      await ctx.runMutation(
        internal.reportProcessingData.markReportProcessingFailed,
        {
          reportId: args.reportId,
          attempt: report.attempt,
        },
      );
    }
  },
});
