# Festival Atlas — Mobile

React Native + Expo implementation of [`MOBILE_APP_SPEC.md`](../MOBILE_APP_SPEC.md).
Local-first, no account: the device is the source of truth.

## Quick start

```bash
cd mobile
npm install
npm run seed     # regenerate the bundled festival seed from ../data.js + ../schedule.js
npm run typecheck
npm run lint     # eslint via expo lint (config in .eslintrc.js, deps are pinned)
npm test         # plain-node smoke test: seed invariants + seed drift check
npm start        # Expo dev server (press i / a for iOS / Android)
```

## What's implemented (M0–M4 of the spec)

- **Seed pipeline** — `scripts/generate-seed.cjs` extracts the canonical
  43-festival dataset + 2026 schedule from the web app so the data never drifts.
- **Local-first store** — `src/store/` persists user state to AsyncStorage under
  the same `FA:` keys the web app uses, so a web backup imports unchanged.
- **Season engine** — `src/lib/season.ts` is a verbatim port of the web
  `getFestivalGuideMeta` logic (happening-now/soon/upcoming/past, source
  freshness, planning status).
- **Five tabs** — Home (snapshot + progress), Explore (search/filter + map),
  Route (reorderable stops + leg distances + trip notes + share/export),
  Journal (set logging + photos), More (reminders, audit queue,
  backup/restore/reset, about).
- **Festival detail modal** — `app/festival/[id].tsx` with logistics deep links
  (flights/lodging/ground/directions — delivers the web `logisticsLinks` flag),
  official-seller link, sessions with **add-to-device-calendar**, and
  source-freshness with the verify-before-booking guardrail.
- **Interactive map (M2)** — `src/components/FestivalMap.tsx` (`react-native-maps`):
  colored pins, route polyline overlay, tap-to-detail, and a **near-me** control
  (`expo-location`) that recenters the map and distance-sorts the list.
- **Camera journal (M4)** — `expo-image-picker` attaches camera/library photos to
  set entries; thumbnails render in the form and the log.
- **Local reminders (M4)** — `src/lib/notifications.ts` (`expo-notifications`)
  schedules on-device T-7 / T-1 alerts for shortlisted + routed festivals;
  toggle and re-sync in the **More** tab.
- **Share + calendar (M3/M4)** — trip summary via the OS share sheet, trip and
  full-backup `.json` export (`expo-sharing`), and device-calendar events for a
  festival's sessions (`expo-calendar`).

## Permissions

Declared in `app.json`: location (map/near-me), camera + photo library (journal),
calendar (sessions), and notifications (reminders). All are requested
just-in-time at first use, never up front.

## Still ahead

Offline **vector** map tiles for true no-signal use on-site (current map needs a
connection for tiles), shortlist/route auto-scheduling of reminders on change
(today it's a manual sync in **More**), and import of a shared trip file via deep
link. The data, permission, and link layers for these are already in place.

## Regenerating the seed

The festival data is generated, not hand-edited. After changing `../data.js` or
`../schedule.js`, run `npm run seed` and commit the updated
`src/data/festivals.json` / `src/data/schedule.json`. `npm test` fails if the
committed seed drifts from the web canon.

## Release path

Builds and store submission go through [EAS](https://docs.expo.dev/eas/)
(`eas.json`: `development`, `preview`, and `production` profiles; production
auto-increments build numbers from the local `app.json` baseline —
`ios.buildNumber` / `android.versionCode`, runtime version follows the
`appVersion` policy):

```bash
npx eas-cli login             # one-time
npm run build:preview         # internal-distribution build for device testing
npm run build:production      # store build
npm run submit                # submit the production build to the stores
```

CI (`.github/workflows/validate.yml`) runs `typecheck`, `lint`, and the smoke
test on every push and pull request. There is no store listing yet: the app is
pre-release, and `preview` builds are the current distribution channel.
