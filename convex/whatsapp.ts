import { v } from "convex/values";

import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  type MutationCtx,
} from "./_generated/server";
import { whatsappMessageTypeValidator } from "./domain/validators";
import {
  getWhatsAppOutboundConfig,
  type NormalizedWhatsAppEvent,
} from "./domain/whatsapp";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const FOUNDATION_REPLY =
  "WhatsApp reporting is connected successfully. Guided report submission will be enabled in the next phase.";
const UNSUPPORTED_REPLY =
  "This message type is not supported. Please send a text message.";

const normalizedEventValidator = v.union(
  v.object({
    kind: v.literal("message"),
    providerMessageId: v.string(),
    whatsappUserId: v.string(),
    phoneNumberId: v.string(),
    providerTimestamp: v.number(),
    messageType: whatsappMessageTypeValidator,
    providerMessageType: v.optional(v.string()),
  }),
  v.object({
    kind: v.literal("status"),
    providerMessageId: v.string(),
    whatsappUserId: v.string(),
    phoneNumberId: v.string(),
    providerTimestamp: v.number(),
    providerStatus: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed"),
    ),
    eventType: v.union(
      v.literal("status_sent"),
      v.literal("status_delivered"),
      v.literal("status_read"),
      v.literal("status_failed"),
    ),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  }),
);

async function eventExists(ctx: MutationCtx, eventKey: string) {
  return (
    (await ctx.db
      .query("whatsappMessageEvents")
      .withIndex("by_eventKey", (query) => query.eq("eventKey", eventKey))
      .unique()) !== null
  );
}

export const ingestWebhookEvents = internalMutation({
  args: {
    events: v.array(normalizedEventValidator),
    receivedAt: v.number(),
  },
  returns: v.object({ inserted: v.number(), duplicates: v.number() }),
  handler: async (ctx, args) => {
    let inserted = 0;
    let duplicates = 0;

    for (const event of args.events as NormalizedWhatsAppEvent[]) {
      const eventKey =
        event.kind === "message"
          ? `inbound:${event.providerMessageId}`
          : `status:${event.providerMessageId}:${event.providerStatus}:${event.providerTimestamp}`;
      if (await eventExists(ctx, eventKey)) {
        duplicates += 1;
        continue;
      }

      if (event.kind === "status") {
        await ctx.db.insert("whatsappMessageEvents", {
          eventKey,
          providerMessageId: event.providerMessageId,
          whatsappUserId: event.whatsappUserId,
          phoneNumberId: event.phoneNumberId,
          direction: "outbound",
          eventType: event.eventType,
          occurredAt: event.providerTimestamp,
          recordedAt: args.receivedAt,
          errorCode: event.errorCode,
          errorMessage: event.errorMessage,
        });
        inserted += 1;
        continue;
      }

      const conversation = await ctx.db
        .query("whatsappConversations")
        .withIndex("by_whatsappUserId", (query) =>
          query.eq("whatsappUserId", event.whatsappUserId),
        )
        .unique();
      let conversationId = conversation?._id;
      if (conversation === null) {
        conversationId = await ctx.db.insert("whatsappConversations", {
          whatsappUserId: event.whatsappUserId,
          currentState: "awaiting_description",
          lastMessageAt: event.providerTimestamp,
          lastInboundMessageAt: event.providerTimestamp,
        });
      } else {
        const lastMessageAt = Math.max(
          conversation.lastMessageAt,
          event.providerTimestamp,
        );
        const lastInboundMessageAt = Math.max(
          conversation.lastInboundMessageAt ?? 0,
          event.providerTimestamp,
        );
        await ctx.db.patch(conversation._id, {
          lastMessageAt,
          lastInboundMessageAt,
        });
      }

      const inboundEventId = await ctx.db.insert("whatsappMessageEvents", {
        eventKey,
        providerMessageId: event.providerMessageId,
        whatsappUserId: event.whatsappUserId,
        phoneNumberId: event.phoneNumberId,
        direction: "inbound",
        eventType: "inbound_received",
        messageType: event.messageType,
        providerMessageType: event.providerMessageType,
        occurredAt: event.providerTimestamp,
        recordedAt: args.receivedAt,
        conversationId,
      });
      await ctx.scheduler.runAfter(0, internal.whatsapp.sendFoundationReply, {
        inboundEventId,
      });
      inserted += 1;
    }

    return { inserted, duplicates };
  },
});

export const reserveFoundationReply = internalMutation({
  args: { inboundEventId: v.id("whatsappMessageEvents") },
  returns: v.union(
    v.null(),
    v.object({
      recipientId: v.string(),
      phoneNumberId: v.string(),
      inboundProviderMessageId: v.string(),
      messageType: whatsappMessageTypeValidator,
      conversationId: v.id("whatsappConversations"),
    }),
  ),
  handler: async (ctx, args) => {
    const inbound = await ctx.db.get(
      "whatsappMessageEvents",
      args.inboundEventId,
    );
    if (
      inbound === null ||
      inbound.eventType !== "inbound_received" ||
      inbound.providerMessageId === undefined ||
      inbound.messageType === undefined ||
      inbound.conversationId === undefined
    ) {
      return null;
    }
    const reservationKey = `foundation-reply:${inbound.providerMessageId}`;
    if (await eventExists(ctx, reservationKey)) return null;

    const conversation = await ctx.db.get(
      "whatsappConversations",
      inbound.conversationId,
    );
    if (conversation === null) return null;
    if (
      conversation.lastInboundMessageAt === undefined ||
      Date.now() - conversation.lastInboundMessageAt > DAY_IN_MILLISECONDS
    ) {
      await ctx.db.insert("whatsappMessageEvents", {
        eventKey: reservationKey,
        whatsappUserId: inbound.whatsappUserId,
        phoneNumberId: inbound.phoneNumberId,
        direction: "outbound",
        eventType: "outbound_failed",
        messageType: "text",
        occurredAt: Date.now(),
        recordedAt: Date.now(),
        conversationId: inbound.conversationId,
        replyToProviderMessageId: inbound.providerMessageId,
        errorCode: "SERVICE_WINDOW_CLOSED",
        errorMessage: "The user-initiated service window is closed.",
      });
      return null;
    }

    await ctx.db.insert("whatsappMessageEvents", {
      eventKey: reservationKey,
      whatsappUserId: inbound.whatsappUserId,
      phoneNumberId: inbound.phoneNumberId,
      direction: "outbound",
      eventType: "outbound_queued",
      messageType: "text",
      occurredAt: Date.now(),
      recordedAt: Date.now(),
      conversationId: inbound.conversationId,
      replyToProviderMessageId: inbound.providerMessageId,
    });
    return {
      recipientId: inbound.whatsappUserId,
      phoneNumberId: inbound.phoneNumberId,
      inboundProviderMessageId: inbound.providerMessageId,
      messageType: inbound.messageType,
      conversationId: inbound.conversationId,
    };
  },
});

export const recordOutboundAccepted = internalMutation({
  args: {
    conversationId: v.id("whatsappConversations"),
    recipientId: v.string(),
    phoneNumberId: v.string(),
    metaMessageId: v.string(),
    inboundProviderMessageId: v.string(),
    acceptedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const eventKey = `outbound:${args.metaMessageId}`;
    if (!(await eventExists(ctx, eventKey))) {
      await ctx.db.insert("whatsappMessageEvents", {
        eventKey,
        providerMessageId: args.metaMessageId,
        whatsappUserId: args.recipientId,
        phoneNumberId: args.phoneNumberId,
        direction: "outbound",
        eventType: "outbound_accepted",
        messageType: "text",
        occurredAt: args.acceptedAt,
        recordedAt: args.acceptedAt,
        conversationId: args.conversationId,
        replyToProviderMessageId: args.inboundProviderMessageId,
      });
    }
    const conversation = await ctx.db.get(
      "whatsappConversations",
      args.conversationId,
    );
    if (conversation !== null) {
      await ctx.db.patch(conversation._id, {
        lastOutboundMessageAt: Math.max(
          conversation.lastOutboundMessageAt ?? 0,
          args.acceptedAt,
        ),
      });
    }
    return null;
  },
});

export const recordOutboundFailure = internalMutation({
  args: {
    conversationId: v.id("whatsappConversations"),
    recipientId: v.string(),
    phoneNumberId: v.string(),
    inboundProviderMessageId: v.string(),
    errorCode: v.string(),
    errorMessage: v.string(),
    failureAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const eventKey = `outbound-failed:${args.inboundProviderMessageId}`;
    if (!(await eventExists(ctx, eventKey))) {
      await ctx.db.insert("whatsappMessageEvents", {
        eventKey,
        whatsappUserId: args.recipientId,
        phoneNumberId: args.phoneNumberId,
        direction: "outbound",
        eventType: "outbound_failed",
        messageType: "text",
        occurredAt: args.failureAt,
        recordedAt: args.failureAt,
        conversationId: args.conversationId,
        replyToProviderMessageId: args.inboundProviderMessageId,
        errorCode: args.errorCode.slice(0, 200),
        errorMessage: args.errorMessage.slice(0, 200),
      });
    }
    return null;
  },
});

async function readMetaMessageId(response: Response): Promise<string | null> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return null;
  }
  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return null;
  }
  const messages = (payload as Record<string, unknown>).messages;
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const first = messages[0];
  if (first === null || typeof first !== "object" || Array.isArray(first)) {
    return null;
  }
  const id = (first as Record<string, unknown>).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export const sendFoundationReply = internalAction({
  args: { inboundEventId: v.id("whatsappMessageEvents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const reservation = await ctx.runMutation(
      internal.whatsapp.reserveFoundationReply,
      args,
    );
    if (reservation === null) return null;

    const fail = async (errorCode: string, errorMessage: string) => {
      await ctx.runMutation(internal.whatsapp.recordOutboundFailure, {
        conversationId: reservation.conversationId,
        recipientId: reservation.recipientId,
        phoneNumberId: reservation.phoneNumberId,
        inboundProviderMessageId: reservation.inboundProviderMessageId,
        errorCode,
        errorMessage,
        failureAt: Date.now(),
      });
    };

    let config: ReturnType<typeof getWhatsAppOutboundConfig>;
    try {
      config = getWhatsAppOutboundConfig();
    } catch {
      await fail("CONFIGURATION_ERROR", "Outbound messaging is unavailable.");
      return null;
    }
    if (config.phoneNumberId !== reservation.phoneNumberId) {
      await fail("PHONE_NUMBER_MISMATCH", "Outbound messaging is unavailable.");
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(
        `https://graph.facebook.com/${config.graphApiVersion}/${config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: reservation.recipientId,
            type: "text",
            context: { message_id: reservation.inboundProviderMessageId },
            text: {
              preview_url: false,
              body:
                reservation.messageType === "unsupported"
                  ? UNSUPPORTED_REPLY
                  : FOUNDATION_REPLY,
            },
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        await fail("META_HTTP_ERROR", "Meta rejected the outbound message.");
        return null;
      }
      const metaMessageId = await readMetaMessageId(response);
      if (metaMessageId === null) {
        await fail(
          "MALFORMED_META_RESPONSE",
          "Meta returned an invalid response.",
        );
        return null;
      }
      await ctx.runMutation(internal.whatsapp.recordOutboundAccepted, {
        conversationId: reservation.conversationId,
        recipientId: reservation.recipientId,
        phoneNumberId: reservation.phoneNumberId,
        metaMessageId,
        inboundProviderMessageId: reservation.inboundProviderMessageId,
        acceptedAt: Date.now(),
      });
    } catch (error) {
      await fail(
        error instanceof DOMException && error.name === "AbortError"
          ? "META_TIMEOUT"
          : "META_NETWORK_ERROR",
        "The outbound message could not be sent.",
      );
    } finally {
      clearTimeout(timeout);
    }
    return null;
  },
});
