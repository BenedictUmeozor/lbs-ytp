# D-04 — Gemini Configuration

**Status:** Approved

The controlled MVP uses the stable `gemini-3.1-flash-lite` model through the official `@google/genai` JavaScript SDK and its Interactions API. Gemini is called only from a server-side Convex Node action using `GEMINI_API_KEY`; no browser credential or second AI SDK is used.

The action requires structured JSON with exactly: `category` (`overflowing_waste`, `illegal_dumpsite`, `missed_collection`, `drainage_blockage`, or `other`), `priority` (`low`, `medium`, `high`, or `critical`), `locationText`, `summary`, `requiresCollection`, and `needsClarification`. It requests no reasoning, explanations, confidence scores, or internal analysis. Parsed output is validated by explicit TypeScript runtime guards before storage. Prompts and raw responses are not stored.

A request gets at most two attempts: the initial request and one short-delay retry for temporary network, service, rate-limit, missing-response, JSON parsing, or validation failures. Authentication and configuration failures are not retried. After the second failure, deterministic local rules classify the report, retain the resident's original message, and set `aiStatus: fallback`.

Gemini input is contact-redacted and limited to the submitted description, resident category, location-input kind, and redacted landmark. The current free-tier choice is for the controlled MVP and remains subject to provider quotas.
