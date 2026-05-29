# Festival Atlas Production Readiness

Status date: 2026-05-29

## Release Checklist

1. Run `npm run validate`.
2. Review `git status --short` and confirm only intended source, docs, shared core files, and legacy asset removals are present.
3. Commit the release-ready changes.
4. Deploy to the configured static host.
5. Open the deployed `index.html`, `festivals.html`, `calendar.html`, `route.html`, `audit.html`, and `setkeeper.html`.
6. Hard refresh once after deploy so the `festival-atlas-v5` service worker cache activates.

Latest deployed smoke: pass on 2026-05-29 at `https://davehomeassist.github.io/festival-atlas/`.

## Production Controls

`audit.html` is the operations surface:

1. Source audit table
2. Backup export
3. Backup restore
4. Local data reset
5. Diagnostic JSON download
6. Festival pack import
7. Built-in Summer 2026 outreach pack import

Backups include route, visits, notes, shortlist, Setkeeper context, journal drafts, attended history, theme, imported ops intelligence, and the current seeded catalog snapshot.

Festival packs accept JSON shaped like:

```json
{
  "festivals": [
    {
      "id": "example-fest",
      "name": "Example Fest",
      "city": "Austin, TX",
      "team": "Indie",
      "sessions": [
        { "date": "2026-10-03", "label": "Festival Day 1" }
      ]
    }
  ]
}
```

Festival packs may also include an `ops` object with public outreach fields such as venue, organizer, contact path, production notes, event hours, market window, opportunity signals, watch items, ticket URL, and source links. Imported ops fields merge onto existing seeded festivals without replacing canonical date/source records unless a pack explicitly requests schedule overwrite.

## Source Policy

`SOURCE_AUDIT.md` is the durable source ledger. Current rules:

1. Official festival pages are preferred.
2. Civic/transit/event-host pages can support date verification when the official site is not accessible in text.
3. `next-confirmed` means the official source now points beyond the 2026 season.
4. Any stale or ambiguous festival must remain visible in `audit.html` as a review item.

## Privacy

Festival Atlas is local-first. User route, journal, attended history, and backup data stay in browser localStorage unless the user exports a backup file. External links open official festival, map, flight, lodging, or transit searches.

## Known Constraints

1. No server-side account sync.
2. No live lineup/feed API.
3. Imported backup and festival-pack files are trusted user files and validated only for the expected Festival Atlas shapes.
4. Real festival brand images are intentionally not bundled unless rights/source are clear.
