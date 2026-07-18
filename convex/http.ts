import { httpRouter } from "convex/server";
import { ConvexError } from "convex/values";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import {
  decodeHexSignature,
  getWhatsAppVerificationConfig,
  getWhatsAppWebhookSecurityConfig,
  normalizeWebhookPayload,
  WhatsAppAssetError,
  WhatsAppPayloadError,
} from "./domain/whatsapp";

const http = httpRouter();

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isHardwareError(
  error: unknown,
): error is ConvexError<{ code: "NOT_FOUND" | "CONFLICT"; message: string }> {
  if (!(error instanceof ConvexError)) return false;
  const data = error.data;
  return (
    data !== null &&
    typeof data === "object" &&
    "code" in data &&
    "message" in data &&
    (data.code === "NOT_FOUND" || data.code === "CONFLICT") &&
    typeof data.message === "string"
  );
}

http.route({
  path: "/hardware/readings",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return json({ ok: false, error: "Malformed JSON payload." }, 400);
    }
    if (
      payload === null ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    )
      return json({ ok: false, error: "Payload must be an object." }, 400);
    const { deviceId, binId, fillPercentage, recordedAt } = payload as Record<
      string,
      unknown
    >;
    if (typeof deviceId !== "string" || deviceId.trim() === "")
      return json(
        { ok: false, error: "deviceId must be a non-empty string." },
        400,
      );
    if (typeof binId !== "string" || binId.trim() === "")
      return json(
        { ok: false, error: "binId must be a non-empty string." },
        400,
      );
    if (
      typeof fillPercentage !== "number" ||
      !Number.isFinite(fillPercentage) ||
      fillPercentage < 0 ||
      fillPercentage > 100
    )
      return json(
        {
          ok: false,
          error: "fillPercentage must be a finite number between 0 and 100.",
        },
        400,
      );
    if (typeof recordedAt !== "string" || Number.isNaN(Date.parse(recordedAt)))
      return json(
        { ok: false, error: "recordedAt must be a valid date." },
        400,
      );
    const recordedTimestamp = Date.parse(recordedAt);
    if (recordedTimestamp > Date.now() + 5 * 60 * 1000)
      return json(
        {
          ok: false,
          error: "recordedAt cannot be more than five minutes in the future.",
        },
        400,
      );
    try {
      const result = await ctx.runMutation(internal.hardware.ingestReading, {
        deviceIdentifier: deviceId.trim(),
        binDisplayId: binId.trim(),
        fillPercentage,
        recordedAt: recordedTimestamp,
        receivedAt: Date.now(),
      });
      return json(
        {
          ok: true,
          duplicate: result.duplicate,
          appliedToCurrentState: result.appliedToCurrentState,
          unusualReading: result.unusualReading,
          deviceStatus: result.deviceStatus,
          binStatus: result.binStatus,
          taskCreated: result.taskCreated,
          emptyingConfirmed: result.emptyingConfirmed,
        },
        200,
      );
    } catch (error) {
      if (isHardwareError(error))
        return json(
          { ok: false, error: error.data.message },
          error.data.code === "NOT_FOUND" ? 404 : 409,
        );
      return json({ ok: false, error: "Unable to process the reading." }, 500);
    }
  }),
});

http.route({
  path: "/whatsapp/webhook",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const suppliedToken = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    let verifyToken: string;
    try {
      verifyToken = getWhatsAppVerificationConfig().verifyToken;
    } catch {
      return new Response("Server configuration unavailable.", { status: 500 });
    }
    if (
      mode !== "subscribe" ||
      suppliedToken === null ||
      suppliedToken !== verifyToken ||
      challenge === null
    ) {
      return new Response("Forbidden.", { status: 403 });
    }
    return new Response(challenge, {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  }),
});

http.route({
  path: "/whatsapp/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signatureHeader = request.headers.get("x-hub-signature-256");
    if (
      signatureHeader === null ||
      !/^sha256=[0-9a-fA-F]{64}$/.test(signatureHeader)
    ) {
      return json({ received: false }, 401);
    }

    let securityConfig: ReturnType<typeof getWhatsAppWebhookSecurityConfig>;
    try {
      securityConfig = getWhatsAppWebhookSecurityConfig();
    } catch {
      return json({ received: false }, 500);
    }

    let rawBody: ArrayBuffer;
    try {
      rawBody = await request.arrayBuffer();
    } catch {
      return json({ received: false }, 400);
    }
    if (rawBody.byteLength > 1024 * 1024) {
      return json({ received: false }, 413);
    }

    const signature = decodeHexSignature(signatureHeader.slice(7));
    if (signature === null) return json({ received: false }, 401);
    try {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(securityConfig.appSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"],
      );
      const valid = await crypto.subtle.verify("HMAC", key, signature, rawBody);
      if (!valid) return json({ received: false }, 401);
    } catch {
      return json({ received: false }, 401);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(new TextDecoder().decode(rawBody));
    } catch {
      return json({ received: false }, 400);
    }

    try {
      const events = normalizeWebhookPayload(payload, securityConfig);
      await ctx.runMutation(internal.whatsapp.ingestWebhookEvents, {
        events,
        receivedAt: Date.now(),
      });
      return json({ received: true }, 200);
    } catch (error) {
      if (error instanceof WhatsAppAssetError) {
        return json({ received: false }, 403);
      }
      if (error instanceof WhatsAppPayloadError) {
        return json({ received: false }, 400);
      }
      return json({ received: false }, 500);
    }
  }),
});

export default http;
