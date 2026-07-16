import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  activityEventTypeValidator,
  aiStatusValidator,
  binStatusValidator,
  dataSourceValidator,
  deviceStatusValidator,
  maintenanceRiskValidator,
  notificationSeverityValidator,
  notificationTypeValidator,
  priorityValidator,
  relatedEntityIdValidator,
  relatedEntityTypeValidator,
  reportCategoryValidator,
  reportSourceValidator,
  reportStatusValidator,
  routeStatusValidator,
  routeStopStatusValidator,
  taskSourceTypeValidator,
  taskStatusValidator,
  truckStatusValidator,
  userRoleValidator,
  whatsappConversationStateValidator,
} from "./domain/validators";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: userRoleValidator,
  }).index("by_email", ["email"]),

  devices: defineTable({
    deviceIdentifier: v.string(),
    assignedBinId: v.optional(v.id("bins")),
    status: deviceStatusValidator,
    lastSeenAt: v.optional(v.number()),
    source: dataSourceValidator,
  })
    .index("by_deviceIdentifier", ["deviceIdentifier"])
    .index("by_assignedBinId", ["assignedBinId"])
    .index("by_status", ["status"])
    .index("by_source", ["source"]),

  bins: defineTable({
    displayId: v.string(),
    name: v.string(),
    address: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    currentFillPercentage: v.number(),
    status: binStatusValidator,
    lastReadingAt: v.optional(v.number()),
    lastCollectionAt: v.optional(v.number()),
    deviceId: v.optional(v.id("devices")),
    source: dataSourceValidator,
    awaitingEmptyConfirmation: v.boolean(),
  })
    .index("by_displayId", ["displayId"])
    .index("by_status", ["status"])
    .index("by_deviceId", ["deviceId"])
    .index("by_source", ["source"]),

  sensorReadings: defineTable({
    deviceId: v.id("devices"),
    binId: v.id("bins"),
    fillPercentage: v.number(),
    recordedAt: v.number(),
    receivedAt: v.number(),
    unusualReading: v.boolean(),
  })
    .index("by_binId_and_recordedAt", ["binId", "recordedAt"])
    .index("by_deviceId_and_recordedAt", ["deviceId", "recordedAt"]),

  citizenReports: defineTable({
    referenceNumber: v.string(),
    source: reportSourceValidator,
    originalMessage: v.string(),
    category: v.optional(reportCategoryValidator),
    priority: v.optional(priorityValidator),
    summary: v.optional(v.string()),
    landmarkText: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    photoStorageId: v.optional(v.id("_storage")),
    requiresCollection: v.optional(v.boolean()),
    needsClarification: v.optional(v.boolean()),
    aiStatus: aiStatusValidator,
    status: reportStatusValidator,
    statusUpdatedAt: v.number(),
    linkedTaskId: v.optional(v.id("collectionTasks")),
    linkedBinId: v.optional(v.id("bins")),
    duplicateCandidateReportIds: v.array(v.id("citizenReports")),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_referenceNumber", ["referenceNumber"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_source", ["source"])
    .index("by_linkedTaskId", ["linkedTaskId"])
    .index("by_linkedBinId", ["linkedBinId"]),

  whatsappConversations: defineTable({
    whatsappUserId: v.string(),
    currentState: whatsappConversationStateValidator,
    draftDescription: v.optional(v.string()),
    draftLandmark: v.optional(v.string()),
    draftLatitude: v.optional(v.number()),
    draftLongitude: v.optional(v.number()),
    draftPhotoReference: v.optional(v.string()),
    lastMessageAt: v.number(),
  }).index("by_whatsappUserId", ["whatsappUserId"]),

  collectionTasks: defineTable({
    displayId: v.string(),
    sourceType: taskSourceTypeValidator,
    sourceBinId: v.optional(v.id("bins")),
    sourceReportId: v.optional(v.id("citizenReports")),
    linkedReportIds: v.array(v.id("citizenReports")),
    latitude: v.number(),
    longitude: v.number(),
    priority: priorityValidator,
    reason: v.string(),
    status: taskStatusValidator,
    assignedTruckId: v.optional(v.id("trucks")),
    routeId: v.optional(v.id("routes")),
    scheduledAt: v.optional(v.number()),
    statusUpdatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_displayId", ["displayId"])
    .index("by_status", ["status"])
    .index("by_status_and_priority", ["status", "priority"])
    .index("by_sourceBinId", ["sourceBinId"])
    .index("by_sourceReportId", ["sourceReportId"])
    .index("by_routeId", ["routeId"])
    .index("by_assignedTruckId", ["assignedTruckId"]),

  trucks: defineTable({
    displayId: v.string(),
    driverName: v.string(),
    status: truckStatusValidator,
    latitude: v.number(),
    longitude: v.number(),
    assignedRouteId: v.optional(v.id("routes")),
    capacityPercentage: v.number(),
    maintenanceRisk: maintenanceRiskValidator,
    mileageSinceService: v.number(),
    lastServiceAt: v.number(),
    batteryPercentage: v.number(),
    engineHealthScore: v.number(),
    reportedFault: v.optional(v.string()),
    nextRecommendedServiceAt: v.optional(v.number()),
    source: dataSourceValidator,
  })
    .index("by_displayId", ["displayId"])
    .index("by_status", ["status"])
    .index("by_assignedRouteId", ["assignedRouteId"])
    .index("by_maintenanceRisk", ["maintenanceRisk"]),

  routes: defineTable({
    displayId: v.string(),
    truckId: v.id("trucks"),
    depotLatitude: v.number(),
    depotLongitude: v.number(),
    status: routeStatusValidator,
    orderedStopIds: v.array(v.id("routeStops")),
    currentStopIndex: v.number(),
    estimatedDistanceKm: v.number(),
    estimatedDurationMinutes: v.number(),
    trafficPenaltyMinutes: v.number(),
    roadConditionPenaltyMinutes: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_displayId", ["displayId"])
    .index("by_status", ["status"])
    .index("by_truckId", ["truckId"]),

  routeStops: defineTable({
    routeId: v.id("routes"),
    taskId: v.id("collectionTasks"),
    sequenceNumber: v.number(),
    status: routeStopStatusValidator,
    arrivalAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_routeId_and_sequenceNumber", ["routeId", "sequenceNumber"])
    .index("by_taskId", ["taskId"])
    .index("by_status", ["status"]),

  maintenanceAlerts: defineTable({
    truckId: v.id("trucks"),
    risk: maintenanceRiskValidator,
    reason: v.string(),
    recommendation: v.string(),
    simulated: v.boolean(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_truckId", ["truckId"])
    .index("by_risk", ["risk"]),

  notifications: defineTable({
    type: notificationTypeValidator,
    severity: notificationSeverityValidator,
    title: v.string(),
    description: v.string(),
    relatedEntityType: relatedEntityTypeValidator,
    relatedEntityId: relatedEntityIdValidator,
    readAt: v.optional(v.number()),
  })
    .index("by_readAt", ["readAt"])
    .index("by_severity", ["severity"])
    .index("by_relatedEntityType_and_relatedEntityId", [
      "relatedEntityType",
      "relatedEntityId",
    ]),

  activityEvents: defineTable({
    eventType: activityEventTypeValidator,
    description: v.string(),
    relatedEntityType: relatedEntityTypeValidator,
    relatedEntityId: relatedEntityIdValidator,
    actorUserId: v.optional(v.id("users")),
    previousStatus: v.optional(v.string()),
    nextStatus: v.optional(v.string()),
  })
    .index("by_eventType", ["eventType"])
    .index("by_relatedEntityType_and_relatedEntityId", [
      "relatedEntityType",
      "relatedEntityId",
    ]),

  settings: defineTable({
    key: v.literal("global"),
    approachingFullThreshold: v.number(),
    collectionRequiredThreshold: v.number(),
    criticalThreshold: v.number(),
    emptyConfirmationThreshold: v.number(),
    deviceOfflineTimeoutMinutes: v.number(),
    duplicateDistanceThresholdMeters: v.number(),
    maximumRouteStops: v.number(),
    depotLatitude: v.number(),
    depotLongitude: v.number(),
    simulationStepIntervalSeconds: v.number(),
    hardwareDemoIntervalSeconds: v.number(),
    trafficPenaltyMinutes: v.number(),
    roadConditionPenaltyMinutes: v.number(),
  }).index("by_key", ["key"]),
});
