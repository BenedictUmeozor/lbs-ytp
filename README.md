# YTP Smart Waste Management MVP

A proof-of-concept smart waste management platform for the Bariga pilot.

## Documentation

- [Product requirements document](docs/YTP_Smart_Waste_MVP_PRD.md)
- [Implementation checklist](docs/IMPLEMENTATION_CHECKLIST.md)

The PRD controls product scope. Unresolved product or architecture decisions in the implementation checklist require product-owner approval before implementation.

## MVP capability boundaries

**Real capabilities when implemented:** one physical smart-bin input, Convex real-time updates, WhatsApp test reporting, public web reporting, landmark geocoding, and AI-assisted report triage.

**Simulated capabilities when implemented:** additional bins, trucks, truck movement, traffic and road-condition penalties, vehicle-health data, maintenance alerts, and demo activity history.

**Future only:** live Lagos traffic, live road-condition intelligence, real fleet telemetry, real predictive maintenance, autonomous dispatch, multi-LGA rollout, native mobile apps, and production LAWMA integration must not be represented as implemented.

## Local development

Use npm only:

```bash
npm install
cp .env.example .env.local
```

Set `NEXT_PUBLIC_CONVEX_URL` and the Clerk application values in `.env.local` as described in `.env.example`. Do not commit real keys, issuer domains, passwords, or email addresses.

## Authentication

Clerk is the approved fleet-manager authentication provider. Configure the Clerk application for email-and-password sign-in and **Restricted** sign-up mode. Create the demo fleet-manager account manually in Clerk; its email must exactly match `DEMO_FLEET_MANAGER_EMAIL` after trimming and lowercasing.

Set these Next.js variables in `.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
```

Set these server-side variables in the Convex deployment environment, not as `NEXT_PUBLIC_` variables:

```bash
CLERK_JWT_ISSUER_DOMAIN=
DEMO_FLEET_MANAGER_EMAIL=
GEMINI_API_KEY=
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
```

`GEMINI_API_KEY` and `NOMINATIM_BASE_URL` must be configured in the Convex deployment environment. Do not put either value in a `NEXT_PUBLIC_` variable; never log or commit the Gemini key.

After setting the Convex deployment variables and enabling Clerk's Convex integration, regenerate and deploy the Convex configuration:

```bash
npx convex dev --once
```

Run these commands in separate terminals for normal development:

```bash
npm run dev
```

```bash
npx convex dev
```
