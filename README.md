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

Set `NEXT_PUBLIC_CONVEX_URL` in `.env.local` as described in `.env.example`. Running Convex development configures the local deployment values automatically.

Run these commands in separate terminals:

```bash
npm run dev
```

```bash
npx convex dev
```
