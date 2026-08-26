# Sesame

Mobile PWA for saving gate codes at gated communities and pulling them back up by GPS when you're
back at the gate. Built this for personal shopper deliveries — the old workflow was
screenshotting gate codes and then digging through the camera roll trying to find the right one
at the call box. This is basically that, but it just knows where you are and shows you the code.

**Live app:** https://sesame-app-production-02e0.up.railway.app

## How it actually works

The big decision here: codes belong to the **gate**, not to a specific address. One gate, forty
houses behind it, one code. Not forty addresses each with their own copy of the same code.

Why it matters:

- When you're standing at the call box, the app just needs to find the nearest gate. If codes
  were saved per-address instead, you'd be at the entrance but the saved record could be a mile
  away at some house, so proximity search would just miss it.
- Communities change their codes sometimes. If it's one gate row, that's one edit. If it's forty
  address rows all holding a copy, someone always forgets to update one and now the app is
  confidently showing a code that doesn't work anymore, which is worse than not showing anything.

You can still search by address (plain text search over a separate `addresses` table) in case
you want to double check before you get there. Typing an address gets Places autocomplete
suggestions to help, but picking one just fills in the text box — no geocoding, nothing saved to
that table but the address itself.

Also added a "this code isn't working" flag you can toggle from a gate's detail view. Shows up as
a little warning badge on the card, the map pin, wherever. It clears itself automatically the
next time you update that gate's code, so you don't have to remember to un-flag it.

## Local-first, because signal at a gate is never good

Reads and writes hit `localStorage` first, and that's it from the UI's point of view — no waiting
on a server round trip to see a code. Works fully offline, including adding new gates. The
backend is just there for durability, syncing in the background whenever there's a connection.

Since gates can get created offline, IDs are UUIDs generated on the client instead of waiting on
the server to hand one out. If two devices edit the same gate, last write wins based on
`updated_at`. Deletes are soft (a `deleted_at` timestamp) since a hard delete would just look like
a row the other device hasn't synced yet and would come back from the dead.

## Stack

- **Frontend:** React + TypeScript + Vite, set up as an installable PWA
- **Backend:** Node + Fastify, plain REST, TypeScript
- **Database:** Postgres, raw SQL through `pg`, no ORM, migrations by hand
- **Auth:** rolled my own — argon2id, server-side sessions, httpOnly cookies
- **Maps:** Google Maps JS API + Places API, more on that below
- **Testing:** Vitest + React Testing Library for unit/component stuff, Testcontainers for
  integration tests against a real Postgres, Playwright for E2E (including faking GPS location so
  I can actually test the proximity sorting works)
- **CI:** GitHub Actions, runs on every push
- **Styling:** plain CSS, no Tailwind or component library, one self-hosted font

Distance sorting is just a haversine formula I wrote out by hand, maybe 30 lines. Didn't need a
library for that.

Frontend and backend are served from the same origin (Fastify serves the built React app too),
mainly so cookies stay first-party and I don't have to deal with CORS or Safari blocking
cross-site cookies on iOS.

## Maps

The map view (gate pins, tap a pin to preview, long-press to drop a new gate, drag a pin to fix
its location) and the address autocomplete both need a Google Maps API key with the Places API
turned on, plus a GCP project with billing attached (should stay in the free tier for personal
use, but Google still wants a card on file). Key needs to be referrer-restricted to your domain
and `localhost`. Check `.env.example` for the actual variable names.

This is really the one exception to keeping things dependency-free everywhere else in the app.
Google's terms don't let you cache map tiles for offline use, so the map is also the one screen
that just doesn't work without a connection — shows a "you need internet for this" message
instead of trying to fake it.

There's a few ways to set a gate's pin location: a GPS fix when you save it, long-pressing on the
map, dragging an existing pin, or now also a checkbox to just use the location of an address you
picked from autocomplete. All of these just set the gate's own lat/lng though — none of it gets
saved onto the address record, which stays plain text no matter what.

## Running it locally

```bash
npm install

# copy .env.example to .env first if you want maps/autocomplete to work locally,
# otherwise it'll just render without them, everything else still works fine
npm run dev

# needs DATABASE_URL pointing at a local Postgres
npm run dev:server
```

```bash
npm test                 # unit + component tests
npm run test:integration # spins up Postgres in a container
npm run test:e2e         # Playwright, also spins up its own throwaway Postgres
```

## Things this is not trying to do

No geocoding random addresses, no turn-by-turn directions, the map's just for looking at and
placing pins. No sharing codes with other users and no public database of gate codes floating
around — this is just for one person's own deliveries, nothing crowdsourced.
