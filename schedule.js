/* schedule.js */
(function attachScheduleModule(global) {
  "use strict";

  var SCHEDULE_2026 = {
    "coachella": [{"y":"Fri","d":"2026-04-10","t":null,"o":null,"s":"Weekend 1 Day 1"},{"y":"Sat","d":"2026-04-11","t":null,"o":null,"s":"Weekend 1 Day 2"},{"y":"Sun","d":"2026-04-12","t":null,"o":null,"s":"Weekend 1 Day 3"},{"y":"Fri","d":"2026-04-17","t":null,"o":null,"s":"Weekend 2 Day 1"},{"y":"Sat","d":"2026-04-18","t":null,"o":null,"s":"Weekend 2 Day 2"},{"y":"Sun","d":"2026-04-19","t":null,"o":null,"s":"Weekend 2 Day 3"}],
    "lollapalooza": [{"y":"Thu","d":"2026-07-30","t":null,"o":null,"s":"Festival Day 1"},{"y":"Fri","d":"2026-07-31","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sat","d":"2026-08-01","t":null,"o":null,"s":"Festival Day 3"},{"y":"Sun","d":"2026-08-02","t":null,"o":null,"s":"Festival Day 4"}],
    "bonnaroo": [{"y":"Thu","d":"2026-06-11","t":null,"o":null,"s":"Festival Day 1"},{"y":"Fri","d":"2026-06-12","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sat","d":"2026-06-13","t":null,"o":null,"s":"Festival Day 3"},{"y":"Sun","d":"2026-06-14","t":null,"o":null,"s":"Festival Day 4"}],
    "outside-lands": [{"y":"Fri","d":"2026-08-07","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sat","d":"2026-08-08","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sun","d":"2026-08-09","t":null,"o":null,"s":"Festival Day 3"}],
    "governors-ball": [{"y":"Fri","d":"2026-06-05","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sat","d":"2026-06-06","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sun","d":"2026-06-07","t":null,"o":null,"s":"Festival Day 3"}],
    "boston-calling": [{"y":"Fri","d":"2027-06-04","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sat","d":"2027-06-05","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sun","d":"2027-06-06","t":null,"o":null,"s":"Festival Day 3"}],
    "newport-folk-festival": [{"y":"Fri","d":"2026-07-24","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sat","d":"2026-07-25","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sun","d":"2026-07-26","t":null,"o":null,"s":"Festival Day 3"}],
    "newport-jazz-festival": [{"y":"Fri","d":"2026-07-31","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sat","d":"2026-08-01","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sun","d":"2026-08-02","t":null,"o":null,"s":"Festival Day 3"}],
    "sea-hear-now": [],
    "elements-music-arts-festival": [{"y":"Fri","d":"2026-08-07","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sat","d":"2026-08-08","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sun","d":"2026-08-09","t":null,"o":null,"s":"Festival Day 3"}],
    "ultra-music-festival": [{"y":"Fri","d":"2026-03-27","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sat","d":"2026-03-28","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sun","d":"2026-03-29","t":null,"o":null,"s":"Festival Day 3"}],
    "iii-points": [{"y":"Fri","d":"2026-10-23","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sat","d":"2026-10-24","t":null,"o":null,"s":"Festival Day 2"}],
    "shaky-knees": [{"y":"Fri","d":"2026-05-01","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sat","d":"2026-05-02","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sun","d":"2026-05-03","t":null,"o":null,"s":"Festival Day 3"}],
    "new-orleans-jazz-heritage-festival": [{"y":"Thu","d":"2026-04-23","t":null,"o":null,"s":"Weekend 1 Day 1"},{"y":"Fri","d":"2026-04-24","t":null,"o":null,"s":"Weekend 1 Day 2"},{"y":"Sat","d":"2026-04-25","t":null,"o":null,"s":"Weekend 1 Day 3"},{"y":"Sun","d":"2026-04-26","t":null,"o":null,"s":"Weekend 1 Day 4"},{"y":"Thu","d":"2026-04-30","t":null,"o":null,"s":"Weekend 2 Day 1"},{"y":"Fri","d":"2026-05-01","t":null,"o":null,"s":"Weekend 2 Day 2"},{"y":"Sat","d":"2026-05-02","t":null,"o":null,"s":"Weekend 2 Day 3"},{"y":"Sun","d":"2026-05-03","t":null,"o":null,"s":"Weekend 2 Day 4"}],
    "essence-festival-of-culture": [{"y":"Fri","d":"2026-07-03","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sat","d":"2026-07-04","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sun","d":"2026-07-05","t":null,"o":null,"s":"Festival Day 3"}],
    "railbird-festival": [{"y":"Sat","d":"2026-06-06","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sun","d":"2026-06-07","t":null,"o":null,"s":"Festival Day 2"}],
    "riot-fest": [{"y":"Fri","d":"2026-09-18","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sat","d":"2026-09-19","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sun","d":"2026-09-20","t":null,"o":null,"s":"Festival Day 3"}],
    "summerfest": [{"y":"Thu","d":"2026-06-18","t":null,"o":null,"s":"Weekend 1 Day 1"},{"y":"Fri","d":"2026-06-19","t":null,"o":null,"s":"Weekend 1 Day 2"},{"y":"Sat","d":"2026-06-20","t":null,"o":null,"s":"Weekend 1 Day 3"},{"y":"Thu","d":"2026-06-25","t":null,"o":null,"s":"Weekend 2 Day 1"},{"y":"Fri","d":"2026-06-26","t":null,"o":null,"s":"Weekend 2 Day 2"},{"y":"Sat","d":"2026-06-27","t":null,"o":null,"s":"Weekend 2 Day 3"},{"y":"Thu","d":"2026-07-02","t":null,"o":null,"s":"Weekend 3 Day 1"},{"y":"Fri","d":"2026-07-03","t":null,"o":null,"s":"Weekend 3 Day 2"},{"y":"Sat","d":"2026-07-04","t":null,"o":null,"s":"Weekend 3 Day 3"}],
    "movement": [{"y":"Sat","d":"2026-05-23","t":"2:00 PM","o":null,"s":"Festival Day 1"},{"y":"Sun","d":"2026-05-24","t":"2:00 PM","o":null,"s":"Festival Day 2"},{"y":"Mon","d":"2026-05-25","t":"2:00 PM","o":null,"s":"Festival Day 3"}],
    "electric-forest": [{"y":"Thu","d":"2026-06-25","t":null,"o":null,"s":"Festival Day 1"},{"y":"Fri","d":"2026-06-26","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sat","d":"2026-06-27","t":null,"o":null,"s":"Festival Day 3"},{"y":"Sun","d":"2026-06-28","t":null,"o":null,"s":"Festival Day 4"}],
    "hinterland-music-festival": [{"y":"Thu","d":"2026-07-30","t":null,"o":null,"s":"Festival Day 1"},{"y":"Fri","d":"2026-07-31","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sat","d":"2026-08-01","t":null,"o":null,"s":"Festival Day 3"},{"y":"Sun","d":"2026-08-02","t":null,"o":null,"s":"Festival Day 4"}],
    "summer-camp-music-festival": [{"y":"Thu","d":"2026-05-21","t":null,"o":null,"s":"Festival Day 1"},{"y":"Fri","d":"2026-05-22","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sat","d":"2026-05-23","t":null,"o":null,"s":"Festival Day 3"},{"y":"Sun","d":"2026-05-24","t":null,"o":null,"s":"Festival Day 4"}],
    "edc-las-vegas": [{"y":"Fri","d":"2026-05-15","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sat","d":"2026-05-16","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sun","d":"2026-05-17","t":null,"o":null,"s":"Festival Day 3"}],
    "austin-city-limits": [{"y":"Fri","d":"2026-10-09","t":null,"o":null,"s":"Weekend 1 Day 1"},{"y":"Sat","d":"2026-10-10","t":null,"o":null,"s":"Weekend 1 Day 2"},{"y":"Sun","d":"2026-10-11","t":null,"o":null,"s":"Weekend 1 Day 3"},{"y":"Fri","d":"2026-10-16","t":null,"o":null,"s":"Weekend 2 Day 1"},{"y":"Sat","d":"2026-10-17","t":null,"o":null,"s":"Weekend 2 Day 2"},{"y":"Sun","d":"2026-10-18","t":null,"o":null,"s":"Weekend 2 Day 3"}],
    "sxsw-music-festival": [{"y":"Thu","d":"2026-03-12","t":null,"o":null,"s":"Festival Day 1"},{"y":"Fri","d":"2026-03-13","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sat","d":"2026-03-14","t":null,"o":null,"s":"Festival Day 3"},{"y":"Sun","d":"2026-03-15","t":null,"o":null,"s":"Festival Day 4"},{"y":"Mon","d":"2026-03-16","t":null,"o":null,"s":"Festival Day 5"},{"y":"Tue","d":"2026-03-17","t":null,"o":null,"s":"Festival Day 6"},{"y":"Wed","d":"2026-03-18","t":null,"o":null,"s":"Festival Day 7"}],
    "seismic-dance-event": [{"y":"Fri","d":"2026-11-13","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sat","d":"2026-11-14","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sun","d":"2026-11-15","t":null,"o":null,"s":"Festival Day 3"}],
    "ubbi-dubbi-festival": [{"y":"Sat","d":"2026-04-25","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sun","d":"2026-04-26","t":null,"o":null,"s":"Festival Day 2"}],
    "m3f-music-festival": [{"y":"Fri","d":"2026-03-06","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sat","d":"2026-03-07","t":null,"o":null,"s":"Festival Day 2"}],
    "goldrush-festival": [{"y":"Sat","d":"2026-10-03","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sun","d":"2026-10-04","t":null,"o":null,"s":"Festival Day 2"}],
    "bottlerock-napa-valley": [{"y":"Fri","d":"2026-05-22","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sat","d":"2026-05-23","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sun","d":"2026-05-24","t":null,"o":null,"s":"Festival Day 3"}],
    "crssd-festival": [{"y":"Sat","d":"2026-03-14","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sun","d":"2026-03-15","t":null,"o":null,"s":"Festival Day 2"}],
    "bumbershoot": [{"y":"Sat","d":"2026-09-05","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sun","d":"2026-09-06","t":null,"o":null,"s":"Festival Day 2"},{"y":"Mon","d":"2026-09-07","t":null,"o":null,"s":"Festival Day 3"}],
    "capitol-hill-block-party": [{"y":"Fri","d":"2026-07-17","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sat","d":"2026-07-18","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sun","d":"2026-07-19","t":null,"o":null,"s":"Festival Day 3"}],
    "lightning-in-a-bottle": [{"y":"Wed","d":"2026-05-20","t":null,"o":null,"s":"Festival Day 1"},{"y":"Thu","d":"2026-05-21","t":null,"o":null,"s":"Festival Day 2"},{"y":"Fri","d":"2026-05-22","t":null,"o":null,"s":"Festival Day 3"},{"y":"Sat","d":"2026-05-23","t":null,"o":null,"s":"Festival Day 4"},{"y":"Sun","d":"2026-05-24","t":null,"o":null,"s":"Festival Day 5"}],
    "hard-summer": [{"y":"Sat","d":"2026-08-01","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sun","d":"2026-08-02","t":null,"o":null,"s":"Festival Day 2"}],
    "ohana-festival": [{"y":"Sat","d":"2026-09-19","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sun","d":"2026-09-20","t":null,"o":null,"s":"Festival Day 2"},{"y":"Mon","d":"2026-09-21","t":null,"o":null,"s":"Festival Day 3"}],
    "pickathon": [{"y":"Thu","d":"2026-07-30","t":null,"o":null,"s":"Festival Day 1"},{"y":"Fri","d":"2026-07-31","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sat","d":"2026-08-01","t":null,"o":null,"s":"Festival Day 3"},{"y":"Sun","d":"2026-08-02","t":null,"o":null,"s":"Festival Day 4"}],
    "bass-canyon": [{"y":"Fri","d":"2026-08-14","t":null,"o":null,"s":"Festival Day 1"},{"y":"Sat","d":"2026-08-15","t":null,"o":null,"s":"Festival Day 2"},{"y":"Sun","d":"2026-08-16","t":null,"o":null,"s":"Festival Day 3"}],
    "beyond-wonderland-at-the-gorge": [{"y":"Sat","d":"2026-06-27","t":"7:00 PM","o":null,"s":"Festival Day 1"},{"y":"Sun","d":"2026-06-28","t":"7:00 PM","o":null,"s":"Festival Day 2"}],
    "group-therapy-700": [{"y":"Fri","d":"2026-09-11","t":"12:00 PM","o":"Above & Beyond","s":"Festival Day 1"},{"y":"Sat","d":"2026-09-12","t":"12:00 PM","o":"Above & Beyond","s":"Festival Day 2"},{"y":"Sun","d":"2026-09-13","t":"12:00 PM","o":"Above & Beyond","s":"Festival Day 3"}],
    "treefort-music-fest": [],
    "kilby-block-party": [],
    "telluride-bluegrass-festival": []
  };

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function getGamesForPark(parkId) {
    return SCHEDULE_2026[parkId] || [];
  }

  function getGameId(parkId, game) {
    if (!parkId || !game) return "";
    return [parkId, game.d, (game.o || game.s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")].join("::");
  }

  function decorateGame(parkId, homeTeam, game) {
    if (!game) return null;
    return Object.assign({
      parkId: parkId,
      homeTeam: homeTeam,
      awayTeam: game.o || game.s || "Festival session",
      artist: game.o || "",
      sessionLabel: game.s || "",
      gameId: getGameId(parkId, game)
    }, game);
  }

  function getUpcomingGames(parkId, count) {
    var today = new Date().toISOString().slice(0, 10);
    var upcoming = [];
    var games = getGamesForPark(parkId);
    var limit = Number.isFinite(count) ? Math.max(1, count) : 3;

    for (var i = 0; i < games.length; i += 1) {
      if (games[i].d >= today) {
        upcoming.push(games[i]);
      }
    }

    return upcoming.slice(0, limit);
  }

  function getGameById(gameId) {
    for (var parkId in SCHEDULE_2026) {
      if (!Object.prototype.hasOwnProperty.call(SCHEDULE_2026, parkId)) continue;
      var games = SCHEDULE_2026[parkId];
      for (var index = 0; index < games.length; index += 1) {
        if (getGameId(parkId, games[index]) === gameId) {
          return decorateGame(parkId, "", games[index]);
        }
      }
    }

    return null;
  }

  function getGamesInWindow(parkId, startDate, endDate) {
    var games = getGamesForPark(parkId);
    var result = [];

    for (var i = 0; i < games.length; i += 1) {
      if (games[i].d >= startDate && games[i].d <= endDate) {
        result.push(games[i]);
      }
    }

    return result;
  }

  function formatGameLine(game) {
    if (!game || !game.d) return "";
    var parts = game.d.split("-");
    var month = MONTHS[Math.max(0, Number(parts[1]) - 1)] || "";
    var day = parts[2];
    return [game.y, month + " " + day, game.t, game.o].filter(Boolean).join(" · ");
  }

  global.BPQ = global.BPQ || {};
  global.BPQ.schedule = {
    getGamesForPark: getGamesForPark,
    getUpcomingGames: getUpcomingGames,
    getGameById: getGameById,
    getGamesInWindow: getGamesInWindow,
    decorateGame: decorateGame,
    formatGameLine: formatGameLine
  };
})(window);
