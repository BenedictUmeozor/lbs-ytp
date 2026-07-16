import type { Doc } from "../_generated/dataModel";
import { isCoordinateInsideBarigaPilot } from "./location_rules";
import type { ReportStatus, TaskStatus } from "./validators";

const terminalReportStatuses = new Set<ReportStatus>([
  "resolved",
  "duplicate",
  "rejected",
]);
const activeTaskStatuses = new Set<TaskStatus>([
  "pending",
  "scheduled",
  "assigned",
  "en_route",
]);

export function isTerminalReportStatus(status: ReportStatus) {
  return terminalReportStatuses.has(status);
}

export function canReceiveManagerActions(status: ReportStatus) {
  return !isTerminalReportStatus(status);
}

export function isActiveTaskStatus(status: TaskStatus) {
  return activeTaskStatuses.has(status);
}

export function reportStatusForTaskStatus(
  status: TaskStatus,
): ReportStatus | null {
  switch (status) {
    case "pending":
      return "task_created";
    case "scheduled":
    case "assigned":
      return "scheduled";
    case "en_route":
      return "in_progress";
    default:
      return null;
  }
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
