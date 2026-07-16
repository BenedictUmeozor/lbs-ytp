import type { AiStatus, LocationResolutionStatus } from "./validators";

export function hasOperationalReportLocation<
  T extends {
    latitude?: number;
    longitude?: number;
    locationResolutionStatus?: LocationResolutionStatus;
    aiStatus: AiStatus;
  },
>(report: T): report is T & { latitude: number; longitude: number } {
  return (
    report.latitude !== undefined &&
    report.longitude !== undefined &&
    (report.locationResolutionStatus === "provided_coordinates" ||
      report.locationResolutionStatus === "resolved" ||
      (report.locationResolutionStatus === undefined &&
        (report.aiStatus === "completed" || report.aiStatus === "fallback")))
  );
}

export const ACCEPTED_REPORT_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const ACCEPTED_REPORT_PHOTO_TYPE_SET = new Set<string>(
  ACCEPTED_REPORT_PHOTO_TYPES,
);

export const MAX_REPORT_PHOTO_SIZE = 5 * 1024 * 1024;

export function normalizeReportReference(reference: string): string {
  return reference.trim().toUpperCase();
}

export function getNextReportReference(references: Iterable<string>): string {
  let highest = 0;
  let foundReference = false;

  for (const reference of references) {
    const match = /^WR-(\d+)$/.exec(normalizeReportReference(reference));
    if (match === null) continue;

    const number = Number(match[1]);
    if (Number.isSafeInteger(number)) {
      foundReference = true;
      highest = Math.max(highest, number);
    }
  }

  return `WR-${String(foundReference ? highest + 1 : 1001).padStart(4, "0")}`;
}

export function isAcceptedReportPhotoType(contentType: string): boolean {
  return ACCEPTED_REPORT_PHOTO_TYPE_SET.has(contentType);
}

export function isAcceptedReportPhotoSize(size: number): boolean {
  return Number.isFinite(size) && size >= 0 && size <= MAX_REPORT_PHOTO_SIZE;
}
