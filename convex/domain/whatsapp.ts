import type { WhatsAppEventType, WhatsAppMessageType } from "./validators";

const GRAPH_VERSION_PATTERN = /^v[0-9]+\.[0-9]+$/;
const DIGITS_PATTERN = /^[0-9]+$/;
const MAX_SAFE_ERROR_LENGTH = 200;

type UnknownRecord = Record<string, unknown>;

export type NormalizedWhatsAppEvent =
  | {
      kind: "message";
      providerMessageId: string;
      whatsappUserId: string;
      phoneNumberId: string;
      providerTimestamp: number;
      messageType: WhatsAppMessageType;
      providerMessageType?: string;
    }
  | {
      kind: "status";
      providerMessageId: string;
      whatsappUserId: string;
      phoneNumberId: string;
      providerTimestamp: number;
      providerStatus: "sent" | "delivered" | "read" | "failed";
      eventType: Extract<
        WhatsAppEventType,
        "status_sent" | "status_delivered" | "status_read" | "status_failed"
      >;
      errorCode?: string;
      errorMessage?: string;
    };

export class WhatsAppPayloadError extends Error {}
export class WhatsAppAssetError extends Error {}

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error("WhatsApp server configuration is unavailable.");
  }
  return value;
}

function digits(name: string): string {
  const value = required(name);
  if (!DIGITS_PATTERN.test(value)) {
    throw new Error("WhatsApp server configuration is unavailable.");
  }
  return value;
}

export function getWhatsAppVerificationConfig() {
  return { verifyToken: required("WHATSAPP_WEBHOOK_VERIFY_TOKEN") };
}

export function getWhatsAppWebhookSecurityConfig() {
  return {
    appSecret: required("WHATSAPP_APP_SECRET"),
    wabaId: digits("WHATSAPP_WABA_ID"),
    phoneNumberId: digits("WHATSAPP_PHONE_NUMBER_ID"),
  };
}

export function getWhatsAppOutboundConfig() {
  const graphApiVersion = required("WHATSAPP_GRAPH_API_VERSION");
  if (!GRAPH_VERSION_PATTERN.test(graphApiVersion)) {
    throw new Error("WhatsApp server configuration is unavailable.");
  }
  return {
    phoneNumberId: digits("WHATSAPP_PHONE_NUMBER_ID"),
    accessToken: required("WHATSAPP_ACCESS_TOKEN"),
    graphApiVersion,
  };
}

export function decodeHexSignature(
  value: string,
): Uint8Array<ArrayBuffer> | null {
  if (!/^[0-9a-fA-F]{64}$/.test(value)) return null;
  const bytes = new Uint8Array(new ArrayBuffer(32));
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export function convertProviderTimestamp(value: unknown): number {
  if (typeof value !== "string" || !/^[0-9]+$/.test(value)) {
    throw new WhatsAppPayloadError("Invalid provider timestamp.");
  }
  const milliseconds = Number(value) * 1000;
  if (!Number.isSafeInteger(milliseconds)) {
    throw new WhatsAppPayloadError("Invalid provider timestamp.");
  }
  return milliseconds;
}

export function normalizeMessageType(value: string): WhatsAppMessageType {
  if (value === "text" || value === "image" || value === "location") {
    return value;
  }
  return "unsupported";
}

export function normalizeStatusEvent(
  value: string,
): Extract<NormalizedWhatsAppEvent, { kind: "status" }>["eventType"] | null {
  const events = {
    sent: "status_sent",
    delivered: "status_delivered",
    read: "status_read",
    failed: "status_failed",
  } as const;
  return events[value as keyof typeof events] ?? null;
}

function record(value: unknown, message: string): UnknownRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new WhatsAppPayloadError(message);
  }
  return value as UnknownRecord;
}

function nonEmptyString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new WhatsAppPayloadError(message);
  }
  return value;
}

function safeText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.slice(0, MAX_SAFE_ERROR_LENGTH);
}

export function extractSafeMetaError(value: unknown): {
  errorCode?: string;
  errorMessage?: string;
} {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const error = value as UnknownRecord;
  const code =
    typeof error.code === "string" || typeof error.code === "number"
      ? String(error.code).slice(0, MAX_SAFE_ERROR_LENGTH)
      : undefined;
  return { errorCode: code, errorMessage: safeText(error.title) };
}

function validateMessageShape(
  message: UnknownRecord,
  type: WhatsAppMessageType,
) {
  if (type === "text") {
    const text = record(message.text, "Invalid text message.");
    if (typeof text.body !== "string") {
      throw new WhatsAppPayloadError("Invalid text message.");
    }
  } else if (type === "location") {
    const location = record(message.location, "Invalid location message.");
    if (
      typeof location.latitude !== "number" ||
      !Number.isFinite(location.latitude) ||
      typeof location.longitude !== "number" ||
      !Number.isFinite(location.longitude)
    ) {
      throw new WhatsAppPayloadError("Invalid location message.");
    }
  } else if (type === "image") {
    const image = record(message.image, "Invalid image message.");
    nonEmptyString(image.id, "Invalid image message.");
  }
}

export function normalizeWebhookPayload(
  payload: unknown,
  expected: { wabaId: string; phoneNumberId: string },
): NormalizedWhatsAppEvent[] {
  const root = record(payload, "Payload must be an object.");
  if (root.object !== "whatsapp_business_account") {
    throw new WhatsAppAssetError("Unexpected WhatsApp asset.");
  }
  if (!Array.isArray(root.entry)) {
    throw new WhatsAppPayloadError("Invalid WhatsApp entries.");
  }

  const normalized: NormalizedWhatsAppEvent[] = [];
  for (const entryValue of root.entry) {
    const entry = record(entryValue, "Invalid WhatsApp entry.");
    if (nonEmptyString(entry.id, "Invalid WABA ID.") !== expected.wabaId) {
      throw new WhatsAppAssetError("Unexpected WhatsApp asset.");
    }
    if (!Array.isArray(entry.changes)) {
      throw new WhatsAppPayloadError("Invalid WhatsApp changes.");
    }
    for (const changeValue of entry.changes) {
      const change = record(changeValue, "Invalid WhatsApp change.");
      if (change.field !== "messages") continue;
      const value = record(change.value, "Invalid messages change.");
      if (
        value.messaging_product !== undefined &&
        value.messaging_product !== "whatsapp"
      ) {
        throw new WhatsAppAssetError("Unexpected messaging product.");
      }
      const metadata = record(value.metadata, "Missing message metadata.");
      const phoneNumberId = nonEmptyString(
        metadata.phone_number_id,
        "Missing phone-number ID.",
      );
      if (phoneNumberId !== expected.phoneNumberId) {
        throw new WhatsAppAssetError("Unexpected WhatsApp asset.");
      }

      if (value.messages !== undefined && !Array.isArray(value.messages)) {
        throw new WhatsAppPayloadError("Invalid messages array.");
      }
      for (const messageValue of (value.messages as unknown[] | undefined) ??
        []) {
        const message = record(messageValue, "Invalid message.");
        const providerType = nonEmptyString(
          message.type,
          "Missing message type.",
        );
        const messageType = normalizeMessageType(providerType);
        validateMessageShape(message, messageType);
        normalized.push({
          kind: "message",
          providerMessageId: nonEmptyString(message.id, "Missing message ID."),
          whatsappUserId: nonEmptyString(message.from, "Missing sender ID."),
          phoneNumberId,
          providerTimestamp: convertProviderTimestamp(message.timestamp),
          messageType,
          providerMessageType:
            messageType === "unsupported" ? providerType : undefined,
        });
      }

      if (value.statuses !== undefined && !Array.isArray(value.statuses)) {
        throw new WhatsAppPayloadError("Invalid statuses array.");
      }
      for (const statusValue of (value.statuses as unknown[] | undefined) ??
        []) {
        const status = record(statusValue, "Invalid message status.");
        const providerStatus = nonEmptyString(status.status, "Missing status.");
        const eventType = normalizeStatusEvent(providerStatus);
        if (eventType === null) continue;
        const safeError =
          providerStatus === "failed" && Array.isArray(status.errors)
            ? extractSafeMetaError(status.errors[0])
            : {};
        normalized.push({
          kind: "status",
          providerMessageId: nonEmptyString(status.id, "Missing message ID."),
          whatsappUserId: nonEmptyString(
            status.recipient_id,
            "Missing recipient ID.",
          ),
          phoneNumberId,
          providerTimestamp: convertProviderTimestamp(status.timestamp),
          providerStatus: providerStatus as
            "sent" | "delivered" | "read" | "failed",
          eventType,
          ...safeError,
        });
      }
      if (normalized.length > 100) {
        throw new WhatsAppPayloadError("Too many WhatsApp events.");
      }
    }
  }
  return normalized;
}
