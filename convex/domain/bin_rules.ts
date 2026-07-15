import type { BinStatus, Priority } from "./validators";

type BinThresholds = {
  approachingFullThreshold: number;
  collectionRequiredThreshold: number;
  criticalThreshold: number;
  emptyConfirmationThreshold: number;
};

export function calculateBinStatus(
  fillPercentage: number,
  settings: Pick<
    BinThresholds,
    | "approachingFullThreshold"
    | "collectionRequiredThreshold"
    | "criticalThreshold"
  >,
): BinStatus {
  if (fillPercentage >= settings.criticalThreshold) return "critical";
  if (fillPercentage >= settings.collectionRequiredThreshold)
    return "collection_required";
  if (fillPercentage >= settings.approachingFullThreshold)
    return "approaching_full";
  return "normal";
}

export function calculateAutomaticTaskPriority(
  status: BinStatus,
): Priority | null {
  if (status === "critical") return "critical";
  if (status === "collection_required") return "high";
  return null;
}

export function isUnusualReading(
  previous: { fillPercentage: number; recordedAt: number } | null,
  reading: { fillPercentage: number; recordedAt: number },
): boolean {
  return (
    previous !== null &&
    Math.abs(previous.fillPercentage - reading.fillPercentage) >= 30 &&
    Math.abs(previous.recordedAt - reading.recordedAt) <= 5 * 60 * 1000
  );
}

export function isCurrentReading(
  lastReadingAt: number | undefined,
  recordedAt: number,
): boolean {
  return lastReadingAt === undefined || recordedAt >= lastReadingAt;
}

export function shouldConfirmEmptying(
  awaitingEmptyConfirmation: boolean,
  fillPercentage: number,
  settings: Pick<BinThresholds, "emptyConfirmationThreshold">,
): boolean {
  return (
    awaitingEmptyConfirmation &&
    fillPercentage < settings.emptyConfirmationThreshold
  );
}
