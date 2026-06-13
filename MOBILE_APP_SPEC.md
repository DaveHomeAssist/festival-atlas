# Festival Atlas — Mobile Application Specification

**Status:** Draft v1
**Date:** 2026-06-13
**Owner:** Festival Atlas
**Scope:** Native-quality mobile app (iOS + Android) for the 2026 season and beyond
**Source product:** Festival Atlas static web app (this repository)

---

## 1. Overview

Festival Atlas is today a static, local-first web app (PWA) for planning a run
across the US music-festival circuit. It ships a seeded directory of 43
festivals, a route/trip planner, a month calendar, a "Setkeeper" set journal,
and an audit/ops surface. All state lives in `localStorage` under the `FA`
namespace.

This document specs a **mobile application** that takes the same local-first
philosophy native: faster to browse, useful on-site (offline, in a field, with
bad signal), and built around the three jobs the web app already serves —
**discover**, **plan/route**, and **journal**. It is explicitly *not* a rewrite
of the product concept; it is a re-platforming plus the mobile-only affordances
(maps, location, notifications, camera, share sheet, calendar/wallet
integration) that a phone makes possible.

### 1.1 Goals

1. Preserve the local-first, no-account, privacy-respecting model. The app is
   useful with zero network and zero sign-up.
2. Reach feature parity with the six web surfaces (home, festivals, calendar,
   route, setkeeper, audit) within the data model already defined.
3. Add the mobile-native capabilities the web app flags but cannot fully
   deliver: real maps, device location, push reminders, camera capture for the
   journal, OS share/calendar/wallet hooks.
4. Keep "trust" front-and-center: surface season status, source freshness, and
   the "verify official source before booking" guardrail that the web app
   already enforces.

### 1.2 Non-goals (v1)

- Mandatory accounts or a server-side user database.
- Live ticketing / payments inside the app (we deep-link to official sellers).
- Live flight/hotel inventory or booking transactions (we deep-link to search).
- Social network features (following, feeds, public profiles).
- International festival data as a shipped default (the international research
  pack exists but the map projection and seed are US-centric today — see §11).

### 1.3 Guiding principles

- **Local first, sync optional.** The on-device store is the source of truth.
- **Offline is the on-site default.** Assume no signal in a field in Indio.
- **Source-backed, not authoritative.** Every date/price is "verify before
  booking" until an official source confirms it.
- **Fast to browse.** Sub-second cold start to a usable directory.

---

## 2. Target platforms & tech

| Concern | Decision | Rationale |
|---|---|---|
| Platforms | iOS 16+, Android 10+ (API 29+) | Covers ~95% of active festival-goer devices |
| Approach | **React Native + Expo** (decided) | Keeps the team in the existing JS/TS world; lets us port `data.js`, `schedule.js`, `logos.js`, and `shared/js/core/*` with minimal rewrite; first-class offline + notification + share modules |
| Offline store | SQLite (via expo-sqlite / Drift) + a thin KV layer | Structured queries for the directory; KV mirrors the web `localStorage` keys for migration |
| Maps | MapLibre GL (vector, offline tiles) or Mapbox | Replaces the SVG US projection; works internationally |
| Push | Expo Notifications / FCM + APNs | Date and route reminders |
| Build/CI | EAS Build (or Codemagic) + the existing `npm run validate` smoke gate adapted | Reuse the validation discipline already in the repo |

> **Decision:** React Native + Expo. It keeps the team in the JS/TS world the
> web app already lives in, lets us port `data.js`, `schedule.js`, `logos.js`,
> and the `shared/js/core/*` helpers with minimal rewrite, and has first-class
> offline + notification + share modules. Concretely: expo-sqlite for the store,
> expo-location, expo-notifications, expo-camera/image-picker, expo-sharing, and
> expo-calendar; MapLibre via `@maplibre/maplibre-react-native` for the map; EAS
> Build for CI.

---

## 3. Data model

The mobile app reuses the web app's domain model verbatim so a single seed and a
single sync format serve both. Field names carry forward from the current
codebase (a future rename pass is tracked in §11), but the mobile schema
documents the festival-context meaning.

### 3.1 Festival (`park` in current code)

```ts
interface Festival {
  id: string;                 // "coachella"
  name: string;               // "Coachella Valley Music and Arts Festival"
  genre: string;              // current field: `team`  — "Pop · Hip hop · Electronic"
  city: string;               // "Indio, CA"
  setting: string;            // current field: `roof`  — Urban|Camping|Waterfront|Mixed|Outdoor|Amphitheater
  tier: "S" | "A" | "B";
  color: string;              // brand-ish accent, used for monogram + map pin
  note: string;
  ticketApproach: string;     // advisory prose -> drives "official seller" deep link
  transitNote: string;
  coordinates: { lat: number; lng: number };
  capacity: number | null;
  specialEvents: string[];

  // enrichment (today in ENRICHMENT map; folded onto the entity on device)
  searchMeta: { localName: string; region: string };
  booking: { airportCode: string; lodgingQuery: string; groundQuery: string };

  // season/source metadata surfaced by app.js season helpers
  dateRange?: { start: string; end: string };  // ISO; may be next-confirmed
  seasonStatus?: "happeningNow" | "happeningSoon" | "upcoming" | "needsReview" | "past";
  officialUrl?: string;
  source?: { url: string; lastReviewed: string; note?: string };
}
```

### 3.2 Session (schedule entry — `schedule.js`)

A festival has 0..n sessions (day/stage slots) used by the calendar and the
route's "pick the sets that matter" flow, exportable to the device calendar.

### 3.3 Local state (mirrors current `FA:` storage keys)

These keys are ported 1:1 so an existing web user can import their data (§9):

```
FA:visits                  -> attended history + per-festival meta (notes, date, bestFeature)
FA:activeTrip              -> ordered route stops
FA:routeLegs               -> travel legs between stops
FA:planningNotes           -> trip-scope notes
FA:entityScratchpads       -> per-festival scratch notes
FA:shortlistFestivalIds    -> shortlist
FA:festivalJournalEntries  -> Setkeeper set-by-set entries
FA:festivalJournalHistory  -> Setkeeper attended-session history
FA:festivalCustomSchedule  -> user-added/edited sessions
FA:setkeeperDraft          -> in-progress journal draft
FA:theme                   -> selected theme
FA:context                 -> cross-page hand-off (open this festival/session)
FA:sharedTripImports       -> imported trip payloads
```

On device these live in SQLite tables with the same logical shape; a KV mirror
preserves the exact JSON for round-trip export/import compatibility.

---

## 4. Information architecture & navigation

Bottom tab bar (5 tabs), mapping the six web surfaces onto mobile:

| Tab | Web equivalent | Primary job |
|---|---|---|
| **Home** | `index.html` | Snapshot: progress, happening-soon, shortlist, route preview |
| **Explore** | `festivals.html` + `calendar.html` | Browse/filter the directory; toggle list ⇄ map ⇄ calendar |
| **Route** | `route.html` | Build/reorder the trip, legs, logistics deep links |
| **Journal** | `setkeeper.html` | Log sets, notes, photos; mark attended |
| **More** | `audit.html` + settings | Source audit, backup/restore/reset, diagnostics, packs, about |

Rationale for collapsing Explore: on a phone, the directory, the map, and the
calendar are three *views of the same set of festivals*, so they become a
segmented control inside one tab rather than three destinations.

A persistent **festival detail sheet** (modal bottom sheet) is reachable from
every surface and carries: header (monogram, name, genre, city, tier, season
badge), dates + source-freshness line, ticket/transit advisories, booking deep
links, "add to route / shortlist," "open in calendar," and "journal this."

---

## 5. Feature specifications

### 5.1 Home (snapshot)

- Circuit progress bar (`attended / total`).
- Three stat tiles: Attended, On route, Soon (same metrics as `index.html`).
- "Next up" list: route stops if a route exists, else happening-soon, else
  priority shortlist (same precedence the web home uses).
- A live "guide freshness" footer: last-reviewed date + count of queued source
  rechecks, with a tap-through to More → Audit.
- Pull-to-refresh re-derives season status from the on-device clock (no network
  required).

### 5.2 Explore — list view

- Search by name/local name/city/region.
- Filters: tier (S/A/B), setting, genre, region, season status, attended/
  not-attended, on-route, shortlisted.
- Sort: date (soonest), tier, alphabetical, distance-from-me (needs location).
- Each row: monogram, name, city, tier stamp, season badge, date range,
  shortlist toggle.
- Infinite/virtualized list for smoothness with future-larger datasets.

### 5.3 Explore — map view (mobile-native upgrade)

Replaces the web's static SVG US projection with an interactive vector map:

- Pins colored by festival `color`, clustered at low zoom.
- Tap pin → detail sheet. Long-press → quick add to route/shortlist.
- "Near me" recenters on device location and sorts the list by distance.
- Route overlay: draw the ordered polyline of the active trip on the map.
- **Offline tiles** for the continental US bundled or pre-downloadable, so the
  map works on-site without signal.

### 5.4 Explore — calendar view

- Month grid (port of `calendar.html`) with festival markers on their dates.
- Month jump, search, and "next-confirmed" dates for festivals whose 2026 run
  has passed.
- Tap a day → list of festivals/sessions; tap a session → add to device
  calendar via the OS calendar API (replaces the web `.ics` export) and/or add
  to route.

### 5.5 Route / trip planner

- Ordered, **drag-to-reorder** stop list (parity with web reordering).
- Auto-computed legs between consecutive stops: Haversine distance + rough drive
  time (same approach as `route.html`), shown as leg cards.
- Per-stop and trip-scope notes (scratchpads), with the existing auto-extraction
  of dates/prices from free text.
- **Logistics deep links** (delivers the `features.logisticsLinks` flag that is
  set but unbuilt on web): per stop, open
  - flights → airline/Google Flights search seeded by `booking.airportCode`,
  - lodging → maps/hotels search seeded by `booking.lodgingQuery`,
  - ground → maps directions seeded by `booking.groundQuery`.
- Ticket-strategy badge parsed from `ticketApproach`, with a prominent
  **"Buy from official seller"** link and the standing "verify before booking"
  caution.
- **Trip share** (delivers `features.tripShare`): export the trip as a shareable
  payload (link or file) via the OS share sheet; import via deep link or file →
  writes `sharedTripImports`.

### 5.6 Journal (Setkeeper)

- Log a set: artist, stage, day/time, rating, free-text note.
- **Camera/photo attach** (mobile-only): attach photos to a set or a festival
  memory; stored on device, referenced by the journal entry.
- "Mark attended" promotes a festival into attended history with notes,
  date, and a "best feature" memory (same `visits` meta the web home renders).
- Draft autosave (`setkeeperDraft`) so a half-written entry survives app
  backgrounding.
- Export a session/journal summary via the share sheet.

### 5.7 More — audit & ops

- **Source audit:** per-festival source URL, last-reviewed date, and the review
  queue (festivals needing recheck), mirroring `audit.html` + `SOURCE_AUDIT.md`.
- **Manual verification controls:** let a user resolve a queued recheck locally
  (web "Recommended Next Work" item #3) — mark a festival's source as
  re-verified with today's date.
- **Backup / restore / reset:** export the full `FA:` state to a file; import to
  restore; reset to seed. Same guarantees as the web ops page.
- **Festival packs:** preview/apply the bundled research/outreach packs
  (deep-research, international, outreach) as optional data add-ons, with the
  canonical/non-canonical flag shown.
- **Diagnostics:** storage usage, seed version, last sync, build info.

### 5.8 Settings

- Theme picker — ship **festival-appropriate themes** (desert / forest / urban /
  waterfront) and fix the current `atlas-night` default that falls back to a
  stale MLB theme on web (web priority #1).
- Notification preferences (see §6).
- Units (mi/km), location permission, offline-tile download.
- Privacy: "all data is on this device" statement + one-tap wipe.

---

## 6. Notifications (mobile-native)

All local notifications by default (no server needed); push only if optional
sync (§8) is enabled.

| Trigger | Default | Notes |
|---|---|---|
| Festival on shortlist/route **on-sale or date approaching** | T-30 / T-7 / T-1 days | Derived on device from `dateRange` |
| **Verify-before-booking** nudge | When a stop is added with stale source | Encourages official-source recheck |
| **Route reminder** | Day before each leg's travel | Uses leg start |
| **Journal prompt** | Evening of an attended day | "Log the sets you caught today?" |

Every notification is individually toggleable; the app ships with only
date-approaching reminders on.

---

## 7. Offline & performance

- **Cold start < 1s** to an interactive directory; seed data is bundled, not
  fetched.
- Full feature set works **airplane-mode**, except deep links to external
  sellers/maps and optional sync.
- Offline map tiles for the continental US available as a one-time download.
- Images (monograms generated on device, like web `logos.js`; photos local).
- Service-worker-equivalent caching is unnecessary (native bundle), but the
  seed/pack versioning from the web (`storage.version`) carries over for
  migrations.

---

## 8. Sync (optional, post-v1-capable)

Local-first stays the default. Sync is **opt-in** and additive:

- **v1:** no server. "Sync" = manual export/import (file or QR/deep link) and
  device-to-device trip share. This already covers multi-device for most users.
- **v1.1 (optional):** end-to-end encrypted backup to the user's own cloud
  (iCloud/Drive document) — still no Festival Atlas account.
- **v2 (optional):** lightweight account + conflict-free merge (CRDT or
  last-write-wins per key) for true multi-device sync. Gated behind a clear
  "you don't need this to use the app" framing.

Conflict policy when sync exists: per-key last-write-wins for scalars; union for
sets (shortlist, attended); append-and-dedupe for journal entries.

---

## 9. Migration from the web app

A user who has used the PWA should be able to bring their data:

1. **Export from web:** the existing Audit backup produces a JSON of all `FA:`
   keys.
2. **Import to mobile:** More → Restore reads that JSON, writes the KV mirror,
   and rehydrates SQLite. Because the keys are identical (§3.3), this is a
   structural copy, not a transform.
3. **QR hand-off (nice-to-have):** web page renders the backup as a QR (or
   short-lived link); the app scans/opens it.

Seed data parity is guaranteed by shipping the same `data.js` / `schedule.js`
content compiled into the app bundle.

---

## 10. Privacy, trust & compliance

- **No account, no tracking by default.** No analytics SDK in v1, or a
  privacy-preserving, opt-in, aggregate-only one at most.
- **All personal data on device.** The journal, route, and attended history
  never leave the phone unless the user explicitly shares/backs up.
- **Source honesty:** dates and prices are labeled with their last-reviewed date
  and an explicit "verify with the official source before booking" line,
  carried from the web product's source policy (`SOURCE_AUDIT.md`,
  `PRODUCTION_READINESS.md`).
- **Deep links, not scraping:** ticket/flight/hotel links go to official/first-
  party search; the app transacts nothing.
- Store-compliance: clear data-use disclosure, no background location, camera/
  location/notifications all just-in-time permission-prompted with rationale.

---

## 11. Known gaps carried from the web app

These are tracked so the mobile build doesn't silently inherit them:

1. **MLB-era field names** (`team`=genre, `roof`=setting, `parks`=festivals,
   `scorekeeperContext`). The mobile schema documents the festival meaning; a
   rename pass should land in the shared core to make both apps legible.
2. **US-centric map projection.** The mobile vector map removes this limit, but
   the *seed* is US festivals; international packs must add `dateRange` and valid
   coordinates before they're shippable defaults.
3. **Theme registry still MLB-branded** with a broken `atlas-night` default.
   Mobile must ship real festival themes (§5.8) rather than port the registry.
4. **Festival dates as prose.** Several festivals describe timing in `note`
   rather than a structured `dateRange`. Calendar/notifications need structured
   dates; backfill is a data task, not an app task.

---

## 12. Release plan

| Milestone | Contents | Exit criteria |
|---|---|---|
| **M0 — Foundations** | RN/Expo shell, SQLite + KV layer, port seed (`data.js`/`schedule.js`/`logos.js`), import web backup | Directory browsable offline; web backup imports cleanly |
| **M1 — Explore** | List + filters + detail sheet + calendar view | Parity with `festivals.html` + `calendar.html` |
| **M2 — Map** | Vector map, clustering, near-me, offline tiles, route overlay | Map usable airplane-mode for continental US |
| **M3 — Route** | Reorderable stops, legs, logistics deep links, trip share | Delivers `logisticsLinks` + `tripShare` flags |
| **M4 — Journal** | Set logging, photo attach, attended history, drafts | Parity with `setkeeper.html` + camera |
| **M5 — Ops & polish** | Audit/source queue, backup/restore/reset, packs, themes, notifications, a11y | `validate`-equivalent smoke gate green; store submission |

Each milestone keeps the app shippable as a TestFlight/internal track build.

---

## 13. Acceptance criteria (v1 definition of done)

- Installs and runs fully offline with the seeded 43-festival directory.
- All six web surfaces have a mobile equivalent (§4 mapping).
- A web-app backup imports without data loss.
- Map, location, notifications, camera, share, and calendar integrations work on
  both iOS and Android with just-in-time permissions.
- Logistics and trip-share features (the two unbuilt web flags) are functional.
- No data leaves the device without an explicit user action.
- Every surfaced date/price shows its freshness and a verify-before-booking
  caution.

---

## 14. Open questions

1. **International:** ship US-only at launch, or include the international pack as
   an opt-in download? (Affects map tiles + seed QA.)
2. **Sync ambition:** is manual export/share enough for v1, or is E2E cloud
   backup required at launch?
3. **Monetization/distribution:** free, paid, or free with an optional supporter
   tier? Influences account/entitlement design.
4. **Brand assets:** stay with generated monograms, or source licensed festival
   art where rights are clear?
