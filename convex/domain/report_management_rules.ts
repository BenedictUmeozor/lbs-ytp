import type { Doc } from "../_generated/dataModel";
import { isCoordinateInsideBarigaPilot } from "./location_rules";
import {
  isActiveTaskStatus as isActiveTaskStatusFromTaskRules,
  reportStatusForTaskStatus as reportStatusForTaskStatusFromTaskRules,
} from "./task_rules";
import type { AiStatus, ReportStatus, TaskStatus } from "./validators";

const terminalReportStatuses = new Set<ReportStatus>([
  "resolved",
  "duplicate",
  "rejected",
]);

export function isTerminalReportStatus(status: ReportStatus) {
  return terminalReportStatuses.has(status);
}

export function canReceiveManagerActions(status: ReportStatus) {
  return !isTerminalReportStatus(status);
}

export function isReportProcessingActive(aiStatus: AiStatus) {
  return aiStatus === "pending" || aiStatus === "processing";
}

export function isActiveTaskStatus(status: TaskStatus) {
  return isActiveTaskStatusFromTaskRules(status);
}

export function reportStatusForTaskStatus(
  status: TaskStatus,
): ReportStatus | null {
  return reportStatusForTaskStatusFromTaskRules(status);
}

export function haversineDistanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const radians = Math.PI / 180;
  const latitudeDelta = (latitudeB - latitudeA) * radians;
  const longitudeDelta = (longitudeB - longitudeA) * radians;
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA * radians) *
      Math.cos(latitudeB * radians) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function hasValidOperationalCoordinates(
  report: Pick<Doc<"citizenReports">, "latitude" | "longitude">,
) {
  return (
    report.latitude !== undefined &&
    report.longitude !== undefined &&
    Number.isFinite(report.latitude) &&
    Number.isFinite(report.longitude) &&
    isCoordinateInsideBarigaPilot(report.latitude, report.longitude)
  );
}

export function formatReportLocationSummary(
  report: Pick<
    Doc<"citizenReports">,
    "resolvedLocationName" | "landmarkText" | "latitude" | "longitude"
  >,
) {
  if (report.resolvedLocationName?.trim()) return report.resolvedLocationName;
  if (report.landmarkText?.trim()) return report.landmarkText;
  if (hasValidOperationalCoordinates(report)) {
    return `${report.latitude!.toFixed(5)}, ${report.longitude!.toFixed(5)}`;
  }
  return "Location needs clarification";
}

export function validatedManagerNote(note: string, required: boolean) {
  const trimmed = note.trim();
  if (
    (!required && trimmed.length === 0) ||
    (trimmed.length >= 3 && trimmed.length <= 240)
  ) {
    return trimmed;
  }
  return null;
}

export function canTransitionReportManagement(
  current: ReportStatus,
  next: ReportStatus,
) {
  if (current === next) return true;
  return !isTerminalReportStatus(current);
}
