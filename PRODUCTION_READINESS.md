# Festival Atlas Production Readiness

Status date: 2026-05-30

## Release Checklist

1. Run `node scripts/validate-production.js --strict-freshness`. For a release cut this must pass with zero stale sources; plain `npm run validate` only warns on sources outside the 45-day review window.
2. Review `git status --short` and confirm only intended source, docs, shared core files, and legacy asset removals are present.
3. Commit the release-ready changes.
4. Deploy to the configured static host.
5. Open the deployed `index.html`, `festivals.html`, `calendar.html`, `route.html`, `audit.html`, and `setkeeper.html`.
6. Hard refresh once after deploy so the `festival-atlas-v9` service worker cache activates.

Latest deployed smoke: pass on 2026-05-29 at `https://davehomeassist.github.io/festival-atlas/`.
Latest local validation: pass on 2026-05-30 with domestic and international ChatGPT Deep Research pack import coverage.

## Production Controls

`audit.html` is the operations surface:

1. Source audit table
2. Backup export
3. Backup restore
4. Local data reset
5. Diagnostic JSON download
6. Festival pack preview with created, merged, schedule-write, score, and verification counts
7. Explicit apply step for previewed festival packs
8. Built-in Summer 2026 outreach pack preview
9. Built-in ChatGPT Deep Research Summer Music Festivals 2026 pack preview
10. Built-in ChatGPT Deep Research International Summer Festivals 2026 pack preview
11. Source verification queue ranked by ops opportunity score

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

Festival packs may also include an `ops` object with public outreach fields such as venue, organizer, contact path, production notes, event hours, market window, opportunity signals, watch items, ticket URL, and source links. Imported ops fields merge onto existing seeded festivals without replacing canonical date/source records unless a pack explicitly requests schedule overwrite. The audit page previews those changes before import and flags only records that are explicitly non-canonical.

The ChatGPT Deep Research Summer Music Festivals 2026 pack is canonical app data. It auto-loads as baseline app data, imports 36 research rows captured in Notion, merges 13 seeded festivals by stable IDs, creates 23 missing festivals, writes 74 custom schedule sessions for new rows, and does not add Deep Research rows to the source verification queue.

The ChatGPT Deep Research International Summer Festivals 2026 pack is canonical app data. It auto-loads as baseline app data, imports 29 international rows from the local Markdown report, creates 105 custom schedule sessions, preserves non-contiguous weekend splits such as Tomorrowland, Rock in Japan, and Rock in Rio as separate entries, and does not add those rows to the source verification queue. The current canonical Festival Atlas baseline is 95 festivals: 43 built-in seeds, 23 net-new domestic Deep Research festivals, and 29 international Deep Research festivals.

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
