# Festival Atlas — Mobile

React Native + Expo implementation of [`MOBILE_APP_SPEC.md`](../MOBILE_APP_SPEC.md).
Local-first, no account: the device is the source of truth.

## Quick start

```bash
cd mobile
npm install
npm run seed     # regenerate the bundled festival seed from ../data.js + ../schedule.js
npm run typecheck
npm start        # Expo dev server (press i / a for iOS / Android)
```

## What's implemented (M0–M3 of the spec)

- **Seed pipeline** — `scripts/generate-seed.cjs` extracts the canonical
  43-festival dataset + 2026 schedule from the web app so the data never drifts.
- **Local-first store** — `src/store/` persists user state to AsyncStorage under
  the same `FA:` keys the web app uses, so a web backup imports unchanged
  (export / restore / reset in the **More** tab).
- **Season engine** — `src/lib/season.ts` is a verbatim port of the web
  `getFestivalGuideMeta` logic (happening-now/soon/upcoming/past, source
  freshness, planning status).
- **Five tabs** — Home (snapshot + progress), Explore (search/filter directory),
  Route (reorderable stops + leg distances + trip notes), Journal (set logging),
  More (audit queue, backup/restore/reset, about).
- **Festival detail modal** — `app/festival/[id].tsx` with logistics deep links
  (flights/lodging/ground/directions — delivers the web `logisticsLinks` flag),
  official-seller link, sessions, and source-freshness with the
  verify-before-booking guardrail.

## Not yet wired (later milestones)

Interactive offline vector map (M2), camera-attached journal photos and local
push reminders (M4), OS share-sheet trip export and `.ics`/device-calendar
integration (M3/M4). These are scaffolded conceptually in the spec; the data and
links layers they depend on are already in place.

## Regenerating the seed

The festival data is generated, not hand-edited. After changing `../data.js` or
`../schedule.js`, run `npm run seed` and commit the updated
`src/data/festivals.json` / `src/data/schedule.json`.
