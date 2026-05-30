(function attachDeepResearchPack(global) {
  "use strict";

  var namespace = global.FA = global.FA || {};
  var REVIEWED_ON = "2026-05-30";
  var PACK_ID = "chatgpt-deep-research-summer-music-festivals-2026";
  var SOURCE_NOTE = "Canonical 2026 festival record imported from a ChatGPT Deep Research query captured in Notion.";

  function parseIso(value) {
    var parts = String(value || "").split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2] || 1, 12);
  }

  function iso(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  function slug(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeName(value) {
    return String(value || "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripMarkdown(value) {
    return String(value || "")
      .replace(/\*\*/g, "")
      .replace(/\[([^\]]+)\]\(mailto:([^)]+)\)/g, "$2")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .trim();
  }

  function sessionsForRange(start, end) {
    var weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var sessions = [];
    var cursor = parseIso(start);
    var last = parseIso(end || start);
    var day = 1;

    while (cursor <= last) {
      sessions.push({
        y: weekdays[cursor.getDay()],
        d: iso(cursor),
        t: null,
        o: null,
        s: "Festival Day " + day
      });
      cursor.setDate(cursor.getDate() + 1);
      day += 1;
    }

    return sessions;
  }

  function settingFromModel(model) {
    if (model === "Camping / Destination") return "Camping";
    if (model === "Boardwalk / Beach") return "Waterfront";
    if (model === "Multi-Venue / Citywide") return "Mixed";
    return "Urban";
  }

  function tierFromModel(model, notes) {
    var text = (String(model || "") + " " + String(notes || "")).toLowerCase();
    if (text.indexOf("100+ artists") >= 0 || text.indexOf("600 artists") >= 0 || text.indexOf("700-acre") >= 0) return "S";
    if (text.indexOf("multi-venue") >= 0 || text.indexOf("citywide") >= 0 || text.indexOf("stadium") >= 0 || text.indexOf("broadcast") >= 0) return "A";
    return "B";
  }

  function colorForRegion(region) {
    return {
      Northeast: "#2563EB",
      Southeast: "#D97706",
      Midwest: "#0891B2",
      South: "#A855F7",
      West: "#16A34A"
    }[region] || "#475569";
  }

  function buildEvent(row) {
    var name = normalizeName(row.name);
    var notes = stripMarkdown(row.notes);
    var contact = stripMarkdown(row.contact);
    var model = row.model || "Urban Park Mega-Fest";

    return {
      id: row.id || slug(name),
      name: name,
      team: (row.genre || []).join(" - ") || "Music Festival",
      city: row.city + ", " + row.state,
      roof: settingFromModel(model),
      tier: tierFromModel(model, notes),
      color: colorForRegion(row.region),
      note: notes || "ChatGPT Deep Research festival row.",
      ticketApproach: "Use the ticketing and sale-status details captured in the canonical Deep Research record.",
      transitNote: "Use the venue access, parking, rideshare, lodging, and site-rule details captured in the canonical Deep Research record.",
      coordinates: row.lat && row.lng ? { lat: row.lat, lng: row.lng } : undefined,
      specialEvents: [
        model,
        row.venue,
        row.region,
        (row.genre || []).join(" / "),
        row.status
      ].filter(Boolean).slice(0, 5),
      searchMeta: {
        localName: name,
        region: row.region
      },
      officialUrl: row.url,
      lastReviewed: REVIEWED_ON,
      sourceNote: SOURCE_NOTE,
      dateConfidence: "canonical",
      ops: {
        packId: PACK_ID,
        status: "Canonical ChatGPT Deep Research record",
        region: row.region,
        venue: row.venue,
        organizer: stripMarkdown(row.organizer),
        headliners: stripMarkdown(row.artists),
        publicContact: contact === "unspecified" ? "" : contact,
        productionNotes: notes,
        opsModel: model,
        marketWindow: row.start ? row.start.slice(0, 7) : "",
        outreachPriority: row.status === "Confirmed" ? "Medium-high" : "Medium",
        opportunitySignals: [
          model,
          row.venue,
          row.region,
          row.status,
          row.artists && row.artists !== "unspecified" ? "Lineup signal captured" : ""
        ].filter(Boolean).slice(0, 8),
        watchItems: [
          row.contact === "unspecified" ? "Find public contact path" : "",
          row.artists === "unspecified" ? "Lineup details not captured" : ""
        ].filter(Boolean),
        sources: [
          { label: "Canonical ChatGPT Deep Research row", url: row.url }
        ]
      },
      sessions: sessionsForRange(row.start, row.end)
    };
  }

  var ROWS = [
    { name: "Mountain Music Festival", city: "Oak Hill", state: "WV", region: "Southeast", start: "2026-06-04", end: "2026-06-06", genre: ["Rock", "Folk/Americana"], model: "Camping / Destination", venue: "ACE Adventure Resort", organizer: "unspecified", contact: "unspecified", artists: "Andy Frasco & The U.N.; The Floozies; Melvin Seals and JGB", notes: "Mountaintop camping festival combining music, art, and adventure. Confidence: High.", lat: 38.0668, lng: -81.0857, status: "Confirmed", url: "https://www.notion.so/79b3564b07574d71a9c63f9f0f37fb74" },
    { name: "CMA Fest", id: "cma-fest", city: "Nashville", state: "TN", region: "Southeast", start: "2026-06-04", end: "2026-06-07", genre: ["Country"], model: "Multi-Venue / Citywide", venue: "Nissan Stadium + downtown daytime stages", organizer: "Country Music Association (CMA)", contact: "", artists: "Bailey Zimmerman, Blake Shelton, Jason Aldean, Keith Urban, Lainey Wilson, Luke Bryan, Tim McGraw, The Band Perry", notes: "Multi-site footprint: Nissan Stadium night shows, Fan Fair X, free daytime stages; citywide ops-heavy", lat: 36.16792, lng: -86.77798, status: "Confirmed", url: "https://www.notion.so/deef3eea5433460d95905ef51de6ed66" },
    { name: "Carolina Country Music Fest", id: "carolina-country-music-fest", city: "Myrtle Beach", state: "SC", region: "Southeast", start: "2026-06-04", end: "2026-06-07", genre: ["Country"], model: "Boardwalk / Beach", venue: "Downtown / beachfront footprint", organizer: "", contact: "", artists: "Post Malone, Luke Bryan, Blake Shelton, Riley Green (40+ artists)", notes: "2026 promo calls out five stages and beachside setup; daily schedule/stage assignments via app", lat: 33.69372, lng: -78.88231, status: "Confirmed", url: "https://www.notion.so/58c1c7c3fbfc4f05a3227c2e258b2c32" },
    { name: "Governors Ball", id: "governors-ball", city: "Queens", state: "NY", region: "Northeast", start: "2026-06-05", end: "2026-06-07", genre: ["Multigenre", "Pop", "Hip-Hop"], model: "Urban Park Mega-Fest", venue: "Flushing Meadows Corona Park", organizer: "Founders Entertainment", contact: "partners@govball.com", artists: "Lorde, Stray Kids, ASAP Rocky (60+ artists, 3 stages)", notes: "Advanced hospitality: VIP, GA+, private suites, cabanas, wristbands, lockers, hotel packages, Queens Night Market food tie-ins", lat: 40.74612, lng: -73.85279, status: "Confirmed", url: "https://www.notion.so/28483e10d7e141eea26193613ad8b6d8" },
    { name: "Bonnaroo", id: "bonnaroo", city: "Manchester", state: "TN", region: "Southeast", start: "2026-06-11", end: "2026-06-14", genre: ["Multigenre"], model: "Camping / Destination", venue: "The Farm / Great Stage Park", organizer: "", contact: "", artists: "The Strokes, RUFUS DU SOL, Noah Kahan, Skrillex", notes: "700-acre farm, camping, lockers, hotels, maps; major temporary-site infrastructure and guest-services complexity", lat: 35.47597, lng: -86.08069, status: "Confirmed", url: "https://www.notion.so/6038f636a2374437a19f7793f1784a06" },
    { name: "Nelsonville Music Festival", city: "Nelsonville", state: "OH", region: "Midwest", start: "2026-06-18", end: "2026-06-20", genre: ["Indie/Alt", "Folk/Americana"], model: "Camping / Destination", venue: "Snow Fork Event Center", organizer: "Stuart's Opera House", contact: "info@nelsonvillefest.org; 740-753-1924; volunteer/press/art-vendor contacts", artists: "Geese; Wednesday; Big Freedia; Marcus King Band; Gillian Welch & David Rawlings", notes: "Intimate 3-day, multi-stage festival with camping, artisan vendors, family programming. Confidence: High.", lat: 39.45774, lng: -82.22927, status: "Confirmed", url: "https://www.notion.so/54691f58a4d14fc9aef075cf29c6d9f8" },
    { name: "Green River Festival", city: "Greenfield", state: "MA", region: "Northeast", start: "2026-06-19", end: "2026-06-21", genre: ["Folk/Americana", "Indie/Alt"], model: "Camping / Destination", venue: "Franklin County Fairgrounds", organizer: "unspecified", contact: "Makers Market vendor channel", artists: "Charley Crockett; Spoon; Geese; The Beths; Kurt Vile & the Violators; Lucius", notes: "Gates and music hours published. Camping/hotel/vendor infrastructure live. Confidence: High.", lat: 42.58014, lng: -72.61039, status: "Confirmed", url: "https://www.notion.so/b26d60a4544c4e51af545732cd314952" },
    { name: "Northlands Music & Arts Festival", city: "Swanzey", state: "NH", region: "Northeast", start: "2026-06-19", end: "2026-06-21", genre: ["Rock", "Folk/Americana"], model: "Camping / Destination", venue: "Cheshire Fairgrounds", organizer: "Northlands Live LLC", contact: "info@northlandslive.com", artists: "Joe Russo's Almost Dead; Dirty Heads; The Disco Biscuits; Dogs in a Pile; Lotus", notes: "3 days, 3 stages, camping, VIP viewing, campground stage. Confidence: High.", lat: 42.89636, lng: -72.24978, status: "Confirmed", url: "https://www.notion.so/6e32a4b622c34ff0b3482e1fb9136d02" },
    { name: "Summerfest", id: "summerfest", city: "Milwaukee", state: "WI", region: "Midwest", start: "2026-06-18", end: "2026-07-04", genre: ["Multigenre"], model: "Urban Park Mega-Fest", venue: "Henry Maier Festival Park", organizer: "Milwaukee World Festival, Inc.", contact: "", artists: "Garth Brooks (amphitheater kickoff); 600 artists across 12 stages", notes: "Clearest public production profile in the set: amphitheater ticketing, BMO Pavilion reserved seats, pit wristbands, premium decks, 6+ separate amphitheater nights", lat: 43.04223, lng: -87.9069, status: "Confirmed", url: "https://www.notion.so/336dd6a0ee3448ac966594608e304028" },
    { name: "ROMP Festival", city: "Owensboro", state: "KY", region: "South", start: "2026-06-24", end: "2026-06-27", genre: ["Folk/Americana"], model: "Civic / Nonprofit", venue: "Yellow Creek Park", organizer: "Bluegrass Music Hall of Fame & Museum", contact: "Museum contact channels (public)", artists: "I'm With Her; Marty Stuart; Del McCoury; Punch Brothers; Ricky Skaggs; The Infamous Stringdusters", notes: "4-day camping-friendly fundraiser with workshops and family programming. Confidence: High.", lat: 37.799, lng: -86.981, status: "Confirmed", url: "https://www.notion.so/ecc20de5ce6d4e35bc8085dfc819f4a0" },
    { name: "Blue Ox Music Festival", city: "Eau Claire", state: "WI", region: "Midwest", start: "2026-06-25", end: "2026-06-27", genre: ["Folk/Americana"], model: "Camping / Destination", venue: "The Pines Music Park", organizer: "unspecified", contact: "715-602-4440", artists: "Charley Crockett; Marcus King Band; The Dead South; Kurt Vile & the Violators; I'm With Her", notes: "3-day Pines Music Park camping-style format. Confidence: High.", lat: 44.728, lng: -91.4327, status: "Confirmed", url: "https://www.notion.so/be686d7651524429a8b7c234b1ec5602" },
    { name: "Solid Sound Festival", city: "North Adams", state: "MA", region: "Northeast", start: "2026-06-26", end: "2026-06-28", genre: ["Indie/Alt", "Rock"], model: "Civic / Nonprofit", venue: "MASS MoCA", organizer: "Conceived by Wilco; co-produced by Higher Ground Presents", contact: "unspecified", artists: "Wilco; Billy Bragg; The Breeders; Gang of Four; Jeff Tweedy & Friends", notes: "Museum-campus format. Arts/comedy programming; dorm/campus lodging. Sold out per official site. Confidence: High.", lat: 42.7, lng: -73.1158, status: "Confirmed", url: "https://www.notion.so/420aff23bd674fa49805bbd8547b7a21" },
    { name: "Day Trip Festival", city: "Long Beach", state: "CA", region: "West", start: "2026-06-27", end: "2026-06-28", genre: ["Electronic", "EDM"], model: "Urban Park Mega-Fest", venue: "Queen Mary Waterfront", organizer: "unspecified", contact: "partnerships@insomniac.com; public vendor form", artists: "unspecified", notes: "Event hours 1 PM-12 AM. Multi-stage waterfront with activations and VIP zones. Confidence: Medium (lineup unpublished).", lat: 33.7528, lng: -118.1903, status: "Confirmed", url: "https://www.notion.so/d61d23d29a1740b694583d354d389787" },
    { name: "High Sierra Music Festival", city: "Grass Valley", state: "CA", region: "West", start: "2026-07-02", end: "2026-07-05", genre: ["Rock", "Folk/Americana"], model: "Camping / Destination", venue: "Nevada County Fairgrounds", organizer: "High Sierra Music Festival", contact: "info@highsierramusic.com; vendor and volunteer forms", artists: "Steel Pulse; The Word; Dumpstaphunk; Cymande; Karl Denson's Tiny Universe; Eggy", notes: "Est. attendance under 7,500. Late-night shows, playshops, silent disco, family village, parades. Confidence: High.", lat: 39.1898, lng: -121.0488, status: "Confirmed", url: "https://www.notion.so/5b42fa39af334c24aab43599d02504a0" },
    { name: "ESSENCE Festival of Culture", id: "essence-festival-of-culture", city: "New Orleans", state: "LA", region: "South", start: "2026-07-03", end: "2026-07-05", genre: ["Culture", "Hip-Hop"], model: "Multi-Venue / Citywide", venue: "Citywide + evening concert series", organizer: "ESSENCE", contact: "", artists: "Cardi B, Kehlani, Babyface, Brandy & Monica, Public Enemy", notes: "20+ curated experiences (music, art, wellness, style, cuisine, commerce); festival campus + cultural summit", lat: 29.9537, lng: -90.07775, status: "Confirmed", url: "https://www.notion.so/e933aa3b523449a88517aebdc826091d" },
    { name: "Rock Fest", city: "Cadott", state: "WI", region: "Midwest", start: "2026-07-16", end: "2026-07-18", genre: ["Rock"], model: "Camping / Destination", venue: "Festival grounds in Cadott", organizer: "Fest Valley Events", contact: "info@rock-fest.com; 715-289-4401", artists: "unspecified", notes: "Large camping-rock format. Lineup accessible but not text-parsed in official snippet. Confidence: Medium.", lat: 44.9489, lng: -91.1496, status: "Confirmed", url: "https://www.notion.so/120ec57b7f5f4712b73f993e0925a81a" },
    { name: "Upheaval Festival", city: "Grand Rapids", state: "MI", region: "Midwest", start: "2026-07-17", end: "2026-07-18", genre: ["Rock"], model: "Urban Park Mega-Fest", venue: "Belknap Park", organizer: "unspecified", contact: "unspecified", artists: "Papa Roach; Gojira; Normundy", notes: "Largest outdoor multi-day rock festival in West Michigan per official branding. Load-in unspecified. Confidence: Medium.", lat: 42.9786, lng: -85.6681, status: "Confirmed", url: "https://www.notion.so/01c0209dcdfe4f6db5d44c82e056886a" },
    { name: "Inkcarceration", city: "Mansfield", state: "OH", region: "Midwest", start: "2026-07-17", end: "2026-07-19", genre: ["Rock"], model: "Camping / Destination", venue: "Ohio State Reformatory grounds", organizer: "unspecified", contact: "unspecified", artists: "Disturbed; Bad Omens; Limp Bizkit; Papa Roach; Gojira", notes: "Three-day prison-site rock festival. 65+ bands plus tattoo/haunted attractions. Confidence: High (secondary lineup support).", lat: 40.7956, lng: -82.5026, status: "Confirmed", url: "https://www.notion.so/ccdf2010bdbb4adda397de7d1405ba50" },
    { name: "Grey Fox Bluegrass Festival", city: "Oak Hill", state: "NY", region: "Northeast", start: "2026-07-15", end: "2026-07-19", genre: ["Folk/Americana"], model: "Camping / Destination", venue: "Walsh Farm", organizer: "unspecified", contact: "Lisa Husted contact and festival phone numbers", artists: "AJ Lee; Rhiannon Giddens and the Old Time Revue; Del McCoury Band; The Infamous Stringdusters", notes: "High Meadow Stage schedule and camping-oriented festival services public. Confidence: High.", lat: 42.3868, lng: -74.119, status: "Confirmed", url: "https://www.notion.so/5f4c30d6cc3044df9635e213bce3a87f" },
    { name: "Newport Folk Festival", id: "newport-folk-festival", city: "Newport", state: "RI", region: "Northeast", start: "2026-07-24", end: "2026-07-26", genre: ["Folk/Americana"], model: "Civic / Nonprofit", venue: "Fort Adams State Park", organizer: "Newport Festivals Foundation", contact: "", artists: "Hayley Williams, Ms. Lauryn Hill, Courtney Barnett", notes: "No on-site camping, no re-entry; nonprofit producer, destination lodging pressure; premium guest-ops target", lat: 41.47912, lng: -71.33578, status: "Confirmed", url: "https://www.notion.so/45427cf9c9144a23a59ad8576aaf8f39" },
    { name: "Newport Jazz Festival", id: "newport-jazz-festival", city: "Newport", state: "RI", region: "Northeast", start: "2026-07-31", end: "2026-08-02", genre: ["Jazz"], model: "Civic / Nonprofit", venue: "Fort Adams State Park", organizer: "Newport Festivals Foundation", contact: "", artists: "Herbie Hancock, Kamasi Washington, Jon Batiste, Vulfpeck", notes: "Daily schedules due July; core site footprint and travel rules mirror Newport Folk; heritage-jazz target with destination draw", lat: 41.47912, lng: -71.33578, status: "Confirmed", url: "https://www.notion.so/1713ed3007a9476a8e2de5c81eda3c27" },
    { name: "Lollapalooza", id: "lollapalooza", city: "Chicago", state: "IL", region: "Midwest", start: "2026-07-30", end: "2026-08-02", genre: ["Multigenre", "Pop", "Rock"], model: "Urban Park Mega-Fest", venue: "Grant Park", organizer: "C3 Presents", contact: "press@c3presents.com", artists: "Charli XCX, Lorde, Tate McRae, JENNIE, John Summit, The Smashing Pumpkins, The xx, Olivia Dean", notes: "100+ artists across eight stages, aftershows, major economic footprint; sponsor-rich, broadcast-friendly park build", lat: 41.88396, lng: -87.61887, status: "Confirmed", url: "https://www.notion.so/2d68e66a96fb45aea4b44a4169da6df5" },
    { name: "HARD Summer", id: "hard-summer", city: "Inglewood", state: "CA", region: "West", start: "2026-08-01", end: "2026-08-02", genre: ["EDM", "Hip-Hop"], model: "Urban Park Mega-Fest", venue: "Hollywood Park (adjacent to SoFi Stadium)", organizer: "Insomniac", contact: "partnerships@insomniac.com", artists: "Feid, Gesaffelstein, Four Tet, Dom Dolla, Kaytranada", notes: "Festival hours 2:00 PM-10:00 PM both days; Hollywood Park + Insomniac sponsor/vendor infrastructure; clean public-entry EDM opportunity", lat: 33.96178, lng: -118.35653, status: "Confirmed", url: "https://www.notion.so/57b5ac9fc5c24b269da4817184288f30" },
    { name: "Outside Lands", id: "outside-lands", city: "San Francisco", state: "CA", region: "West", start: "2026-08-07", end: "2026-08-09", genre: ["Multigenre"], model: "Urban Park Mega-Fest", venue: "Golden Gate Park", organizer: "", contact: "sponsor@sfoutsidelands.com, press@sfoutsidelands.com, access@sfoutsidelands.com", artists: "Charli XCX, Tyler, The Creator, Hozier, RUFUS DU SOL", notes: "Unusually rich hospitality: front-of-stage at Lands End, Twin Peaks, Sutro; stage-to-stage golf-cart movement; concierge; shuttle ops; SOMA/Golden Gate Club premium environments", lat: 37.77181, lng: -122.48088, status: "Confirmed", url: "https://www.notion.so/e188c51f169a46b09f94fda7b4b4d208" },
    { name: "Rocky Mountain Folks Festival", city: "Lyons", state: "CO", region: "West", start: "2026-08-07", end: "2026-08-09", genre: ["Folk/Americana"], model: "Camping / Destination", venue: "Planet Bluegrass", organizer: "Planet Bluegrass", contact: "unspecified", artists: "Jesse Welles; Ani DiFranco; Junior Brown", notes: "Historic Planet Bluegrass camping/river site. Main-stage lineup posted officially. Confidence: High.", lat: 40.2236, lng: -105.2719, status: "Confirmed", url: "https://www.notion.so/d407940c5f004912bc16aa45ed8452dd" },
    { name: "Elements Music & Arts Festival", id: "elements-music-arts-festival", city: "Long Pond", state: "PA", region: "Northeast", start: "2026-08-07", end: "2026-08-09", genre: ["Electronic", "EDM"], model: "Camping / Destination", venue: "Pocono Raceway (woodlands)", organizer: "Elements Production LLC", contact: "info@elementsfest.us; vendor and volunteer applications", artists: "ILLENIUM; Sara Landry; REZZ; John Summit; SLANDER; Disclosure", notes: "Early arrival Thu Aug 6. 100+ acts across multiple stages. Art-filled forest setting; onsite solar farm noted on venue page. Confidence: High.", lat: 41.0536, lng: -75.5119, status: "Confirmed", url: "https://www.notion.so/3b56af8af5bf4743a6a6b77b2b861182" },
    { name: "Breakaway Philadelphia", city: "Chester", state: "PA", region: "Northeast", start: "2026-09-11", end: "2026-09-12", genre: ["EDM", "Electronic"], model: "Urban Park Mega-Fest", venue: "Festival Grounds at Subaru Park", organizer: "Breakaway Inc.", contact: "Breakaway contact page", artists: "ISOxo; Marshmello; Sofi Tukker; Tiesto; Whethan; Malaa (Alter Ego)", notes: "Touring-festival format. Afterparties announced separately. Load-in unspecified. Confidence: High.", lat: 39.832, lng: -75.3782, status: "Confirmed", url: "https://www.notion.so/7069790368304066b26ae79621cf56e1" },
    { name: "ARC Music Festival", city: "Chicago", state: "IL", region: "Midwest", start: "2026-09-04", end: "2026-09-07", genre: ["Electronic", "EDM"], model: "Urban Park Mega-Fest", venue: "Union Park", organizer: "unspecified", contact: "sponsorship form (public)", artists: "Anyma; Underworld; Michael Bibi; Honey Dijon; Sara Landry", notes: "4-day expansion. Official hours 2 PM-10 PM. Union Park urban footprint. Load-in unspecified. Confidence: High (secondary lineup support).", lat: 41.8847, lng: -87.6664, status: "Confirmed", url: "https://www.notion.so/a8a88b544c6e471bab3cab1f6dc6dd74" },
    { name: "Detroit Jazz Festival", id: "detroit-jazz-festival", city: "Detroit", state: "MI", region: "Midwest", start: "2026-09-04", end: "2026-09-07", genre: ["Jazz"], model: "Civic / Nonprofit", venue: "Hart Plaza", organizer: "Detroit Jazz Festival Foundation (nonprofit)", contact: "", artists: "Ron Carter, Bob James, Ravi Coltrane, Artemis, Kurt Elling & Yellowjackets", notes: "Clearest broadcast signal in the set: free live video streams each day; public opening/closing times for Hart Plaza", lat: 42.32811, lng: -83.04494, status: "Confirmed", url: "https://www.notion.so/daacfec29ee244edbfe2dfc255996e2e" },
    { name: "North Coast Music Festival", id: "north-coast-music-festival", city: "Bridgeview", state: "IL", region: "Midwest", start: "2026-09-04", end: "2026-09-06", genre: ["EDM"], model: "Urban Park Mega-Fest", venue: "SeatGeek Stadium + adjacent turf fields", organizer: "", contact: "sponsor@northcoastfestival.com", artists: "FISHER, DEORRO, Ganja White Night (75+ DJs)", notes: "Spans stadium plus adjacent turf fields; 2 PM starts, no re-entry, official parking/will-call windows", lat: 41.75498, lng: -87.8048, status: "Confirmed", url: "https://www.notion.so/e8c3e91493944f40b5cfc394f0b91f87" },
    { name: "Borderland Festival", city: "East Aurora", state: "NY", region: "Northeast", start: "2026-09-18", end: "2026-09-20", genre: ["Folk/Americana", "Rock"], model: "Camping / Destination", venue: "Knox Farm State Park", organizer: "unspecified", contact: "zach@borderlandfestival.com (press/media)", artists: "unspecified", notes: "State-park site. 3-day format just outside Buffalo. Confidence: Medium.", lat: 42.7901, lng: -78.6232, status: "Confirmed", url: "https://www.notion.so/ac0c5cdf88684389b99de594bf6fb702" },
    { name: "Telluride Blues & Brews", city: "Telluride", state: "CO", region: "West", start: "2026-09-18", end: "2026-09-20", genre: ["Rock", "Folk/Americana"], model: "Multi-Venue / Citywide", venue: "Town-venue festival footprint", organizer: "SBG Productions", contact: "info@tellurideblues.com; 970-728-8037", artists: "Jon Batiste; Taj Mahal & Keb' Mo'; Marcus King Band; Samantha Fish; Daniel Donato's Cosmic Country", notes: "Main Stage, Blues Stage, Truck Stage, campground sessions, late-night Juke Joints all published. Confidence: High.", lat: 37.9375, lng: -107.8068, status: "Confirmed", url: "https://www.notion.so/6068f5f43a364386bf11737e4afcecbd" },
    { name: "XPoNential Music Festival", city: "Camden", state: "NJ", region: "Northeast", start: "2026-09-18", end: "2026-09-20", genre: ["Indie/Alt", "Folk/Americana"], model: "Civic / Nonprofit", venue: "Camden Waterfront Stadium", organizer: "WXPN", contact: "unspecified", artists: "Dawes; Portugal. The Man; Little Feat; St. Paul & The Broken Bones", notes: "Waterfront city-festival footprint. Lineup searchable by day. Confidence: High.", lat: 39.9445, lng: -75.131, status: "Confirmed", url: "https://www.notion.so/0c152b0391e64239ba694d8bc8163a72" },
    { name: "Riot Fest", id: "riot-fest", city: "Chicago", state: "IL", region: "Midwest", start: "2026-09-18", end: "2026-09-20", genre: ["Punk", "Rock"], model: "Urban Park Mega-Fest", venue: "Douglass Park", organizer: "", contact: "", artists: "Tool, Alanis Morissette, Morrissey, Twenty One Pilots, Pierce The Veil", notes: "Lineup landed May 28, 2026; gates/show-day listings live, daily schedule still pending", lat: 41.86241, lng: -87.69971, status: "Confirmed", url: "https://www.notion.so/cb069007e353462eac980ef139912f71" },
    { name: "Shaky Knees", id: "shaky-knees", city: "Atlanta", state: "GA", region: "Southeast", start: "2026-09-18", end: "2026-09-20", genre: ["Rock", "Indie/Alt"], model: "Urban Park Mega-Fest", venue: "Piedmont Park", organizer: "unspecified", contact: "unspecified", artists: "The Strokes; Gorillaz; Twenty One Pilots; LCD Soundsystem; Pavement; Turnstile", notes: "Piedmont Park urban multi-stage format. Ticketing live. Confidence: High (secondary lineup support).", lat: 33.7851, lng: -84.3739, status: "Confirmed", url: "https://www.notion.so/a86b880f9ad84f87892b74b1589ea18d" },
    { name: "Sea.Hear.Now", id: "sea-hear-now", city: "Asbury Park", state: "NJ", region: "Northeast", start: "2026-09-19", end: "2026-09-20", genre: ["Rock", "Pop"], model: "Boardwalk / Beach", venue: "North Beach / boardwalk footprint", organizer: "", contact: "", artists: "Mumford & Sons, The Strokes, The Offspring, Chaka Khan", notes: "Live surf competition between the Surf and Sand stages; experiential overlay of music, surf, and art separates it from standard beach-fest execution", lat: 40.21706, lng: -74.013, status: "Confirmed", url: "https://www.notion.so/6e237d134f574aa2b4dcdeeeff5d7741" }
  ];

  namespace.deepResearchPack = {
    id: PACK_ID,
    label: "ChatGPT Deep Research Summer Music Festivals 2026",
    source: "ChatGPT Deep Research query captured in Notion",
    reviewedOn: REVIEWED_ON,
    overwriteSchedules: false,
    festivals: ROWS.map(buildEvent)
  };
})(window);
