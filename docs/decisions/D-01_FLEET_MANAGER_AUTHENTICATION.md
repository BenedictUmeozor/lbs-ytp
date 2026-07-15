# Decision D-01 — Fleet-manager authentication

**Status:** Approved  
**Approved on:** 2026-07-15  
**Required before:** Phase 2

## Decision

The MVP will use **Clerk integrated with Convex** for fleet-manager authentication.

## Approved implementation

- Use Clerk's Next.js SDK and Convex's `ConvexProviderWithClerk` integration.
- Support email-and-password sign-in for the demo fleet manager.
- Configure the Clerk instance in **Restricted** sign-up mode.
- Create the single demo fleet-manager account manually in Clerk; do not expose a public sign-up flow.
- Store the approved demo fleet-manager email in Convex as a `users` record with the existing `fleet_manager` role.
- Keep the account email configurable through a server-side Convex environment variable rather than committing a personal email address.
- Place protected fleet-manager pages under `/dashboard`.
- Keep resident report submission and report tracking routes public and separate from the dashboard.
- Add Clerk's Next.js `proxy.ts` integration, but enforce authentication again at the dashboard resource boundary.
- Convert only the dashboard Convex functions needed by the current phase from internal functions to authenticated public functions.
- Require every browser-accessible private Convex query or mutation to call a shared `requireFleetManager()` authorization helper.
- The helper must:
  1. obtain the Clerk identity through `ctx.auth.getUserIdentity()`;
  2. require a verified email identity;
  3. find the matching Convex `users` record by normalized email; and
  4. require the `fleet_manager` role.
- Do not rely on route protection alone to protect Convex data.
- Do not expose reset or seed operations to the browser.

## Demo account creation

The product owner will create one email-and-password user manually in the Clerk dashboard. The same normalized email will be configured in the Convex deployment and inserted or updated by the protected demo-data setup flow.

No password or Clerk secret may be committed to the repository.

## Route behaviour

- Unauthenticated access to `/dashboard` or its descendants redirects to `/sign-in`.
- Authenticated users who do not match an approved `fleet_manager` record must not receive private dashboard data.
- Public routes remain accessible without authentication and must not call private dashboard queries.
- Successful sign-in redirects to `/dashboard`.
- Sign-out redirects to `/sign-in` or the public landing page.

## Scope notes

This decision covers authentication and authorization only. It does not add multi-role administration, resident accounts, organisation tenancy, public registration, password-reset customisation, or production LAWMA identity integration.

## Official references

- Convex Clerk integration: https://docs.convex.dev/auth/clerk
- Convex authorization guidance: https://docs.convex.dev/auth/functions-auth
- Clerk Next.js middleware/proxy guidance: https://clerk.com/docs/reference/nextjs/clerk-middleware
- Clerk restricted sign-up mode: https://clerk.com/docs/guides/secure/restricting-access
