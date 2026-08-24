# Sesame

A mobile-first PWA for storing gated-community access codes and retrieving them by GPS
proximity. Built to replace a personal shopper's actual workflow: screenshotting gate codes and
scrolling through a photo library while stuck at a call box.

**Live app:** https://sesame-app-production-02e0.up.railway.app

## The core idea

Codes are pinned to **gates**, not to delivery addresses. A gate opens for many addresses, and
communities rotate codes on the gate, not per house — so a code is stored once, on the gate, and
every address behind it inherits it. This is deliberate:

- **Retrieval works because of it.** The moment of need is standing at a call box. The gate's
  saved coordinates are close to the phone's current position, so it's always the top result of
  a GPS-proximity search — not buried under a mile of address rows.
- **Updates work because of it.** One gate with forty addresses behind it is one update when a
  community rotates its code, instead of forty rows each carrying a stale duplicate.

Delivery addresses are still searchable — as plain text over a separate `addresses` table — for
checking a code before you arrive. That lookup itself needs no geocoding; the address field does
offer Places autocomplete as a typing aid, but picking a suggestion only fills in its text — no
address ever gets a lat/lng or a Place ID stored.

## Architecture

**Local-first.** All reads and writes hit `localStorage` first and are synchronous from the UI's
perspective; the app is fully usable offline, including adding new gates. The server is a
durability backstop, not the read path — sync pushes/pulls in the background and never blocks
the UI. IDs are client-generated UUIDs so offline-created records have stable identities before
they ever reach the server. Conflicts resolve last-write-wins on `updated_at`; deletes are soft
tombstones so they propagate correctly through sync.

**Single origin.** Fastify serves both the REST API and the built React app from one origin,
which keeps session cookies first-party and sidesteps CORS and Safari's cross-site cookie
restrictions on iOS entirely.

**No ORM.** Raw SQL via `pg`, and a hand-written ~30-line haversine implementation for distance
and proximity sorting — the one exception is the map view itself (see Maps below), which uses
the real thing rather than reimplementing map rendering.

## Stack

- **Frontend:** React + TypeScript + Vite, installable as a PWA (`vite-plugin-pwa`)
- **Backend:** Node + Fastify, REST, TypeScript
- **Database:** PostgreSQL, raw SQL via `pg`, hand-written migrations
- **Auth:** argon2id password hashing, server-side sessions, httpOnly cookies
- **Maps:** Google Maps JavaScript API + Places API (`@vis.gl/react-google-maps`) — see Maps below
- **Testing:** Vitest + React Testing Library (unit/component), Testcontainers (integration
  against real Postgres), Playwright (E2E — including geolocation mocking to test proximity
  sorting and offline behavior in a real browser)
- **CI:** GitHub Actions — typecheck, lint, unit/component, integration, and E2E on every push
- **Styling:** plain CSS, no framework, self-hosted Archivo font

## Maps

The one map view (gate pins, tap-to-preview, long-press to add a gate, drag to correct a pin)
and the add-gate form's address autocomplete both need a Google Maps JS API key with the Places
API enabled, a GCP billing account attached, and the key referrer-restricted to your deployed
origin plus `localhost`. See `.env.example` for the exact variables. This is a deliberate,
scoped exception to the rest of the app's zero-dependency approach — Google's Maps JS API terms
also forbid offline tile caching, so the map (and only the map) doesn't work with no signal;
everything else in the app is fully local-first regardless of whether a key is configured.

## Running locally

```bash
npm install

# frontend, proxying /api to the backend below — copy .env.example to .env
# first; the map card and address autocomplete are blank without a Maps key,
# but everything else works fine unconfigured
npm run dev

# backend — needs DATABASE_URL pointed at a local Postgres
npm run dev:server
```

```bash
npm test                 # unit + component (Vitest)
npm run test:integration # spins up Postgres via Testcontainers
npm run test:e2e         # Playwright, provisions a throwaway Postgres via Docker
```

## Non-goals

Geocoding arbitrary addresses, navigation, or turn-by-turn routing — the map is for browsing and
correcting gate pins, not directions. No sharing codes between users, and no crowdsourced
database of gate codes — this is a private tool for one person's own deliveries.
