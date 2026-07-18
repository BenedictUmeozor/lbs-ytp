# D-05 — WhatsApp Test Integration

**Status:** Approved  
**Decision date:** 2026-07-18

## Integration environment

Use Meta WhatsApp Cloud API with the Meta-provided test sender number and only recipients approved in the Meta test environment. Phase 11 will not register or migrate a production phone number or introduce a paid messaging dependency.

## Webhook endpoint

The exact endpoint is `/whatsapp/webhook`, giving the deployed callback URL `<CONVEX_SITE_URL>/whatsapp/webhook`.

The owner will subscribe the verified webhook to the WhatsApp `messages` field. No separate backend or polling mechanism will be introduced.

## Webhook verification

Meta GET verification uses `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. The endpoint requires `hub.mode=subscribe`, compares `hub.verify_token` with the configured token, and returns the exact `hub.challenge` as plain text when valid. Missing or incorrect verification values return HTTP 403. The configured token is never exposed.

## Webhook POST authentication

POST requests require `x-hub-signature-256` in the format `sha256=<64 hexadecimal digits>`. The body is read as raw bytes exactly once and authenticated with HMAC-SHA256 using `WHATSAPP_APP_SECRET` and Web Crypto `crypto.subtle.verify`. Signatures are not compared as ordinary strings. Missing or invalid signatures return HTTP 401, and JSON is parsed only after successful verification.

## Expected Meta assets

Every accepted payload has `object === "whatsapp_business_account"`, an entry WABA ID matching `WHATSAPP_WABA_ID`, and `metadata.phone_number_id` matching `WHATSAPP_PHONE_NUMBER_ID`. When present, `messaging_product` must be `whatsapp`. Relevant changes use `field === "messages"`. Signed payloads for a different WABA or phone-number ID return HTTP 403.

## Outbound messaging policy

Phase 11A sends free-form text only in response to a newly received resident message and enforces the 24-hour user-initiated service window. It does not implement custom templates, send the `hello_world` template, or send free-form text after the window closes. External sends are not retried automatically because a timed-out request may have reached Meta.

The access token remains replaceable through the Convex environment without a code change. Token refresh automation is outside the MVP.

## Convex environment variables

The integration may read only these WhatsApp variables:

- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_WABA_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_GRAPH_API_VERSION`

No WhatsApp variable is prefixed with `NEXT_PUBLIC_`. Values must not appear in source code, documentation, examples, checklists, error responses, or logs.
