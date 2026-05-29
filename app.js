(function attachPrototypeApp(global) {
  "use strict";

  var namespace = global.FA = global.FA || {};
  var storage = namespace.storage;
  var data = namespace.data;
  var utils = namespace.utils;
  var schedule = namespace.schedule;

  if (!storage || !data || !utils) {
    throw new Error("Festival Atlas infrastructure modules must load before app.js");
  }

  var LEG_STATUSES = ["idea", "active", "booked", "completed"];
  var SETKEEPER_CONTEXT_KEY = "setkeeperContext";
  var GUIDE_REVIEW_WINDOW_DAYS = 45;
  var HAPPENING_SOON_DAYS = 21;
  var MS_PER_DAY = 24 * 60 * 60 * 1000;

  function cloneValue(value) {
    if (value === null || value === undefined) return value;
    if (typeof global.structuredClone === "function") {
      return global.structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  }

  function createId(prefix) {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return prefix + "-" + global.crypto.randomUUID();
    }
    return prefix + "-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function todayIsoDate() {
    return nowIso().slice(0, 10);
  }

  function dateFromIsoDate(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
    var date = new Date(String(value) + "T12:00:00");
    return Number.isFinite(date.getTime()) ? date : null;
  }

  function daysBetweenIsoDates(startDate, endDate) {
    var start = dateFromIsoDate(startDate);
    var end = dateFromIsoDate(endDate);
    if (!start || !end) return null;
    return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
  }

  function formatDateOnly(value, options) {
    var date = dateFromIsoDate(value);
    if (!date) return "";
    return new Intl.DateTimeFormat("en-US", options || {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(date);
  }

  function getParks() {
    return data.getParks();
  }

  function getParkById(parkId) {
    return getParks().find(function findPark(park) {
      return park.id === parkId;
    }) || null;
  }

  function getVisits() {
    return data.getVisits();
  }

  function saveVisits(nextVisits) {
    storage.set(data.KEYS.visits, nextVisits);
    return cloneValue(nextVisits);
  }

  function getVisitedMeta(parkId) {
    return getVisits()
      .filter(function byPark(visit) {
        return visit.parkId === parkId;
      })
      .sort(function byUpdatedAt(a, b) {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })[0] || null;
  }

  function isVisited(parkId) {
    return Boolean(getVisitedMeta(parkId));
  }

  function markVisited(parkId, patch) {
    var park = getParkById(parkId);
    if (!park) return null;

    var patchValue = patch || {};
    var timestamp = nowIso();
    var visitDate = patchValue.visitDate || timestamp.slice(0, 10);
    var nextVisit = null;

    storage.update(data.KEYS.visits, function updateVisits(currentVisits) {
      var visits = Array.isArray(currentVisits) ? cloneValue(currentVisits) : [];
      var existingIndex = visits.findIndex(function match(visit) {
        return visit.parkId === parkId;
      });

      nextVisit = {
        id: existingIndex >= 0 ? visits[existingIndex].id : createId("visit"),
        parkId: parkId,
        visitDate: visitDate,
        rating: patchValue.rating != null ? patchValue.rating : (existingIndex >= 0 ? visits[existingIndex].rating : null),
        bestFeature: patchValue.bestFeature || (existingIndex >= 0 ? visits[existingIndex].bestFeature : "") || "Festival memory",
        notes: patchValue.notes || (existingIndex >= 0 ? visits[existingIndex].notes : "") || "",
        createdAt: existingIndex >= 0 ? visits[existingIndex].createdAt : timestamp,
        updatedAt: timestamp
      };

      if (existingIndex >= 0) {
        visits[existingIndex] = nextVisit;
      } else {
        visits.push(nextVisit);
      }

      return visits;
    });
    storage.flush(data.KEYS.visits);

    return cloneValue(nextVisit);
  }

  function unmarkVisited(parkId) {
    storage.update(data.KEYS.visits, function removeVisits(currentVisits) {
      return (Array.isArray(currentVisits) ? currentVisits : []).filter(function keep(visit) {
        return visit.parkId !== parkId;
      });
    });
    storage.flush(data.KEYS.visits);
  }

  function toggleVisited(parkId, patch) {
    if (isVisited(parkId)) {
      unmarkVisited(parkId);
      return false;
    }

    markVisited(parkId, patch);
    return true;
  }

  function getVisitedParks() {
    return getVisits()
      .map(function toPair(visit) {
        var park = getParkById(visit.parkId);
        return park ? { park: park, meta: visit } : null;
      })
      .filter(Boolean)
      .sort(function byVisitDate(a, b) {
        return new Date(b.meta.updatedAt).getTime() - new Date(a.meta.updatedAt).getTime();
      });
  }

  function priorityScore(park) {
    var tierWeight = { S: 420, A: 280, B: 150, C: 40 }[park.tier] || 0;
    var ageWeight = Math.max(0, 2026 - Number(park.opened || 2026)) * 1.4;
    var eventWeight = Array.isArray(park.specialEvents) ? park.specialEvents.length * 10 : 0;
    var roofWeight = park.roof === "Camping" || park.roof === "Mixed" ? 8 : 0;
    return tierWeight + ageWeight + eventWeight + roofWeight + (isVisited(park.id) ? -1000 : 0);
  }

  function deriveLegId(fromParkId, toParkId) {
    return "leg-" + fromParkId + "-to-" + toParkId;
  }

  function buildLeg(fromParkId, toParkId, existingLeg) {
    var fromPark = getParkById(fromParkId);
    var toPark = getParkById(toParkId);
    if (!fromPark || !toPark) return null;

    var distance = utils.distanceMiles(
      fromPark.coordinates.lat,
      fromPark.coordinates.lng,
      toPark.coordinates.lat,
      toPark.coordinates.lng
    );

    var estimatedMinutes = Math.max(25, Math.round((distance / 58) * 60));
    var timestamp = nowIso();

    return {
      id: existingLeg && existingLeg.id ? existingLeg.id : deriveLegId(fromParkId, toParkId),
      fromParkId: fromParkId,
      toParkId: toParkId,
      status: LEG_STATUSES.includes(existingLeg && existingLeg.status) ? existingLeg.status : "idea",
      distanceMiles: distance,
      travelMinutes: existingLeg && Number.isFinite(existingLeg.travelMinutes) ? existingLeg.travelMinutes : estimatedMinutes,
      createdAt: existingLeg && existingLeg.createdAt ? existingLeg.createdAt : timestamp,
      updatedAt: existingLeg && existingLeg.updatedAt ? existingLeg.updatedAt : timestamp
    };
  }

  function sanitizeActiveTrip(tripValue) {
    var source = tripValue && typeof tripValue === "object" ? cloneValue(tripValue) : cloneValue(data.getActiveTrip());
    var validParkIds = Array.isArray(source.parkIds)
      ? source.parkIds.filter(function keep(parkId, index, list) {
          return getParkById(parkId) && list.indexOf(parkId) === index;
        })
      : [];

    var existingLegs = Array.isArray(source.legs) ? source.legs : [];
    var nextGameSelections = {};
    var nextLegs = [];

    if (source.gameSelections && typeof source.gameSelections === "object") {
      validParkIds.forEach(function mapSelection(parkId) {
        var gameId = source.gameSelections[parkId];
        if (typeof gameId !== "string" || !gameId) return;
        var game = getGameById(gameId);
        if (game && game.parkId === parkId) nextGameSelections[parkId] = gameId;
      });
    }

    for (var index = 0; index < validParkIds.length - 1; index += 1) {
      var fromParkId = validParkIds[index];
      var toParkId = validParkIds[index + 1];
      var existingLeg = existingLegs.find(function match(leg) {
        return leg.fromParkId === fromParkId && leg.toParkId === toParkId;
      });
      var nextLeg = buildLeg(fromParkId, toParkId, existingLeg);
      if (nextLeg) nextLegs.push(nextLeg);
    }

    return {
      id: source.id || createId("trip"),
      title: source.title || "Next Festival Run",
      parkIds: validParkIds,
      gameSelections: nextGameSelections,
      legs: nextLegs,
      startDate: source.startDate || null,
      endDate: source.endDate || null,
      notes: source.notes || "",
      updatedAt: source.updatedAt || nowIso()
    };
  }

  function getActiveTrip() {
    return sanitizeActiveTrip(storage.get(data.KEYS.activeTrip));
  }

  function normalizeTripDate(value) {
    if (value == null) return null;
    var text = String(value).trim();
    if (!text) return null;
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
  }

  function saveActiveTrip(nextTrip) {
    var sanitizedTrip = sanitizeActiveTrip(nextTrip);
    sanitizedTrip.updatedAt = nowIso();
    storage.set(data.KEYS.activeTrip, sanitizedTrip);
    storage.flush(data.KEYS.activeTrip);
    return cloneValue(sanitizedTrip);
  }

  function updateActiveTrip(updater) {
    var nextTrip = null;
    storage.update(data.KEYS.activeTrip, function updateTrip(currentTrip) {
      var baseTrip = sanitizeActiveTrip(currentTrip);
      nextTrip = sanitizeActiveTrip(updater(cloneValue(baseTrip)) || baseTrip);
      nextTrip.updatedAt = nowIso();
      return nextTrip;
    });
    storage.flush(data.KEYS.activeTrip);
    return cloneValue(nextTrip || getActiveTrip());
  }

  function getRouteStore() {
    var trip = getActiveTrip();
    return {
      version: 1,
      stops: trip.parkIds.map(function mapStop(parkId) {
        return {
          parkId: parkId,
          gameId: trip.gameSelections[parkId] || null
        };
      })
    };
  }

  function saveRouteStore(store) {
    return updateActiveTrip(function applyRoute(currentTrip) {
      var nextStops = Array.isArray(store && store.stops) ? store.stops.slice() : [];
      currentTrip.parkIds = nextStops.map(function mapStop(stop) {
        return typeof stop === "string" ? stop : stop && stop.parkId;
      }).filter(Boolean);
      currentTrip.gameSelections = {};
      nextStops.forEach(function assignSelection(stop) {
        if (!stop || typeof stop === "string" || !stop.parkId || !stop.gameId) return;
        currentTrip.gameSelections[stop.parkId] = stop.gameId;
      });
      return currentTrip;
    });
  }

  function setTripWindow(startDate, endDate) {
    return updateActiveTrip(function applyWindow(currentTrip) {
      currentTrip.startDate = normalizeTripDate(startDate);
      currentTrip.endDate = normalizeTripDate(endDate);

      if (currentTrip.startDate && currentTrip.endDate && currentTrip.startDate > currentTrip.endDate) {
        var swap = currentTrip.startDate;
        currentTrip.startDate = currentTrip.endDate;
        currentTrip.endDate = swap;
      }

      return currentTrip;
    });
  }

  function getRouteParks() {
    return getActiveTrip().parkIds
      .map(function toPark(parkId) {
        return getParkById(parkId);
      })
      .filter(Boolean);
  }

  function getRouteStops() {
    var trip = getActiveTrip();
    return trip.parkIds.map(function mapStop(parkId) {
      var park = getParkById(parkId);
      var gameId = trip.gameSelections[parkId] || null;
      var game = gameId ? getGameById(gameId) : null;
      return park ? { park: park, parkId: parkId, gameId: game ? game.gameId : null, game: game } : null;
    }).filter(Boolean);
  }

  function addRouteStop(parkId, gameId) {
    return updateActiveTrip(function addStop(currentTrip) {
      if (!currentTrip.parkIds.includes(parkId)) {
        currentTrip.parkIds.push(parkId);
      }
      currentTrip.gameSelections = currentTrip.gameSelections || {};
      if (gameId && getGameById(gameId)) currentTrip.gameSelections[parkId] = gameId;
      return currentTrip;
    }).parkIds.slice();
  }

  function removeRouteStop(parkId) {
    return updateActiveTrip(function removeStop(currentTrip) {
      currentTrip.parkIds = currentTrip.parkIds.filter(function keep(id) {
        return id !== parkId;
      });
      currentTrip.gameSelections = currentTrip.gameSelections || {};
      delete currentTrip.gameSelections[parkId];
      return currentTrip;
    }).parkIds.slice();
  }

  function setRouteStopGame(parkId, gameId) {
    return updateActiveTrip(function updateStopGame(currentTrip) {
      currentTrip.gameSelections = currentTrip.gameSelections || {};
      if (!currentTrip.parkIds.includes(parkId)) currentTrip.parkIds.push(parkId);
      if (gameId && getGameById(gameId)) currentTrip.gameSelections[parkId] = gameId;
      else delete currentTrip.gameSelections[parkId];
      return currentTrip;
    });
  }

  function moveRouteStop(parkId, direction) {
    var delta = direction === "up" ? -1 : direction === "down" ? 1 : 0;
    if (!delta) return getActiveTrip();

    return updateActiveTrip(function moveStop(currentTrip) {
      var currentIndex = currentTrip.parkIds.indexOf(parkId);
      if (currentIndex < 0) return currentTrip;

      var nextIndex = currentIndex + delta;
      if (nextIndex < 0 || nextIndex >= currentTrip.parkIds.length) return currentTrip;

      var nextParkIds = currentTrip.parkIds.slice();
      var moved = nextParkIds.splice(currentIndex, 1)[0];
      nextParkIds.splice(nextIndex, 0, moved);
      currentTrip.parkIds = nextParkIds;
      return currentTrip;
    });
  }

  function setLegStatus(legId, status) {
    if (!LEG_STATUSES.includes(status)) {
      throw new TypeError("Leg status must be idea, active, booked, or completed");
    }

    return updateActiveTrip(function updateLeg(currentTrip) {
      currentTrip.legs = currentTrip.legs.map(function mapLeg(leg) {
        if (leg.id !== legId) return leg;
        leg.status = status;
        leg.updatedAt = nowIso();
        return leg;
      });
      return currentTrip;
    });
  }

  function getLegById(legId) {
    return getActiveTrip().legs.find(function match(leg) {
      return leg.id === legId;
    }) || null;
  }

  function getNextTargets(count) {
    var limit = Number.isFinite(count) ? Math.max(1, count) : 3;
    var activeTripIds = getActiveTrip().parkIds;

    return getParks()
      .filter(function keep(park) {
        return !isVisited(park.id) && !activeTripIds.includes(park.id);
      })
      .sort(function sortByPriority(a, b) {
        return priorityScore(b) - priorityScore(a);
      })
      .slice(0, limit);
  }

  function getGameById(gameId) {
    var game = schedule && schedule.getGameById ? schedule.getGameById(gameId) : null;
    if (!game) return null;
    var park = getParkById(game.parkId);
    game.startDateTimeLocal = game.startDateTimeLocal || buildLocalStartDateTime(game);
    game.venue = game.venue || (park ? park.name : "");
    return game;
  }

  function buildLocalStartDateTime(game) {
    if (!game || !game.d || !game.t || /tbd/i.test(game.t)) return "";
    var match = String(game.t).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return "";
    var hours = Number(match[1]) % 12;
    var minutes = Number(match[2]);
    if (/pm/i.test(match[3])) hours += 12;
    var hh = String(hours).padStart(2, "0");
    var mm = String(minutes).padStart(2, "0");
    return game.d + "T" + hh + ":" + mm + ":00";
  }

  function getGamesByPark(parkId) {
    var park = getParkById(parkId);
    if (!park || !schedule || !schedule.getGamesForPark || !schedule.decorateGame) return [];
    return schedule.getGamesForPark(parkId).map(function mapGame(game) {
      var decorated = schedule.decorateGame(parkId, park.team, game);
      decorated.startDateTimeLocal = buildLocalStartDateTime(game);
      decorated.venue = park.name;
      return decorated;
    });
  }

  function getUpcomingGamesByPark(parkId, limit) {
    var park = getParkById(parkId);
    if (!park || !schedule || !schedule.getUpcomingGames || !schedule.decorateGame) return [];
    return schedule.getUpcomingGames(parkId, limit || 3).map(function mapGame(game) {
      var decorated = schedule.decorateGame(parkId, park.team, game);
      decorated.startDateTimeLocal = buildLocalStartDateTime(game);
      decorated.venue = park.name;
      return decorated;
    });
  }

  function getRawFestivalDateRange(parkId) {
    if (!schedule || !schedule.getDateRangeForPark) {
      return { start: "", end: "", count: 0, years: [] };
    }
    return schedule.getDateRangeForPark(parkId);
  }

  function formatRawDateRange(range) {
    if (!range || !range.start) return "Dates TBD";
    if (range.start === range.end) return formatDateOnly(range.start);

    var startParts = range.start.split("-");
    var endParts = range.end.split("-");
    if (startParts[0] === endParts[0] && startParts[1] === endParts[1]) {
      var endDay = String(Number(endParts[2]));
      return formatDateOnly(range.start, { month: "short", day: "numeric" }) + " - " +
        endDay + ", " + endParts[0];
    }
    if (startParts[0] === endParts[0]) {
      return formatDateOnly(range.start, { month: "short", day: "numeric" }) + " - " +
        formatDateOnly(range.end, { month: "short", day: "numeric" }) + ", " + endParts[0];
    }
    return formatDateOnly(range.start) + " - " + formatDateOnly(range.end);
  }

  function getFestivalDateRange(parkOrId) {
    var parkId = typeof parkOrId === "string" ? parkOrId : parkOrId && parkOrId.id;
    var rawRange = getRawFestivalDateRange(parkId);
    return Object.assign({}, rawRange, {
      label: formatRawDateRange(rawRange)
    });
  }

  function getFestivalGuideMeta(parkOrId) {
    var park = typeof parkOrId === "string" ? getParkById(parkOrId) : parkOrId;
    if (!park) {
      return {
        dateStart: "",
        dateEnd: "",
        dateRangeLabel: "Dates TBD",
        seasonStatus: "dates-tbd",
        seasonLabel: "Dates TBD",
        dataStatus: "needs-review",
        dataLabel: "Needs source",
        planningStatus: "Needs review",
        officialUrl: "",
        lastReviewed: "",
        sourceNote: "",
        dateConfidence: "unknown"
      };
    }

    var range = getFestivalDateRange(park.id);
    var today = todayIsoDate();
    var daysUntilStart = range.start ? daysBetweenIsoDates(today, range.start) : null;
    var seasonStatus = "dates-tbd";
    var seasonLabel = "Dates TBD";

    if (range.start && range.end) {
      if (range.end < today) {
        seasonStatus = "past";
        seasonLabel = "Past";
      } else if (range.start <= today && range.end >= today) {
        seasonStatus = "happening-now";
        seasonLabel = "Happening now";
      } else if (daysUntilStart !== null && daysUntilStart <= HAPPENING_SOON_DAYS) {
        seasonStatus = "happening-soon";
        seasonLabel = "Happening soon";
      } else {
        seasonStatus = "upcoming";
        seasonLabel = "Upcoming";
      }
    }

    var reviewAgeDays = park.lastReviewed ? daysBetweenIsoDates(park.lastReviewed, today) : null;
    var has2026Date = Array.isArray(range.years) && range.years.indexOf("2026") >= 0;
    var sourceIsFresh = reviewAgeDays === null || reviewAgeDays <= GUIDE_REVIEW_WINDOW_DAYS;
    var hasNextConfirmedDate = Boolean(range.start && range.start > today);
    var dataStatus = "source-linked";
    var dataLabel = "Source linked";

    if (!park.officialUrl) {
      dataStatus = "needs-review";
      dataLabel = "Needs source";
    } else if (!range.count) {
      dataStatus = "needs-review";
      dataLabel = "Needs dates";
    } else if (!has2026Date && hasNextConfirmedDate && sourceIsFresh) {
      dataStatus = "next-confirmed";
      dataLabel = "Next date confirmed";
    } else if (!has2026Date) {
      dataStatus = "needs-review";
      dataLabel = "Needs 2026 review";
    } else if (reviewAgeDays !== null && reviewAgeDays > GUIDE_REVIEW_WINDOW_DAYS) {
      dataStatus = "needs-recheck";
      dataLabel = "Recheck source";
    }

    var routeIds = getActiveTrip().parkIds;
    var planningStatus = "Scout";
    if (isVisited(park.id)) planningStatus = "Attended";
    else if (routeIds.indexOf(park.id) >= 0) planningStatus = "On route";
    else if (seasonStatus === "happening-now" || seasonStatus === "happening-soon") planningStatus = "Needs decision";
    else if (dataStatus === "needs-review" || dataStatus === "needs-recheck") planningStatus = "Needs review";

    return {
      dateStart: range.start,
      dateEnd: range.end,
      dateCount: range.count,
      dateRangeLabel: range.label,
      seasonStatus: seasonStatus,
      seasonLabel: seasonLabel,
      dataStatus: dataStatus,
      dataLabel: dataLabel,
      planningStatus: planningStatus,
      officialUrl: park.officialUrl || "",
      sourceLabel: park.sourceLabel || "Official source",
      lastReviewed: park.lastReviewed || "",
      reviewAgeDays: reviewAgeDays,
      sourceNote: park.sourceNote || "",
      dateConfidence: park.dateConfidence || (dataStatus === "next-confirmed" ? "next-confirmed" : "official")
    };
  }

  function getHappeningSoon(count) {
    var limit = Number.isFinite(count) ? Math.max(1, count) : 4;
    return getParks()
      .map(function mapPark(park) {
        return { park: park, meta: getFestivalGuideMeta(park) };
      })
      .filter(function keepUpcoming(entry) {
        return !isVisited(entry.park.id) &&
          ["happening-now", "happening-soon"].indexOf(entry.meta.seasonStatus) >= 0 &&
          entry.meta.dateStart;
      })
      .sort(function sortByStart(a, b) {
        return a.meta.dateStart.localeCompare(b.meta.dateStart);
      })
      .slice(0, limit)
      .map(function toPark(entry) {
        return entry.park;
      });
  }

  function getSeasonGuideSummary() {
    return getParks().reduce(function summarize(summary, park) {
      var meta = getFestivalGuideMeta(park);
      summary.total += 1;
      if (meta.seasonStatus === "happening-now") summary.happeningNow += 1;
      if (meta.seasonStatus === "happening-soon") summary.happeningSoon += 1;
      if (meta.seasonStatus === "upcoming") summary.upcoming += 1;
      if (meta.seasonStatus === "past") summary.past += 1;
      if (meta.seasonStatus === "dates-tbd") summary.datesTbd += 1;
      if (meta.dataStatus === "needs-review" || meta.dataStatus === "needs-recheck") summary.needsReview += 1;
      if (!summary.lastReviewed || (meta.lastReviewed && meta.lastReviewed < summary.lastReviewed)) {
        summary.lastReviewed = meta.lastReviewed;
      }
      return summary;
    }, {
      total: 0,
      happeningNow: 0,
      happeningSoon: 0,
      upcoming: 0,
      past: 0,
      datesTbd: 0,
      needsReview: 0,
      lastReviewed: ""
    });
  }

  function buildMapsUrl(destination, origin, travelMode) {
    var mode = travelMode || "driving";
    var params = new URLSearchParams({ api: "1", destination: destination, travelmode: mode });
    if (origin) params.set("origin", origin);
    return "https://www.google.com/maps/dir/?" + params.toString();
  }

  function buildGameICS(game) {
    if (!game) return "";

    function toIcsDate(date) {
      return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    }

    var startRaw = game.startDateTimeLocal || (game.d ? game.d + "T19:05:00" : "");
    var startDate = new Date(startRaw);
    if (!Number.isFinite(startDate.getTime())) startDate = new Date(game.d + "T19:05:00");
    var endDate = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));
    var park = getParkById(game.parkId);
    var location = game.venue || (park ? park.name : "");
    var summary = (game.awayTeam || "Featured set") + " · " + (location || game.homeTeam || "Festival stop");
    var uid = "festival-atlas-" + (game.gameId || createId("game")) + "@local";

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Festival Atlas//EN",
      "BEGIN:VEVENT",
      "UID:" + uid,
      "DTSTAMP:" + toIcsDate(new Date()),
      "DTSTART:" + toIcsDate(startDate),
      "DTEND:" + toIcsDate(endDate),
      "SUMMARY:" + summary,
      "LOCATION:" + location,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
  }

  function downloadICS(filename, content) {
    var blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = global.document.createElement("a");
    link.href = url;
    link.download = filename;
    global.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadGameICS(game) {
    if (!game) return;
    var filename = ((game.gameId || "festival-atlas-session") + ".ics").replace(/[^a-z0-9._-]+/gi, "-").toLowerCase();
    downloadICS(filename, buildGameICS(game));
  }

  function getNotes(scope, scopeId) {
    return data.getNotes(scope, scopeId);
  }

  function saveNote(scope, scopeId, text) {
    return data.saveNote(scope, scopeId, text);
  }

  function getTripScratchpad() {
    var trip = getActiveTrip();
    return getNotes("trip", trip.id)[0] || null;
  }

  function saveTripScratchpad(text) {
    return saveNote("trip", getActiveTrip().id, text);
  }

  function getLegScratchpad(legId) {
    return getNotes("leg", legId)[0] || null;
  }

  function saveLegScratchpad(legId, text) {
    return saveNote("leg", legId, text);
  }

  function getParkScratchpad(parkId) {
    return getNotes("park", parkId)[0] || null;
  }

  function saveParkScratchpad(parkId, text) {
    return saveNote("park", parkId, text);
  }

  function setSetkeeperContext(input) {
    var activeTrip = getActiveTrip();
    var targetGameId = input && typeof input === "object" ? input.gameId : null;
    var targetParkId = input && typeof input === "object"
      ? input.parkId
      : (typeof input === "string" ? input : null);
    if (!targetParkId && targetGameId) {
      var selectedGame = getGameById(targetGameId);
      targetParkId = selectedGame ? selectedGame.parkId : null;
    }
    targetParkId = targetParkId || activeTrip.parkIds[0] || null;
    var park = targetParkId ? getParkById(targetParkId) : null;
    var game = targetGameId ? getGameById(targetGameId) : null;
    if (!park) return null;

    var payload = {
      version: 3,
      parkId: park.id,
      venue: park.name,
      homeTeam: park.team,
      awayTeam: game ? game.awayTeam : "",
      gameId: game ? game.gameId : "",
      startDateTimeLocal: game ? (game.startDateTimeLocal || "") : "",
      gameLabel: game && schedule && schedule.formatGameLine ? schedule.formatGameLine(game) : "",
      city: park.city,
      color: park.color,
      tripId: activeTrip.id,
      routeParkIds: activeTrip.parkIds.slice(),
      openedAt: nowIso()
    };

    storage.set(SETKEEPER_CONTEXT_KEY, payload);
    storage.flush(SETKEEPER_CONTEXT_KEY);
    return cloneValue(payload);
  }

  function getSetkeeperContext() {
    var explicitContext = storage.get(SETKEEPER_CONTEXT_KEY);
    if (explicitContext && explicitContext.parkId && getParkById(explicitContext.parkId)) {
      return cloneValue(explicitContext);
    }

    var activeTrip = getActiveTrip();
    if (!activeTrip.parkIds.length) return null;
    return setSetkeeperContext({
      parkId: activeTrip.parkIds[0],
      gameId: activeTrip.gameSelections[activeTrip.parkIds[0]] || ""
    });
  }

  function clearSetkeeperContext() {
    storage.set(SETKEEPER_CONTEXT_KEY, undefined);
    storage.flush(SETKEEPER_CONTEXT_KEY);
  }

  /* ── Shortlist ─────────────────────────── */
  var SHORTLIST_KEY = "shortlistFestivalIds";

  function getShortlist() {
    var ids = storage.get(SHORTLIST_KEY);
    return Array.isArray(ids) ? ids.slice() : [];
  }

  function toggleShortlist(festivalId) {
    var ids = getShortlist();
    var index = ids.indexOf(festivalId);
    if (index >= 0) {
      ids.splice(index, 1);
    } else {
      if (!getParkById(festivalId)) return ids;
      ids.push(festivalId);
    }
    storage.set(SHORTLIST_KEY, ids);
    storage.flush(SHORTLIST_KEY);
    return ids.slice();
  }

  function isShortlisted(festivalId) {
    return getShortlist().indexOf(festivalId) >= 0;
  }

  /* ── Production operations ───────────── */
  var BACKUP_VERSION = 1;
  var DATA_BACKUP_KEYS = [
    data.KEYS.parks,
    data.KEYS.activeTrip,
    data.KEYS.visits,
    data.KEYS.planningNotes,
    SHORTLIST_KEY,
    SETKEEPER_CONTEXT_KEY,
    "festivalJournalEntries",
    "festivalJournalHistory",
    data.KEYS.festivalCustomSchedule,
    "sharedTripImports",
    "setkeeperDraft",
    "theme"
  ];

  function normalizeFestivalId(value, fallback) {
    var base = String(value || fallback || "").trim().toLowerCase();
    var normalized = base.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return normalized || "";
  }

  function normalizeImportedPark(rawPark) {
    if (!rawPark || typeof rawPark !== "object") return null;
    var id = normalizeFestivalId(rawPark.id, rawPark.name);
    var name = String(rawPark.name || "").trim();
    if (!id || !name) return null;

    var coordinates = rawPark.coordinates && Number.isFinite(Number(rawPark.coordinates.lat)) && Number.isFinite(Number(rawPark.coordinates.lng))
      ? { lat: Number(rawPark.coordinates.lat), lng: Number(rawPark.coordinates.lng) }
      : { lat: 39.5, lng: -98.35 };

    return {
      id: id,
      name: name,
      team: String(rawPark.team || rawPark.genre || "Music Festival").trim(),
      city: String(rawPark.city || "Location TBD").trim(),
      opened: Number.isFinite(Number(rawPark.opened)) ? Number(rawPark.opened) : null,
      capacity: Number.isFinite(Number(rawPark.capacity)) ? Number(rawPark.capacity) : null,
      roof: String(rawPark.roof || rawPark.setting || "Mixed").trim(),
      tier: String(rawPark.tier || "B").trim().slice(0, 1).toUpperCase(),
      color: utils.safeColor(rawPark.color || "", "#2563EB"),
      note: String(rawPark.note || "Imported festival pack entry.").trim(),
      ticketApproach: String(rawPark.ticketApproach || "Verify ticket details with the official festival source before booking.").trim(),
      transitNote: String(rawPark.transitNote || "Confirm local transit, parking, and lodging before travel.").trim(),
      coordinates: coordinates,
      specialEvents: Array.isArray(rawPark.specialEvents) ? rawPark.specialEvents.map(String).slice(0, 8) : ["Imported festival"],
      searchMeta: rawPark.searchMeta && typeof rawPark.searchMeta === "object" ? rawPark.searchMeta : { localName: name, region: "Imported" },
      booking: rawPark.booking && typeof rawPark.booking === "object" ? rawPark.booking : {},
      officialUrl: String(rawPark.officialUrl || "").trim(),
      lastReviewed: normalizeTripDate(rawPark.lastReviewed) || todayIsoDate(),
      sourceLabel: rawPark.officialUrl ? "Official festival source" : "Imported source needed",
      sourceNote: String(rawPark.sourceNote || "Imported festival pack entry; verify before booking.").trim(),
      dateConfidence: String(rawPark.dateConfidence || "imported").trim(),
      imported: true
    };
  }

  function normalizeImportedSession(rawSession, index) {
    if (!rawSession || typeof rawSession !== "object") return null;
    var date = normalizeTripDate(rawSession.d || rawSession.date);
    if (!date) return null;
    var dateObj = dateFromIsoDate(date);
    var weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return {
      y: rawSession.y || weekdays[dateObj.getDay()],
      d: date,
      t: rawSession.t || rawSession.time || null,
      o: rawSession.o || rawSession.artist || null,
      s: rawSession.s || rawSession.label || ("Festival Day " + (index + 1))
    };
  }

  function importFestivalPack(payload) {
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.festivals)) {
      throw new TypeError("Festival pack must include a festivals array");
    }

    var importedParks = payload.festivals.map(normalizeImportedPark).filter(Boolean);
    if (!importedParks.length) {
      throw new TypeError("Festival pack did not include any valid festivals");
    }

    var importedIds = importedParks.map(function mapId(park) { return park.id; });
    var currentParks = getParks();
    var nextParks = currentParks.filter(function keepExisting(park) {
      return importedIds.indexOf(park.id) === -1;
    }).concat(importedParks);

    var customSchedule = storage.get(data.KEYS.festivalCustomSchedule) || {};
    if (!customSchedule || typeof customSchedule !== "object" || Array.isArray(customSchedule)) customSchedule = {};

    importedParks.forEach(function importSessions(park) {
      var rawSessions = [];
      var sourcePark = payload.festivals.find(function match(rawPark) {
        return normalizeFestivalId(rawPark.id, rawPark.name) === park.id;
      });
      if (sourcePark && Array.isArray(sourcePark.sessions)) rawSessions = sourcePark.sessions;
      else if (payload.sessions && Array.isArray(payload.sessions[park.id])) rawSessions = payload.sessions[park.id];

      var sessions = rawSessions.map(normalizeImportedSession).filter(Boolean).sort(function sortByDate(a, b) {
        return a.d.localeCompare(b.d);
      });

      if (sessions.length) customSchedule[park.id] = sessions;
      else delete customSchedule[park.id];
    });

    storage.set(data.KEYS.parks, nextParks);
    storage.flush(data.KEYS.parks);
    storage.set(data.KEYS.festivalCustomSchedule, customSchedule);
    storage.flush(data.KEYS.festivalCustomSchedule);

    return {
      importedAt: nowIso(),
      festivals: importedParks.length,
      sessions: importedIds.reduce(function countSessions(total, parkId) {
        return total + (Array.isArray(customSchedule[parkId]) ? customSchedule[parkId].length : 0);
      }, 0),
      ids: importedIds
    };
  }

  function getBackupPayload() {
    var state = {};
    DATA_BACKUP_KEYS.forEach(function copyKey(key) {
      state[key] = storage.get(key);
    });

    return {
      app: "Festival Atlas",
      version: BACKUP_VERSION,
      exportedAt: nowIso(),
      sourceReviewedThrough: getSeasonGuideSummary().lastReviewed,
      state: state
    };
  }

  function restoreBackupPayload(payload) {
    if (!payload || typeof payload !== "object" || payload.app !== "Festival Atlas" || !payload.state || typeof payload.state !== "object") {
      throw new TypeError("Backup file is not a Festival Atlas backup");
    }

    DATA_BACKUP_KEYS.forEach(function restoreKey(key) {
      if (Object.prototype.hasOwnProperty.call(payload.state, key)) {
        storage.set(key, cloneValue(payload.state[key]));
        storage.flush(key);
      }
    });

    data.initializeData();

    return {
      restoredAt: nowIso(),
      keys: DATA_BACKUP_KEYS.filter(function restored(key) {
        return Object.prototype.hasOwnProperty.call(payload.state, key);
      })
    };
  }

  function resetLocalData() {
    DATA_BACKUP_KEYS.forEach(function removeKey(key) {
      storage.remove(key);
    });
    data.initializeData();
    return createDiagnostics();
  }

  function downloadJson(filename, payload) {
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var link = global.document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    global.document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    link.remove();
  }

  function downloadBackup() {
    var stamp = todayIsoDate();
    downloadJson("festival-atlas-backup-" + stamp + ".json", getBackupPayload());
  }

  function createDiagnostics() {
    var parks = getParks();
    var auditRows = getSourceAuditRows();
    var reviewRows = auditRows.filter(function needsReview(row) {
      return row.dataStatus === "needs-review" || row.dataStatus === "needs-recheck";
    });

    return {
      app: "Festival Atlas",
      generatedAt: nowIso(),
      location: global.location ? global.location.href : "",
      userAgent: global.navigator ? global.navigator.userAgent : "",
      counts: {
        festivals: parks.length,
        routeStops: getActiveTrip().parkIds.length,
        visits: getVisits().length,
        shortlist: getShortlist().length,
        sourceReviewNeeded: reviewRows.length,
        nextConfirmed: auditRows.filter(function next(row) { return row.dataStatus === "next-confirmed"; }).length
      },
      sourceReviewNeeded: reviewRows.map(function mapReview(row) {
        return {
          id: row.id,
          name: row.name,
          dateRangeLabel: row.dateRangeLabel,
          dataLabel: row.dataLabel,
          lastReviewed: row.lastReviewed
        };
      }),
      storageKeys: DATA_BACKUP_KEYS.map(function mapKey(key) {
        return {
          key: key,
          present: storage.get(key) !== undefined
        };
      })
    };
  }

  function downloadDiagnostics() {
    downloadJson("festival-atlas-diagnostics-" + todayIsoDate() + ".json", createDiagnostics());
  }

  function getSourceAuditRows() {
    return getParks()
      .map(function mapPark(park) {
        var meta = getFestivalGuideMeta(park);
        return {
          id: park.id,
          name: park.name,
          city: park.city,
          dateRangeLabel: meta.dateRangeLabel,
          dataStatus: meta.dataStatus,
          dataLabel: meta.dataLabel,
          seasonStatus: meta.seasonStatus,
          seasonLabel: meta.seasonLabel,
          planningStatus: meta.planningStatus,
          dateConfidence: meta.dateConfidence,
          sourceNote: meta.sourceNote,
          officialUrl: meta.officialUrl,
          lastReviewed: meta.lastReviewed,
          reviewAgeDays: meta.reviewAgeDays
        };
      })
      .sort(function sortAudit(a, b) {
        var reviewDelta = Number(a.dataStatus === "needs-review" || a.dataStatus === "needs-recheck") -
          Number(b.dataStatus === "needs-review" || b.dataStatus === "needs-recheck");
        if (reviewDelta) return -reviewDelta;
        return a.name.localeCompare(b.name);
      });
  }

  /* ── Share trip URLs ─────────────────── */
  function buildShareTripUrl(trip, options) {
    var opts = options || {};
    var payload = {
      v: 1,
      t: trip.title || "",
      p: (trip.parkIds || []).slice(0, 20),
      sd: trip.startDate || "",
      ed: trip.endDate || ""
    };
    if (opts.includeNotes && trip.notes) {
      payload.n = String(trip.notes).slice(0, 500);
    }
    var encoded = global.btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    return global.location.origin + global.location.pathname.replace(/[^/]*$/, "route.html") + "?shared=" + encoded;
  }

  function parseSharedTripState(url) {
    try {
      var search = (url || global.location.search);
      var match = search.match(/[?&]shared=([^&]+)/);
      if (!match) return null;
      var json = decodeURIComponent(escape(global.atob(match[1])));
      var payload = JSON.parse(json);
      if (!payload || payload.v !== 1 || !Array.isArray(payload.p)) return null;
      return {
        title: String(payload.t || "Shared Trip").slice(0, 120),
        parkIds: payload.p.filter(function (id) { return typeof id === "string" && getParkById(id); }),
        startDate: payload.sd || null,
        endDate: payload.ed || null,
        notes: payload.n || "",
        readOnly: true
      };
    } catch (e) {
      return null;
    }
  }

  /* ── Logistics handoff links ─────────── */
  function buildFlightLink(festival) {
    if (!festival || !festival.booking || !festival.booking.airportCode) return "";
    return "https://www.google.com/travel/flights?q=flights+to+" + encodeURIComponent(festival.booking.airportCode);
  }

  function buildStayLink(festival, tripDates) {
    if (!festival || !festival.booking || !festival.booking.lodgingQuery) return "";
    var q = festival.booking.lodgingQuery;
    if (tripDates && tripDates.startDate) q += " " + tripDates.startDate;
    return "https://www.google.com/travel/hotels?q=" + encodeURIComponent(q);
  }

  function buildGroundLink(festival) {
    if (!festival || !festival.booking || !festival.booking.groundQuery) return "";
    return "https://www.google.com/maps/search/" + encodeURIComponent(festival.booking.groundQuery);
  }

  /* ── Planner assumptions ─────────────── */
  var PLANNER_ASSUMPTIONS = {
    bufferHours: 6,
    restDaysEnabled: false,
    timezoneAware: false,
    travelModes: ["driving"],
    visasModeled: false
  };

  function getPlannerAssumptions() {
    return cloneValue(PLANNER_ASSUMPTIONS);
  }

  function getPlannerAssumptionsSummary() {
    return [
      "Route distances are straight-line estimates using driving speed (~58 mph average).",
      "Buffer: " + PLANNER_ASSUMPTIONS.bufferHours + " hours assumed between arrival and festival start.",
      "Rest days between stops: " + (PLANNER_ASSUMPTIONS.restDaysEnabled ? "yes" : "not modeled") + ".",
      "Timezone shifts: " + (PLANNER_ASSUMPTIONS.timezoneAware ? "accounted for" : "not modeled") + ".",
      "Travel modes considered: " + PLANNER_ASSUMPTIONS.travelModes.join(", ") + ".",
      "Visa or border requirements: not modeled.",
      "Dates and availability come from the seeded 2026 guide - verify with official festival sources before booking."
    ];
  }

  /* ── Sample itinerary ────────────────── */
  function getSampleItinerary() {
    return {
      label: "Sample: Summer Southeast Run",
      description: "This is demo output showing how the planner builds a route. It is not personalized to your filters or shortlist.",
      stops: [
        { festivalId: "bonnaroo", city: "Manchester, TN", dates: "Jun 11–15", reason: "S-tier anchor, camping" },
        { festivalId: "shaky-knees", city: "Atlanta, GA", dates: "May 1–3", reason: "A-tier rock weekend, urban" },
        { festivalId: "new-orleans-jazz-heritage-festival", city: "New Orleans, LA", dates: "Apr 24 – May 4", reason: "S-tier cultural anchor" }
      ],
      legs: [
        { from: "Atlanta, GA", to: "Manchester, TN", miles: 170, hours: 2.9 },
        { from: "Manchester, TN", to: "New Orleans, LA", miles: 530, hours: 9.1 }
      ],
      bufferNote: "6-hour arrival buffer before each festival start. No rest days modeled between stops.",
      whyThisRoute: "Clusters three high-tier festivals in the Southeast within a 6-week window. Drives are manageable single-day legs. Starts with the shortest travel commitment and builds toward the longest camping stay."
    };
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in global.navigator)) return;

    global.addEventListener("load", function onLoad() {
      global.navigator.serviceWorker.register("sw.js").catch(function onError() {});
    });
  }

  data.initializeData();
  registerServiceWorker();

  /* ── Shortlist badge (auto-render on all pages) ── */
  global.addEventListener("DOMContentLoaded", function () {
    var badge = global.document.getElementById("shortlistBadge");
    if (!badge) return;
    var count = getShortlist().length;
    badge.textContent = count > 0 ? String(count) : "";
  });

  namespace.app = {
    LEG_STATUSES: LEG_STATUSES.slice(),
    getParks: getParks,
    getParkById: getParkById,
    getVisits: getVisits,
    getVisitedMeta: getVisitedMeta,
    getVisitedParks: getVisitedParks,
    isVisited: isVisited,
    markVisited: markVisited,
    unmarkVisited: unmarkVisited,
    toggleVisited: toggleVisited,
    priorityScore: priorityScore,
    getActiveTrip: getActiveTrip,
    saveActiveTrip: saveActiveTrip,
    updateActiveTrip: updateActiveTrip,
    getRouteStore: getRouteStore,
    saveRouteStore: saveRouteStore,
    setTripWindow: setTripWindow,
    getRouteParks: getRouteParks,
    getRouteStops: getRouteStops,
    addRouteStop: addRouteStop,
    removeRouteStop: removeRouteStop,
    setRouteStopGame: setRouteStopGame,
    moveRouteStop: moveRouteStop,
    getLegById: getLegById,
    setLegStatus: setLegStatus,
    getNextTargets: getNextTargets,
    getGameById: getGameById,
    getGamesByPark: getGamesByPark,
    getUpcomingGamesByPark: getUpcomingGamesByPark,
    getFestivalDateRange: getFestivalDateRange,
    getFestivalGuideMeta: getFestivalGuideMeta,
    getHappeningSoon: getHappeningSoon,
    getSeasonGuideSummary: getSeasonGuideSummary,
    getNotes: getNotes,
    saveNote: saveNote,
    getTripScratchpad: getTripScratchpad,
    saveTripScratchpad: saveTripScratchpad,
    getLegScratchpad: getLegScratchpad,
    saveLegScratchpad: saveLegScratchpad,
    getParkScratchpad: getParkScratchpad,
    saveParkScratchpad: saveParkScratchpad,
    setSetkeeperContext: setSetkeeperContext,
    getSetkeeperContext: getSetkeeperContext,
    clearSetkeeperContext: clearSetkeeperContext,
    buildMapsUrl: buildMapsUrl,
    buildGameICS: buildGameICS,
    downloadICS: downloadICS,
    downloadGameICS: downloadGameICS,
    getShortlist: getShortlist,
    toggleShortlist: toggleShortlist,
    isShortlisted: isShortlisted,
    getBackupPayload: getBackupPayload,
    restoreBackupPayload: restoreBackupPayload,
    resetLocalData: resetLocalData,
    importFestivalPack: importFestivalPack,
    downloadBackup: downloadBackup,
    createDiagnostics: createDiagnostics,
    downloadDiagnostics: downloadDiagnostics,
    getSourceAuditRows: getSourceAuditRows,
    buildShareTripUrl: buildShareTripUrl,
    parseSharedTripState: parseSharedTripState,
    buildFlightLink: buildFlightLink,
    buildStayLink: buildStayLink,
    buildGroundLink: buildGroundLink,
    getPlannerAssumptions: getPlannerAssumptions,
    getPlannerAssumptionsSummary: getPlannerAssumptionsSummary,
    getSampleItinerary: getSampleItinerary,
    distanceMiles: utils.distanceMiles,
    formatDate: utils.formatDate,
    minutesToReadable: utils.minutesToReadable
  };
})(window);
