import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type {
  ActivityEventType,
  NotificationSeverity,
  NotificationType,
  RelatedEntityId,
  RelatedEntityType,
} from "./validators";

export async function insertActivityEvent(
  ctx: MutationCtx,
  eventType: ActivityEventType,
  description: string,
  relatedEntityType: RelatedEntityType,
  relatedEntityId: RelatedEntityId,
  actorUserId?: Id<"users">,
  previousStatus?: string,
  nextStatus?: string,
): Promise<Id<"activityEvents">> {
  return ctx.db.insert("activityEvents", {
    eventType,
    description,
    relatedEntityType,
    relatedEntityId,
    actorUserId,
    previousStatus,
    nextStatus,
  });
}

export async function insertNotification(
  ctx: MutationCtx,
  type: NotificationType,
  severity: NotificationSeverity,
  title: string,
  description: string,
  relatedEntityType: RelatedEntityType,
  relatedEntityId: RelatedEntityId,
  readAt?: number,
): Promise<Id<"notifications">> {
  return ctx.db.insert("notifications", {
    type,
    severity,
    title,
    description,
    relatedEntityType,
    relatedEntityId,
    readAt,
  });
}
