import { type Infer, v } from "convex/values";

export const userRoleValidator = v.union(v.literal("fleet_manager"));
export type UserRole = Infer<typeof userRoleValidator>;

export const dataSourceValidator = v.union(
  v.literal("real"),
  v.literal("simulated"),
);
export type DataSource = Infer<typeof dataSourceValidator>;

export const deviceStatusValidator = v.union(
  v.literal("online"),
  v.literal("offline"),
  v.literal("inactive"),
);
export type DeviceStatus = Infer<typeof deviceStatusValidator>;

export const binStatusValidator = v.union(
  v.literal("normal"),
  v.literal("approaching_full"),
  v.literal("collection_required"),
  v.literal("critical"),
  v.literal("awaiting_confirmation"),
);
export type BinStatus = Infer<typeof binStatusValidator>;

export const reportSourceValidator = v.union(
  v.literal("web"),
  v.literal("whatsapp"),
);
export type ReportSource = Infer<typeof reportSourceValidator>;

export const reportCategoryValidator = v.union(
  v.literal("overflowing_waste"),
  v.literal("illegal_dumpsite"),
  v.literal("missed_collection"),
  v.literal("drainage_blockage"),
  v.literal("other"),
);
export type ReportCategory = Infer<typeof reportCategoryValidator>;

export const priorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);
export type Priority = Infer<typeof priorityValidator>;

export const aiStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("fallback"),
  v.literal("failed"),
);
export type AiStatus = Infer<typeof aiStatusValidator>;

export const reportStatusValidator = v.union(
  v.literal("new"),
  v.literal("needs_clarification"),
  v.literal("under_review"),
  v.literal("task_created"),
  v.literal("scheduled"),
  v.literal("in_progress"),
  v.literal("resolved"),
  v.literal("duplicate"),
  v.literal("rejected"),
);
export type ReportStatus = Infer<typeof reportStatusValidator>;

export const publicReportStatusValidator = v.union(
  v.literal("received"),
  v.literal("more_information_required"),
  v.literal("under_review"),
  v.literal("scheduled_for_collection"),
  v.literal("in_progress"),
  v.literal("resolved"),
);
export type PublicReportStatus = Infer<typeof publicReportStatusValidator>;

export const whatsappConversationStateValidator = v.union(
  v.literal("awaiting_description"),
  v.literal("awaiting_location"),
  v.literal("awaiting_optional_photo"),
  v.literal("ready_to_submit"),
  v.literal("submitted"),
  v.literal("awaiting_clarification"),
);
export type WhatsAppConversationState = Infer<
  typeof whatsappConversationStateValidator
>;

export const taskSourceTypeValidator = v.union(
  v.literal("smart_bin"),
  v.literal("citizen_report"),
  v.literal("manual"),
);
export type TaskSourceType = Infer<typeof taskSourceTypeValidator>;

export const taskStatusValidator = v.union(
  v.literal("pending"),
  v.literal("scheduled"),
  v.literal("assigned"),
  v.literal("en_route"),
  v.literal("collected"),
  v.literal("unable_to_complete"),
  v.literal("cancelled"),
);
export type TaskStatus = Infer<typeof taskStatusValidator>;

export const truckStatusValidator = v.union(
  v.literal("available"),
  v.literal("assigned"),
  v.literal("on_route"),
  v.literal("at_collection_point"),
  v.literal("returning"),
  v.literal("maintenance"),
  v.literal("offline"),
);
export type TruckStatus = Infer<typeof truckStatusValidator>;

export const maintenanceRiskValidator = v.union(
  v.literal("normal"),
  v.literal("medium"),
  v.literal("high"),
);
export type MaintenanceRisk = Infer<typeof maintenanceRiskValidator>;

export const routeStatusValidator = v.union(
  v.literal("proposed"),
  v.literal("assigned"),
  v.literal("active"),
  v.literal("completed"),
  v.literal("cancelled"),
);
export type RouteStatus = Infer<typeof routeStatusValidator>;

export const routeStopStatusValidator = v.union(
  v.literal("pending"),
  v.literal("current"),
  v.literal("completed"),
  v.literal("unable_to_complete"),
);
export type RouteStopStatus = Infer<typeof routeStopStatusValidator>;

export const notificationSeverityValidator = v.union(
  v.literal("info"),
  v.literal("warning"),
  v.literal("critical"),
);
export type NotificationSeverity = Infer<typeof notificationSeverityValidator>;

export const notificationTypeValidator = v.union(
  v.literal("bin_critical"),
  v.literal("bin_collection_required"),
  v.literal("critical_report"),
  v.literal("high_priority_report"),
  v.literal("device_offline"),
  v.literal("route_reoptimisation_suggested"),
  v.literal("maintenance_high_risk"),
  v.literal("task_unable_to_complete"),
);
export type NotificationType = Infer<typeof notificationTypeValidator>;

export const activityEventTypeValidator = v.union(
  v.literal("sensor_reading_received"),
  v.literal("bin_status_changed"),
  v.literal("task_created"),
  v.literal("task_status_changed"),
  v.literal("report_submitted"),
  v.literal("report_classified"),
  v.literal("report_status_changed"),
  v.literal("route_created"),
  v.literal("route_assigned"),
  v.literal("route_started"),
  v.literal("route_reoptimised"),
  v.literal("stop_completed"),
  v.literal("report_resolved"),
  v.literal("device_offline"),
  v.literal("device_online"),
  v.literal("maintenance_alert_created"),
  v.literal("settings_updated"),
  v.literal("manual_emptying_confirmed"),
);
export type ActivityEventType = Infer<typeof activityEventTypeValidator>;

export const relatedEntityTypeValidator = v.union(
  v.literal("device"),
  v.literal("bin"),
  v.literal("sensor_reading"),
  v.literal("citizen_report"),
  v.literal("collection_task"),
  v.literal("truck"),
  v.literal("route"),
  v.literal("route_stop"),
  v.literal("maintenance_alert"),
  v.literal("settings"),
);
export type RelatedEntityType = Infer<typeof relatedEntityTypeValidator>;

export const relatedEntityIdValidator = v.union(
  v.id("devices"),
  v.id("bins"),
  v.id("sensorReadings"),
  v.id("citizenReports"),
  v.id("collectionTasks"),
  v.id("trucks"),
  v.id("routes"),
  v.id("routeStops"),
  v.id("maintenanceAlerts"),
  v.id("settings"),
);
export type RelatedEntityId = Infer<typeof relatedEntityIdValidator>;
