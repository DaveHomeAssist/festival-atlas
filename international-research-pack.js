(function attachInternationalResearchPack(global) {
  "use strict";

  var namespace = global.FA = global.FA || {};
  var REVIEWED_ON = "2026-05-30";
  var PACK_ID = "chatgpt-deep-research-international-summer-festivals-2026";
  var SOURCE_NOTE = "Canonical 2026 festival record imported from ChatGPT Deep Research report: Expanded International Summer Festival Seed Pack.";

  function parseIso(value) {
    var parts = String(value || "").split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2] || 1, 12);
  }

  function iso(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
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

  function genres(value) {
    return String(value || "")
      .split(",")
      .map(function trim(item) { return item.trim(); })
      .filter(Boolean);
  }

  function regionForCountry(country) {
    if (["United Kingdom", "Spain", "France", "Denmark", "Belgium", "Netherlands", "Romania", "Germany"].indexOf(country) >= 0) return "Europe";
    if (["Japan", "South Korea"].indexOf(country) >= 0) return "Asia-Pacific";
    if (["Brazil", "Colombia"].indexOf(country) >= 0) return "Latin America";
    return "Africa/Middle East";
  }

  function colorForRegion(region) {
    return {
      Europe: "#2563EB",
      "Asia-Pacific": "#DB2777",
      "Latin America": "#16A34A",
      "Africa/Middle East": "#D97706"
    }[region] || "#475569";
  }

  function settingFromRow(row) {
    var text = [row.venue, row.productionNotes, row.loadIn].join(" ").toLowerCase();
    if (/camp|castle|ski|parkorman|beach|national park|site/.test(text)) return "Destination";
    if (/city|multi-site|arena|stadium|fira|messe|plaza/.test(text)) return "Urban";
    return "Mixed";
  }

  function tierFromRow(row) {
    var text = [row.attendance, row.productionNotes, row.headliners].join(" ").toLowerCase().replace(/,/g, "");
    if (/400000|300000|250000|130000|183 artists|177 music|16 stages/.test(text)) return "S";
    if (/65000|100\+ acts|115 artists|major|large|multi-stage|multi-zone|citywide|airport/.test(text)) return "A";
    return "B";
  }

  function priorityForRow(row) {
    var tier = tierFromRow(row);
    if (tier === "S") return "High";
    return tier === "A" ? "Medium-high" : "Medium";
  }

  function sourcesForRow(row) {
    var seen = {};
    return (row.sources || [row.website, row.ticket]).filter(Boolean).reduce(function collect(list, url, index) {
      if (seen[url]) return list;
      seen[url] = true;
      list.push({ label: index === 0 ? "Official source from Deep Research" : "Supporting source from Deep Research", url: url });
      return list;
    }, []);
  }

  function buildEvent(row) {
    var region = row.region || regionForCountry(row.country);
    var rowGenres = genres(row.genre);
    var coordinates = row.coordinates || { lat: 39.5, lng: -98.35 };
    var sourceStatus = "Canonical ChatGPT Deep Research record";

    return {
      id: row.id,
      name: row.name,
      team: rowGenres.length ? rowGenres.join(" · ") : "International music festival",
      city: row.city + ", " + row.country,
      roof: settingFromRow(row),
      tier: tierFromRow(row),
      color: colorForRegion(region),
      note: row.productionNotes || "International festival row from ChatGPT Deep Research.",
      ticketApproach: "Use the official festival and ticketing links captured in the canonical Deep Research report.",
      transitNote: "Use the international travel, local ground transport, lodging, visas, and timezone context captured in the canonical Deep Research report.",
      coordinates: { lat: coordinates.lat, lng: coordinates.lng },
      specialEvents: [region, row.country, row.venue, "Canonical"].filter(Boolean).slice(0, 8),
      searchMeta: { localName: row.name, region: region + " / " + row.country },
      booking: {
        lodgingQuery: row.city + " " + row.country + " hotels",
        groundQuery: row.venue + " " + row.city + " " + row.country
      },
      officialUrl: row.website,
      lastReviewed: REVIEWED_ON,
      sourceNote: SOURCE_NOTE,
      dateConfidence: "canonical",
      ops: {
        packId: PACK_ID,
        status: sourceStatus,
        region: region,
        venue: row.venue,
        organizer: row.promoter,
        publicContact: row.contact,
        headliners: row.headliners,
        attendance: row.attendance,
        ticketUrl: row.ticket,
        loadIn: row.loadIn,
        productionNotes: row.productionNotes,
        opsModel: "International " + region + " festival",
        marketWindow: row.start.slice(0, 7),
        outreachPriority: priorityForRow(row),
        opportunitySignals: [
          region,
          row.country,
          row.venue,
          row.attendance && row.attendance !== "Not public" ? row.attendance : "",
          row.genre,
          "Canonical"
        ].filter(Boolean).slice(0, 8),
        watchItems: [
          /not public/i.test(row.loadIn || "") ? "True vendor load-in not public" : "",
          /not fully text-parsed|lineup still thin|validate full artist/i.test(row.headliners || "") ? "Lineup details not fully text-parsed" : ""
        ].filter(Boolean),
        sources: sourcesForRow(row)
      },
      sessions: sessionsForRange(row.start, row.end)
    };
  }

  var ROWS = [
    { id: "download-2026", name: "Download Festival", city: "Donington", country: "United Kingdom", region: "Europe", venue: "Donington Park", start: "2026-06-10", end: "2026-06-14", genre: "rock, metal, crossover", headliners: "Guns N' Roses; Limp Bizkit; Linkin Park", attendance: "Not public", promoter: "Download Festival team", website: "https://downloadfestival.co.uk/", ticket: "https://downloadfestival.co.uk/tickets/", contact: "Official contact form / info & FAQs", loadIn: "Public festival/camping window begins 2026-06-10; vendor load-in not public", productionNotes: "Major UK rock site festival at Donington; District X and camping footprint indicate large outdoor production scale.", sources: ["https://downloadfestival.co.uk/", "https://downloadfestival.co.uk/info-category/the-essentials/"], status: "Confirmed", coordinates: { lat: 52.8306, lng: -1.3772 } },
    { id: "sonar-barcelona-2026", name: "Sónar Barcelona", city: "Barcelona", country: "Spain", region: "Europe", venue: "Fira Gran Via + Sónar+D at Llotja de Mar", start: "2026-06-18", end: "2026-06-20", genre: "electronic, techno, club, crossover", headliners: "Charlotte de Witte; Amelie Lens presents AURA; Dom Dolla; Skepta; WhoMadeWho live; Cabaret Voltaire", attendance: "Not public", promoter: "Advanced Music / Sónar", website: "https://sonar.es/en/", ticket: "https://sonar.es/en/programme/line-up", contact: "Official contact and partner routes via Sónar site", loadIn: "Public festival dates 2026-06-18 to 2026-06-20; vendor load-in not public", productionNotes: "100+ acts across three days, paired with Sónar+D conference/programming; strong music-tech and visual-production relevance.", sources: ["https://sonar.es/en/", "https://sonar.es/en/programme/line-up"], status: "Confirmed", coordinates: { lat: 41.3545, lng: 2.1266 } },
    { id: "hellfest-2026", name: "Hellfest Open Air", city: "Clisson", country: "France", region: "Europe", venue: "Hellfest site, Clisson", start: "2026-06-18", end: "2026-06-21", genre: "rock, metal, punk, crossover", headliners: "Bring Me The Horizon; Papa Roach; The Offspring; Megadeth; Alice Cooper; A Perfect Circle; The Hives", attendance: "Not public", promoter: "Hellfest Productions", website: "https://hellfest.fr/en/", ticket: "https://hellfest.fr/en/lineup", contact: "Official site contact / press / on-site info", loadIn: "Public festival dates 2026-06-18 to 2026-06-21; vendor load-in not public", productionNotes: "183 artists across six themed stages; one of Europe's clearest large-format heavy production benchmarks.", sources: ["https://hellfest.fr/en/news/hellfest-2026-lineup", "https://hellfest.fr/en/experience-1"], status: "Confirmed", coordinates: { lat: 47.087, lng: -1.282 } },
    { id: "roskilde-2026", name: "Roskilde Festival", city: "Roskilde", country: "Denmark", region: "Europe", venue: "Roskilde Festival site", start: "2026-06-27", end: "2026-07-04", genre: "rock, electronic, crossover, jam-adjacent", headliners: "Gorillaz; The Cure; Jennie; Zara Larsson; Wolf Alice; Little Simz; Lykke Li", attendance: "130,000 participants", promoter: "The Roskilde Festival Group", website: "https://www.roskilde-festival.dk/en", ticket: "https://www.roskilde-festival.dk/en/line-up", contact: "Official contact / professional partnerships / service-and-trade routes", loadIn: "First Days run 2026-06-28 onward; vendor load-in not public", productionNotes: "177 music acts plus art/activism programming across 16 stages and festival venues; non-profit major with substantial site build.", sources: ["https://www.roskilde-festival.dk/en", "https://www.roskilde-festival.dk/en/news/full-line-up-and-schedule-revealed"], status: "Confirmed", coordinates: { lat: 55.621, lng: 12.08 } },
    { id: "rock-werchter-2026", name: "Rock Werchter", city: "Werchter", country: "Belgium", region: "Europe", venue: "Festivalpark Werchter", start: "2026-07-02", end: "2026-07-05", genre: "rock, electronic, crossover", headliners: "Mumford & Sons; The Cure; Charlotte de Witte; A Perfect Circle", attendance: "Not public", promoter: "Live Nation Festivals NV", website: "https://www.rockwerchter.be/en/", ticket: "https://www.rockwerchter.be/en/info/tickets", contact: "Official FAQ / hospitality / app routes", loadIn: "Public festival dates 2026-07-02 to 2026-07-05; vendor load-in not public", productionNotes: "Major multi-stage Belgian festival with hospitality/backstage terrace products and cashless guest operations.", sources: ["https://www.rockwerchter.be/en/", "https://www.rockwerchter.be/en/info/tickets"], status: "Confirmed", coordinates: { lat: 50.969, lng: 4.699 } },
    { id: "awakenings-festival-2026", name: "Awakenings Festival", city: "Hilvarenbeek", country: "Netherlands", region: "Europe", venue: "Beekse Bergen recreational area", start: "2026-07-10", end: "2026-07-12", genre: "techno, electronic", headliners: "Charlotte de Witte; Adam Beyer; Amelie Lens; Richie Hawtin; Boris Brejcha; Marco Carola", attendance: "Not public", promoter: "Awakenings", website: "https://www.awakenings.com/en/events/2026/07/awakenings-festival/378057/", ticket: "https://www.awakenings.com/en/tickets/", contact: "Official practical info / press", loadIn: "Camping/festival entrances active 2026-07-10 to 2026-07-12; vendor load-in not public", productionNotes: "Stage-by-stage schedule already live; camping + multi-area techno destination with large scenic outdoor footprint.", sources: ["https://www.awakenings.com/en/events/2026/07/awakenings-festival/378057/", "https://www.awakenings.com/en/festival26-practical-info/381703/"], status: "Confirmed", coordinates: { lat: 51.532, lng: 5.145 } },
    { id: "electric-castle-2026", name: "Electric Castle", city: "Cluj", country: "Romania", region: "Europe", venue: "Bánffy Castle, Bonțida", start: "2026-07-16", end: "2026-07-19", genre: "electronic, rock, crossover", headliners: "Twenty One Pilots; The Cure; Chase & Status; Nothing But Thieves; Deep Dish; Subtronics", attendance: "250,000+ annual footprint", promoter: "Electric Castle", website: "https://electriccastle.ro/", ticket: "https://electriccastle.ro/tickets-2026", contact: "Official festival account / support routes", loadIn: "Public festival dates 2026-07-16 to 2026-07-19; vendor load-in not public", productionNotes: "Official site describes a 4-day and 24/7 immersive format, castle setting, 250+ artists, and new media installations.", sources: ["https://electriccastle.ro/", "https://electriccastle.ro/tickets-2026"], status: "Confirmed", coordinates: { lat: 46.915, lng: 23.814 } },
    { id: "tomorrowland-belgium-w1-2026", name: "Tomorrowland Belgium Weekend 1", city: "Boom", country: "Belgium", region: "Europe", venue: "De Schorre", start: "2026-07-17", end: "2026-07-19", genre: "edm, electronic, techno", headliners: "David Guetta; Martin Garrix; Fisher; Hardwell; Chainsmokers; John Summit; Lost Frequencies", attendance: "400,000+ across both weekends historically", promoter: "Tomorrowland", website: "https://belgium.tomorrowland.com/", ticket: "https://belgium.tomorrowland.com/en/sales-info/sales-dates/", contact: "Official FAQ / help center", loadIn: "Weekend 1 public dates 2026-07-17 to 2026-07-19; vendor load-in not public", productionNotes: "Split into weekend objects for accurate calendar behavior; official history confirms 16+ stages and 400k+ recent audience scale.", sources: ["https://belgium.tomorrowland.com/en/line-up/", "https://tomorrowlandbelgium.press.tomorrowland.com/tomorrowland-belgium-2026-unveils-names"], status: "Confirmed", coordinates: { lat: 51.091, lng: 4.383 } },
    { id: "tomorrowland-belgium-w2-2026", name: "Tomorrowland Belgium Weekend 2", city: "Boom", country: "Belgium", region: "Europe", venue: "De Schorre", start: "2026-07-24", end: "2026-07-26", genre: "edm, electronic, techno", headliners: "David Guetta; Martin Garrix; Fisher; Hardwell; Chainsmokers; John Summit; Lost Frequencies", attendance: "400,000+ across both weekends historically", promoter: "Tomorrowland", website: "https://belgium.tomorrowland.com/", ticket: "https://belgium.tomorrowland.com/en/sales-info/sales-dates/", contact: "Official FAQ / help center", loadIn: "Weekend 2 public dates 2026-07-24 to 2026-07-26; vendor load-in not public", productionNotes: "Split into weekend objects for accurate calendar behavior; same overarching build scale as Weekend 1.", sources: ["https://belgium.tomorrowland.com/en/line-up/", "https://tomorrowlandbelgium.press.tomorrowland.com/tomorrowland-belgium-2026-unveils-names"], status: "Confirmed", coordinates: { lat: 51.091, lng: 4.383 } },
    { id: "parookaville-2026", name: "Parookaville", city: "Weeze", country: "Germany", region: "Europe", venue: "Airport Weeze", start: "2026-07-17", end: "2026-07-19", genre: "edm, electronic", headliners: "Official lineup page live; artists not fully text-parsed in crawl", attendance: "Not public", promoter: "Parookaville GmbH", website: "https://www.parookaville.com/en/", ticket: "https://tickets.parookaville.com/", contact: "infodesk@parookaville.com; +49 (0) 28 37 / 91 11 12", loadIn: "Festival dates 2026-07-17 to 2026-07-19; ticket personalization from 2026-07-01; vendor load-in not public", productionNotes: "Airport-based festival city concept with campsite districts, app, and strong temporary-city production profile.", sources: ["https://www.parookaville.com/en/", "https://www.parookaville.com/en/gtc"], status: "Confirmed", coordinates: { lat: 51.602, lng: 6.142 } },
    { id: "wacken-open-air-2026", name: "Wacken Open Air", city: "Wacken", country: "Germany", region: "Europe", venue: "Wacken Open Air site", start: "2026-07-29", end: "2026-08-01", genre: "rock, metal", headliners: "Official running order live; artists not fully text-parsed in crawl", attendance: "Not public", promoter: "Wacken Open Air team", website: "https://www.wacken.com/en/", ticket: "https://www.wacken.com/en/tickets-shop/woa-2026-tickets/", contact: "Official ticketcenter / support", loadIn: "Camping open 2026-07-26 to 2026-08-02; festival access 2026-07-29 to 2026-08-01", productionNotes: "Camping and full-festival access windows are already public; running order release indicates mature production planning.", sources: ["https://www.wacken.com/en/tickets-shop/woa-2026-tickets/", "https://www.wacken.com/en/news-details/here-is-the-first-running-order-for-woa-2026/"], status: "Confirmed", coordinates: { lat: 54.02, lng: 9.376 } },
    { id: "dekmantel-festival-2026", name: "Dekmantel Festival", city: "Amsterdam", country: "Netherlands", region: "Europe", venue: "Amsterdamse Bos", start: "2026-07-29", end: "2026-08-02", genre: "electronic, techno", headliners: "Jeff Mills; DJ Sprinkles; James Holden & Surgeon; Sampha; Eris Drew; Colin Benders", attendance: "Not public", promoter: "Dekmantel", website: "https://dekmantel.com/editorial/dekmantel-festival-2026-2-2", ticket: "https://dekmantel.com/editorial/dekmantel-at-dawn", contact: "Official contact / FAQ / supplier routes", loadIn: "Festival runs 2026-07-29 to 2026-08-02; vendor load-in not public", productionNotes: "Amsterdamse Bos weekend expands with Dekmantel at Dawn into three 12-hour morning programs, implying broader staging/ops windows.", sources: ["https://dekmantel.com/editorial/dekmantel-festival-2026-2-2", "https://dekmantel.com/editorial/dekmantel-at-dawn"], status: "Confirmed", coordinates: { lat: 52.318, lng: 4.827 } },
    { id: "untold-2026", name: "UNTOLD", city: "Cluj-Napoca", country: "Romania", region: "Europe", venue: "Cluj Arena and citywide festival footprint", start: "2026-08-06", end: "2026-08-09", genre: "edm, electronic, pop-crossover", headliners: "Kygo; Martin Garrix; Marshmello; Steve Aoki; Sting; Zara Larsson; Flo Rida; Carl Cox", attendance: "Not public", promoter: "UNTOLD Universe", website: "https://untold.com/", ticket: "https://tickets.untold.com/?_lang=en", contact: "Official contact / FAQ", loadIn: "Public festival dates 2026-08-06 to 2026-08-09; vendor load-in not public", productionNotes: "Multi-zone urban festival with main, Galaxy, Daydreaming, and Alchemy stages reflected in official artist routing.", sources: ["https://untold.com/", "https://untold.com/artists"], status: "Confirmed", coordinates: { lat: 46.768, lng: 23.572 } },
    { id: "green-man-2026", name: "Green Man Festival", city: "Crickhowell", country: "United Kingdom", region: "Europe", venue: "Bannau Brycheiniog National Park", start: "2026-08-20", end: "2026-08-23", genre: "rock, indie, electronic, jam-adjacent, crossover", headliners: "Four Tet; Wolf Alice; Wilco; Mogwai; Sparks; Cat Power", attendance: "Not public", promoter: "Green Man Festival", website: "https://www.greenman.net/", ticket: "https://www.greenman.net/tickets/", contact: "Contact Us / ticketsellers", loadIn: "Settlement open 2026-08-17 to 2026-08-23; main festival 2026-08-20 to 2026-08-23", productionNotes: "Multi-arts camping festival; useful jam-adjacent and crossover benchmark because of broader on-site program build.", sources: ["https://www.greenman.net/", "https://www.greenman.net/line-up/"], status: "Confirmed", coordinates: { lat: 51.859, lng: -3.137 } },
    { id: "creamfields-2026", name: "Creamfields", city: "Daresbury", country: "United Kingdom", region: "Europe", venue: "Daresbury, Cheshire", start: "2026-08-27", end: "2026-08-30", genre: "edm, electronic", headliners: "Alesso; Amelie Lens; Andy C; Aly & Fila; Alex Farell", attendance: "Not public", promoter: "Creamfields", website: "https://creamfields.com/", ticket: "https://creamfields.com/tickets/", contact: "Official app / Ticketmaster / FAQ routes", loadIn: "Dreamfields opens 2026-08-27 at 12:00; main festival 2026-08-27 to 2026-08-30", productionNotes: "Large-format UK EDM benchmark with official app-led ticketing and camping operations.", sources: ["https://creamfields.com/", "https://creamfields.com/tickets/"], status: "Confirmed", coordinates: { lat: 53.338, lng: -2.641 } },
    { id: "fuji-rock-2026", name: "Fuji Rock Festival", city: "Yuzawa", country: "Japan", region: "Asia-Pacific", venue: "Naeba Ski Resort", start: "2026-07-24", end: "2026-07-26", genre: "rock, electronic, crossover, jam-adjacent", headliners: "The xx; Khruangbin; Massive Attack; Mitski; Arlo Parks; Hi-Standard", attendance: "Not public", promoter: "SMASH Corporation", website: "https://en.fujirockfestival.com/", ticket: "https://en.fujirockfestival.com/ticket/index", contact: "fujirock@collaborationtours.com; +81 3-6859-6969", loadIn: "Pre-event on 2026-07-23; main festival 2026-07-24 to 2026-07-26", productionNotes: "Destination mountain festival with Green/White/Red and late-night dance zones; strong crossover production relevance.", sources: ["https://en.fujirockfestival.com/", "https://en.fujirockfestival.com/artist/index"], status: "Confirmed", coordinates: { lat: 36.79, lng: 138.784 } },
    { id: "summer-sonic-tokyo-2026", name: "Summer Sonic Tokyo", city: "Chiba", country: "Japan", region: "Asia-Pacific", venue: "ZOZO Marine Stadium & Makuhari Messe", start: "2026-08-14", end: "2026-08-16", genre: "rock, pop, electronic, crossover", headliners: "The Strokes; JENNIE; FKA twigs; Kasabian; keshi; Jamiroquai; L'Arc-en-Ciel", attendance: "300,000 all-festival attendance reference for Tokyo+Osaka history", promoter: "Creativeman Productions", website: "https://www.summersonic.com/en/", ticket: "https://www.summersonic.com/en/tickets/tokyo/", contact: "Official info and ticketing via Summer Sonic / Creativeman", loadIn: "Public doors 09:00 on festival dates; vendor load-in not public", productionNotes: "Simultaneous twin-city urban festival; official history cites 300k attendance in 2019 and record-setting 2024 scale.", sources: ["https://www.summersonic.com/en/info/tokyo/", "https://www.summersonic.com/en/lineup/tokyo-day1/"], status: "Confirmed", coordinates: { lat: 35.645, lng: 140.032 } },
    { id: "summer-sonic-osaka-2026", name: "Summer Sonic Osaka", city: "Osaka", country: "Japan", region: "Asia-Pacific", venue: "Expo '70 Commemorative Park", start: "2026-08-14", end: "2026-08-16", genre: "rock, pop, electronic, crossover", headliners: "L'Arc-en-Ciel; Jamiroquai; JENNIE; David Byrne; Steve Lacy; Pendulum; Suede", attendance: "300,000 all-festival attendance reference for Tokyo+Osaka history", promoter: "Creativeman Productions", website: "https://www.summersonic.com/en/", ticket: "https://www.summersonic.com/en/tickets/osaka/", contact: "Official info and ticketing via Summer Sonic / Creativeman", loadIn: "Public doors 10:00 on festival dates; vendor load-in not public", productionNotes: "Split by city for calendar accuracy; Osaka routing differs materially from Tokyo and deserves separate tile logic.", sources: ["https://www.summersonic.com/en/info/osaka/", "https://www.summersonic.com/en/lineup/osaka-day1/"], status: "Confirmed", coordinates: { lat: 34.81, lng: 135.533 } },
    { id: "ultra-japan-2026", name: "Ultra Japan", city: "Tokyo", country: "Japan", region: "Asia-Pacific", venue: "Tokyo Odaiba Ultra Park", start: "2026-09-19", end: "2026-09-20", genre: "edm, electronic", headliners: "Official lineup page live; artist names not fully text-parsed in crawl", attendance: "Not public", promoter: "Ultra Enterprises Inc.", website: "https://ultrajapan.com/", ticket: "https://ultrajapan.com/tickets-2026", contact: "help.ultrajapan.com; Ops HQ phones 080-8300-3530 / 090-2108-9391", loadIn: "Public operations HQ dates listed for 2026-09-10 to 2026-09-16; festival 2026-09-19 to 2026-09-20", productionNotes: "Two-day Odaiba electronic event with official lineup and set-times infrastructure already live.", sources: ["https://ultrajapan.com/", "https://ultrajapan.com/lineup"], status: "Confirmed", coordinates: { lat: 35.625, lng: 139.775 } },
    { id: "incheon-pentaport-2026", name: "Incheon Pentaport Rock Festival", city: "Incheon", country: "South Korea", region: "Asia-Pacific", venue: "Songdo Moonlight Festival Park", start: "2026-07-31", end: "2026-08-02", genre: "rock, electronic-crossover", headliners: "Khruangbin; Pixies; Massive Attack; Hyukoh; Sultan Of The Disco", attendance: "Not public", promoter: "Incheon Pentaport Rock Festival", website: "https://pentaport.co.kr/", ticket: "https://pentaport.co.kr/Notice/?bmode=view&idx=171280193", contact: "pentaport.kr@gmail.com; official ticketing channels", loadIn: "Public festival dates 2026-07-31 to 2026-08-02; vendor load-in not public", productionNotes: "Vendor and club recruitment notices are public, which makes Pentaport unusually useful for outreach-oriented production research.", sources: ["https://pentaport.co.kr/", "https://pentaport.co.kr/Notice/?bmode=view&idx=171280074"], status: "Confirmed", coordinates: { lat: 37.391, lng: 126.644 } },
    { id: "rock-in-japan-w1-2026", name: "Rock in Japan Festival Weekend 1", city: "Chiba", country: "Japan", region: "Asia-Pacific", venue: "Chiba City Soga Sports Park", start: "2026-09-12", end: "2026-09-13", genre: "rock, crossover", headliners: "First-wave artists include AiNA THE END; Awich; XG; go!go!vanillas; Chilli Beans.", attendance: "115 artists planned across 5 days; capacity not public", promoter: "Rockin'On Japan / TOKYO FM", website: "https://rijfes.jp/", ticket: "https://rijfes.jp/2026/artist/", contact: "Official FAQ / J Fes app routes", loadIn: "Public gates from 08:30; vendor load-in not public", productionNotes: "Split into weekend objects for calendar correctness; official page says 4 stages and 115 artists across 5 days total.", sources: ["https://rijfes.jp/", "https://rijfes.jp/2026/artist/"], status: "Confirmed", coordinates: { lat: 35.578, lng: 140.127 } },
    { id: "rock-in-japan-w2-2026", name: "Rock in Japan Festival Weekend 2", city: "Chiba", country: "Japan", region: "Asia-Pacific", venue: "Chiba City Soga Sports Park", start: "2026-09-19", end: "2026-09-21", genre: "rock, crossover", headliners: "Official artist page live; final weekend-two highlights roll forward from the canonical report", attendance: "115 artists planned across 5 days; capacity not public", promoter: "Rockin'On Japan / TOKYO FM", website: "https://rijfes.jp/", ticket: "https://rijfes.jp/2026/artist/", contact: "Official FAQ / J Fes app routes", loadIn: "Public gates from 08:30; vendor load-in not public", productionNotes: "Separate object avoids misleading continuous display between Sept 13 and Sept 19.", sources: ["https://rijfes.jp/", "https://rijfes.jp/2026/artist/"], status: "Confirmed", coordinates: { lat: 35.578, lng: 140.127 } },
    { id: "rock-in-rio-rio-w1-2026", name: "Rock in Rio Rio Weekend 1", city: "Rio de Janeiro", country: "Brazil", region: "Latin America", venue: "Cidade do Rock", start: "2026-09-04", end: "2026-09-07", genre: "rock, edm, electronic, crossover", headliners: "Foo Fighters; Rise Against; The Hives; Nova Twins; Steve Angello on New Dance Order", attendance: "Not public", promoter: "Rock in Rio", website: "https://rockinrio.com/rio/pt-br/informacoes/", ticket: "https://rockinrio.com/rio/pt-br/ingressos/", contact: "Official FAQs / ticketing routes", loadIn: "Official public dates only; vendor load-in not public", productionNotes: "Split by weekend because official dates are non-contiguous; New Dance Order makes this useful for EDM crossover programming.", sources: ["https://rockinrio.com/rio/pt-br/informacoes/", "https://rockinrio.com/rio/pt-br/line-up/"], status: "Confirmed", coordinates: { lat: -22.977, lng: -43.392 } },
    { id: "rock-in-rio-rio-w2-2026", name: "Rock in Rio Rio Weekend 2", city: "Rio de Janeiro", country: "Brazil", region: "Latin America", venue: "Cidade do Rock", start: "2026-09-11", end: "2026-09-13", genre: "rock, edm, electronic, crossover", headliners: "Official day-by-day lineup live; Sep 11-13 highlights captured in the canonical report", attendance: "Not public", promoter: "Rock in Rio", website: "https://rockinrio.com/rio/pt-br/informacoes/", ticket: "https://rockinrio.com/rio/pt-br/ingressos/", contact: "Official FAQs / ticketing routes", loadIn: "Official public dates only; vendor load-in not public", productionNotes: "Separate object preserves real event cadence in calendar views.", sources: ["https://rockinrio.com/rio/pt-br/informacoes/", "https://rockinrio.com/rio/pt-br/line-up/"], status: "Confirmed", coordinates: { lat: -22.977, lng: -43.392 } },
    { id: "joao-rock-2026", name: "João Rock", city: "Ribeirão Preto", country: "Brazil", region: "Latin America", venue: "Parque Permanente de Exposições de Ribeirão Preto", start: "2026-08-01", end: "2026-08-01", genre: "rock, brazilian rock, crossover", headliners: "Official lineup page live; sold out in current official crawl", attendance: "65,000", promoter: "João Rock", website: "https://www.joaorock.com.br/", ticket: "https://www.joaorock.com.br/ingressos/", contact: "Official FAQ / ticketing", loadIn: "Public event date 2026-08-01; vendor load-in not public", productionNotes: "Large one-day Brazilian rock anchor with detailed sector mapping and digital/facial ticketing notes.", sources: ["https://www.joaorock.com.br/", "https://joaorock.com.br/faq/?filtro=festival"], status: "Confirmed", coordinates: { lat: -21.18, lng: -47.81 } },
    { id: "festival-cordillera-2026", name: "Festival Cordillera", city: "Bogotá", country: "Colombia", region: "Latin America", venue: "Parque Simón Bolívar", start: "2026-09-12", end: "2026-09-13", genre: "rock, crossover, latin alternative", headliners: "Date confirmed; lineup details captured as thin in current official crawl", attendance: "Not public", promoter: "Festival Cordillera", website: "https://www.cordillerafestival.com/", ticket: "https://www.ticketmaster.co/event/festival-cordillera-2026", contact: "Official site + Ticketmaster Colombia event support", loadIn: "Public event dates confirmed; vendor load-in not public", productionNotes: "Useful Bogotá anchor for Latin-rock and crossover outreach; artist stack follows the canonical report.", sources: ["https://www.cordillerafestival.com/", "https://www.ticketmaster.co/event/festival-cordillera-2026"], status: "Confirmed", coordinates: { lat: 4.658, lng: -74.093 } },
    { id: "babylon-soundgarden-2026", name: "Babylon Soundgarden", city: "Istanbul", country: "Turkey", region: "Africa/Middle East", venue: "Bonus Parkorman", start: "2026-08-22", end: "2026-08-23", genre: "rock, indie, electronic, crossover", headliners: "Festival confirmed by official page; artist roster follows the canonical report", attendance: "Not public", promoter: "Pozitif Müzik", website: "https://babylon.com.tr/en/event-detail/august-22-2026/babylon-soundgarden", ticket: "https://babylon.com.tr/en/event-detail/23-agustos-2026/babylon-soundgarden", contact: "info@babylon.com.tr", loadIn: "Public event dates 2026-08-22 to 2026-08-23; vendor load-in not public", productionNotes: "Strong Istanbul city-festival prospect with public organizer identification and direct contact email.", sources: ["https://babylon.com.tr/en/event-detail/august-22-2026/babylon-soundgarden", "https://babylon.com.tr/en/about"], status: "Confirmed", coordinates: { lat: 41.179, lng: 28.989 } },
    { id: "milyonfest-arsuz-2026", name: "MilyonFest Arsuz", city: "Hatay", country: "Turkey", region: "Africa/Middle East", venue: "Arsuz Gözcüler Beach", start: "2026-08-06", end: "2026-08-09", genre: "rock, crossover", headliners: "Dates confirmed through official ticketing; lineup/contact depth captured as light", attendance: "Not public", promoter: "Milyonfest / Milyon Yapım", website: "https://www.milyonfest.com/", ticket: "https://www.biletix.com/etkinlik-grup/538877645/TURKIYE/en/milyonfest-arsuz-2026", contact: "info@milyonyapim.com", loadIn: "Camp/combi access begins 2026-08-06 15:00 per ticketing page", productionNotes: "Beachside four-day Turkish festival with camping and VIP/combi products visible in public ticketing flows.", sources: ["https://www.milyonfest.com/", "https://www.biletix.com/etkinlik-grup/538877645/TURKIYE/en/milyonfest-arsuz-2026"], status: "Confirmed", coordinates: { lat: 36.412, lng: 35.891 } },
    { id: "mawazine-2026", name: "Mawazine", city: "Rabat-Salé", country: "Morocco", region: "Africa/Middle East", venue: "Multi-site city festival footprint", start: "2026-06-19", end: "2026-06-27", genre: "crossover, electronic-adjacent", headliners: "Large-scale city festival; broader crossover production comp", attendance: "Not public", promoter: "Maroc Cultures", website: "https://mawazine.ma/en/", ticket: "https://mawazine.ma/en/edition-2026/scenes/decouverte-theatre-national-mohammed-v/", contact: "Official press/accreditation via Maroc Cultures", loadIn: "Official scene schedules live for 2026 edition; vendor load-in not public", productionNotes: "Broad citywide festival rather than genre-pure EDM/rock/jam, but still relevant as a large MENA production comparator.", sources: ["https://mawazine.ma/en/", "https://mawazine.ma/en/edition-2026/scenes/decouverte-theatre-national-mohammed-v/"], status: "Confirmed", coordinates: { lat: 34.02, lng: -6.841 } }
  ];

  namespace.internationalResearchPack = {
    id: PACK_ID,
    label: "ChatGPT Deep Research International Summer Festivals 2026",
    source: "ChatGPT Deep Research report: Expanded International Summer Festival Seed Pack",
    reviewedOn: REVIEWED_ON,
    overwriteSchedules: false,
    festivals: ROWS.map(buildEvent)
  };
})(window);
