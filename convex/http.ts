import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
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
      const message =
        error instanceof Error ? error.message : "Unexpected internal failure.";
      if (message.startsWith("NOT_FOUND:"))
        return json({ ok: false, error: message.slice(11) }, 404);
      if (message.startsWith("CONFLICT:"))
        return json({ ok: false, error: message.slice(10) }, 409);
      return json({ ok: false, error: "Unable to process the reading." }, 500);
    }
  }),
});

export default http;
