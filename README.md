# Festival Atlas

A local-first static web app for browsing music festivals, planning a multi-stop festival route, and tracking which sets you actually attended — plus a React Native companion app under `mobile/`.

## What's here

| Path | What it is |
|---|---|
| `index.html` | Dashboard — progress, happening-soon picks, shortlist, route context |
| `festivals.html` | Festival explorer — filters, source status, review scope, detail panel, route actions |
| `calendar.html` | Month calendar — search, month jump, stats, route stops, next-confirmed dates |
| `route.html` | Route board — reorderable stops, trip notes, source links, travel-leg planning |
| `setkeeper.html` | Setkeeper journal — attended history, standout sets, session export |
| `audit.html` | Ops surface — source audit, verification queue, backup/restore/reset, diagnostics, pack import |
| `data.js` / `schedule.js` | Seeded festival dataset and 2026 session data |
| `deep-research-pack.js`, `international-research-pack.js`, `outreach-pack.js` | Built-in canonical data packs (domestic, international, outreach) that auto-load as baseline app data |
| `shared/js/core/` | Shared config, storage, context-store, notes, visits, device, and utils modules used by every page |
| `shared.css` | Shared design tokens and shell styles |
| `sw.js`, `manifest.json`, `icons/`, `fonts/` | PWA service worker, manifest, and install/icon assets |
| `mobile/` | React Native + Expo companion app — see `mobile/README.md` |
| `scripts/validate-production.js` | Production smoke validation, run via `npm run validate` |
| `archives/` | Retired legacy assets (e.g. pre-fork media) kept for reference, not shipped |
| `SOURCE_AUDIT.md`, `PRODUCTION_READINESS.md`, `VALIDATION_MATRIX.md`, `MOBILE_APP_SPEC.md`, `HANDOFF.md`, `CLAUDE.md` | Project docs: source ledger, release checklist, validation matrix, mobile spec, handoff notes, and agent working notes |

## Commands

The web app has no build step — open `index.html` directly in a browser, or serve the repo root with any static file server.

```bash
npm install                     # installs Playwright, the only validation dependency
npx playwright install chromium # one-time browser download for the validation script
npm run validate                # runs scripts/validate-production.js production smoke checks
```

Functional checks run against a clock pinned to the last verified-green review
epoch so they stay deterministic; real-world source freshness is reported at the
end of the run as a warning when festival sources fall outside the 45-day
review window. Pass `--strict-freshness` (`node scripts/validate-production.js
--strict-freshness`) to fail the run on stale sources, e.g. before a release
cut.

For the mobile app:

```bash
cd mobile
npm install
npm start          # Expo dev server
```

See `mobile/README.md` for the full mobile command set (seed generation, typecheck, etc.).

## Conventions

- **Local-first, no backend.** All user state — route, shortlist, journal entries, attended history, backups — lives in browser `localStorage` under the namespace defined in `shared/js/core/storage.js`. There is no account sync; users export/import a JSON backup instead.
- **Shared GitHub Pages origin — the `FA:` prefix is not a security boundary.** The deployed app lives at `https://davehomeassist.github.io/festival-atlas/`, and every path-based project under `davehomeassist.github.io` shares that one browser origin, so JavaScript from any sibling Pages project can read, overwrite, or erase Festival Atlas `localStorage` data; the prefix only prevents accidental key collisions. Treat exported JSON backups as the durable copy (the audit ops page shows this notice when running on a `*.github.io` host). True isolation requires serving the app from its own origin — a dedicated custom domain on the Pages site. The mobile app's AsyncStorage is sandboxed per app and unaffected.
- **Seeded packs are canonical, not live data.** `deep-research-pack.js`, `international-research-pack.js`, and `outreach-pack.js` are treated as trusted baseline data and auto-load on startup — they are not fetched from a live festival API. See `PRODUCTION_READINESS.md` for the exact merge/creation counts each pack contributes.
- **Mobile data is generated, never hand-edited.** After changing `data.js` or `schedule.js`, run `npm run seed` inside `mobile/` to regenerate `mobile/src/data/festivals.json` / `schedule.json` so the two apps never drift apart.
