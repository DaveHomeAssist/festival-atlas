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

  function getFestivalCalendarEvents(options) {
    var opts = options || {};
    var startDate = normalizeTripDate(opts.startDate) || "0000-01-01";
    var endDate = normalizeTripDate(opts.endDate) || "9999-12-31";
    var filter = opts.filter || "all";
    var activeTripIds = getActiveTrip().parkIds;
    var shortlistIds = getShortlist();

    return getParks().reduce(function collectEvents(events, park) {
      var guide = getFestivalGuideMeta(park);
      var onRoute = activeTripIds.indexOf(park.id) >= 0;
      var shortlisted = shortlistIds.indexOf(park.id) >= 0;
      var attended = isVisited(park.id);

      if (filter === "route" && !onRoute) return events;
      if (filter === "saved" && !shortlisted) return events;
      if (filter === "attended" && !attended) return events;
      if (filter === "next-confirmed" && guide.dataStatus !== "next-confirmed") return events;

      getGamesByPark(park.id).forEach(function mapGame(game) {
        if (!game.d || game.d < startDate || game.d > endDate) return;
        events.push({
          festivalId: park.id,
          festivalName: park.name,
          city: park.city,
          team: park.team,
          tier: park.tier,
          color: park.color,
          date: game.d,
          time: game.t || "",
          label: game.s || game.awayTeam || "Festival session",
          gameId: game.gameId,
          calendarLine: schedule && schedule.formatGameLine ? schedule.formatGameLine(game) : game.d,
          guide: guide,
          onRoute: onRoute,
          shortlisted: shortlisted,
          attended: attended
        });
      });

      return events;
    }, []).sort(function sortEvents(a, b) {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.festivalName.localeCompare(b.festivalName);
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
    } else if (park.dateConfidence === "outreach-review") {
      dataStatus = "needs-review";
      dataLabel = "Review ops source";
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

  function normalizeTextArray(value, limit) {
    var values = Array.isArray(value) ? value : (value ? [value] : []);
    return values
      .map(function mapText(item) { return String(item || "").trim(); })
      .filter(Boolean)
      .slice(0, limit || 8);
  }

  function normalizeOpsSources(value) {
    if (!Array.isArray(value)) return [];
    return value.map(function mapSource(source) {
      if (!source || typeof source !== "object") return null;
      var url = String(source.url || "").trim();
      if (!url) return null;
      return {
        label: String(source.label || "Source").trim(),
        url: url
      };
    }).filter(Boolean).slice(0, 8);
  }

  function normalizeImportedOps(rawPark) {
    if (!rawPark || typeof rawPark !== "object") return null;
    var rawOps = rawPark.ops && typeof rawPark.ops === "object" ? rawPark.ops : {};
    var sources = normalizeOpsSources(rawOps.sources || rawPark.sources);
    if (rawPark.officialUrl || rawPark.website) {
      sources.unshift({
        label: "Official site",
        url: String(rawPark.officialUrl || rawPark.website).trim()
      });
    }
    sources = sources.filter(function uniqueSource(source, index) {
      return sources.findIndex(function findSame(candidate) {
        return candidate.url === source.url && candidate.label === source.label;
      }) === index;
    });

    var ops = {
      packId: String(rawOps.packId || rawPark.packId || "").trim(),
      status: String(rawOps.status || rawPark.status || "Needs verification").trim(),
      region: String(rawOps.region || rawPark.region || (rawPark.searchMeta && rawPark.searchMeta.region) || "").trim(),
      venue: String(rawOps.venue || rawPark.venue || "").trim(),
      organizer: String(rawOps.organizer || rawPark.organizer || "").trim(),
      headliners: String(rawOps.headliners || rawPark.headliners || "").trim(),
      attendance: String(rawOps.attendance || rawPark.attendance || "").trim(),
      publicContact: String(rawOps.publicContact || rawPark.publicContact || rawPark.contact || "").trim(),
      eventHours: String(rawOps.eventHours || rawPark.eventHours || "").trim(),
      loadIn: String(rawOps.loadIn || rawPark.loadIn || "").trim(),
      productionNotes: String(rawOps.productionNotes || rawPark.productionNotes || "").trim(),
      opsModel: String(rawOps.opsModel || rawPark.opsModel || "").trim(),
      marketWindow: String(rawOps.marketWindow || rawPark.marketWindow || "").trim(),
      outreachPriority: String(rawOps.outreachPriority || rawPark.outreachPriority || "").trim(),
      ticketUrl: String(rawOps.ticketUrl || rawPark.ticketUrl || rawPark.ticket || "").trim(),
      opportunitySignals: normalizeTextArray(rawOps.opportunitySignals || rawPark.opportunitySignals, 8),
      watchItems: normalizeTextArray(rawOps.watchItems || rawPark.watchItems, 8),
      sources: sources
    };

    var hasOps = Object.keys(ops).some(function hasValue(key) {
      if (key === "sources" || key === "opportunitySignals" || key === "watchItems") return ops[key].length > 0;
      return Boolean(ops[key]);
    });

    return hasOps ? ops : null;
  }

  function mergeImportedPark(existingPark, importedPark) {
    var merged = cloneValue(existingPark);
    var existingOps = existingPark.ops && typeof existingPark.ops === "object" ? existingPark.ops : {};
    var incomingOps = importedPark.ops && typeof importedPark.ops === "object" ? importedPark.ops : {};

    if (Object.keys(incomingOps).length) {
      merged.ops = Object.assign({}, existingOps, incomingOps, {
        importedAt: todayIsoDate()
      });
    }

    if (existingPark.imported) {
      if (!merged.officialUrl && importedPark.officialUrl) merged.officialUrl = importedPark.officialUrl;
      if (!merged.sourceNote && importedPark.sourceNote) merged.sourceNote = importedPark.sourceNote;
      if (!merged.lastReviewed && importedPark.lastReviewed) merged.lastReviewed = importedPark.lastReviewed;
      if (!merged.dateConfidence && importedPark.dateConfidence) merged.dateConfidence = importedPark.dateConfidence;
    }
    if (!merged.searchMeta && importedPark.searchMeta) merged.searchMeta = importedPark.searchMeta;
    if (!merged.booking && importedPark.booking) merged.booking = importedPark.booking;
    merged.outreachPack = Boolean(importedPark.ops) || Boolean(existingPark.outreachPack);

    return merged;
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
      officialUrl: String(rawPark.officialUrl || rawPark.website || "").trim(),
      lastReviewed: normalizeTripDate(rawPark.lastReviewed) || todayIsoDate(),
      sourceLabel: (rawPark.officialUrl || rawPark.website) ? "Official festival source" : "Imported source needed",
      sourceNote: String(rawPark.sourceNote || "Imported festival pack entry; verify before booking.").trim(),
      dateConfidence: String(rawPark.dateConfidence || "imported").trim(),
      ops: normalizeImportedOps(rawPark),
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

  function normalizeFestivalPack(payload) {
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.festivals)) {
      throw new TypeError("Festival pack must include a festivals array");
    }

    var importedParks = payload.festivals.map(normalizeImportedPark).filter(Boolean);
    if (!importedParks.length) {
      throw new TypeError("Festival pack did not include any valid festivals");
    }

    return importedParks;
  }

  function getRawPackSessions(payload, park) {
    var rawSessions = [];
    var sourcePark = payload.festivals.find(function match(rawPark) {
      return normalizeFestivalId(rawPark.id, rawPark.name) === park.id;
    });
    if (sourcePark && Array.isArray(sourcePark.sessions)) rawSessions = sourcePark.sessions;
    else if (payload.sessions && Array.isArray(payload.sessions[park.id])) rawSessions = payload.sessions[park.id];

    return {
      sourcePark: sourcePark,
      sessions: rawSessions.map(normalizeImportedSession).filter(Boolean).sort(function sortByDate(a, b) {
        return a.d.localeCompare(b.d);
      })
    };
  }

  function summarizePreviewValue(value) {
    if (value === undefined || value === null || value === "") return "";
    if (Array.isArray(value)) return value.length ? value.join(", ").slice(0, 90) : "";
    if (typeof value === "object") return JSON.stringify(value).slice(0, 90);
    return String(value).slice(0, 90);
  }

  function previewChangedFields(existingPark, mergedPark) {
    if (!existingPark) return [];
    var fields = [
      "officialUrl",
      "lastReviewed",
      "sourceNote",
      "dateConfidence",
      "searchMeta",
      "booking",
      "ops",
      "ticketApproach",
      "transitNote",
      "note",
      "roof",
      "tier"
    ];

    return fields.reduce(function collect(changes, field) {
      var before = summarizePreviewValue(existingPark[field]);
      var after = summarizePreviewValue(mergedPark[field]);
      if (before !== after) {
        changes.push({
          field: field,
          before: before || "blank",
          after: after || "blank"
        });
      }
      return changes;
    }, []);
  }

  function parseAttendanceScore(value) {
    var text = String(value || "").replace(/,/g, "");
    var match = text.match(/(\d+(?:\.\d+)?)\s*(m|million|k|thousand)?/i);
    if (!match) return 0;
    var number = Number(match[1]);
    var suffix = String(match[2] || "").toLowerCase();
    if (suffix === "m" || suffix === "million") number *= 1000000;
    if (suffix === "k" || suffix === "thousand") number *= 1000;
    if (number >= 200000) return 12;
    if (number >= 90000) return 9;
    if (number >= 45000) return 6;
    if (number >= 15000) return 3;
    return 0;
  }

  function getOpsOpportunityScore(parkOrId) {
    var park = typeof parkOrId === "string" ? getParkById(parkOrId) : parkOrId;
    var ops = park && park.ops && typeof park.ops === "object" ? park.ops : null;
    if (!park || !ops) {
      return {
        score: 0,
        tier: "No ops intel",
        factors: [],
        warnings: ["No ops intelligence loaded"]
      };
    }

    var score = 20;
    var factors = ["Ops intelligence loaded"];
    var warnings = [];
    var priority = String(ops.outreachPriority || "").toLowerCase();
    var complexityText = [
      ops.opsModel,
      ops.productionNotes,
      ops.loadIn,
      ops.eventHours
    ].join(" ").toLowerCase();

    if (ops.publicContact) { score += 15; factors.push("Public contact available"); }
    else warnings.push("No public contact captured");

    if ((ops.sources || []).length) { score += Math.min(12, ops.sources.length * 4); factors.push("Source links captured"); }
    else warnings.push("No ops source links");

    if (ops.ticketUrl) { score += 5; factors.push("Ticket path known"); }
    if (ops.marketWindow) { score += 5; factors.push("Market window known"); }
    if (ops.eventHours) { score += 5; factors.push("Public hours known"); }
    if (ops.loadIn) { score += 5; factors.push("Load-in proxy known"); }
    if (priority.indexOf("high") >= 0) { score += 16; factors.push("High outreach priority"); }
    else if (priority.indexOf("medium") >= 0) { score += 8; factors.push("Medium outreach priority"); }

    if (/(stadium|citywide|broadcast|multi|campus|downtown|waterfront|stages)/i.test(complexityText)) {
      score += 10;
      factors.push("Complex production footprint");
    }

    var signalScore = Math.min(12, (ops.opportunitySignals || []).length * 3);
    if (signalScore) {
      score += signalScore;
      factors.push("Opportunity signals captured");
    }

    score += parseAttendanceScore(ops.attendance);

    if (!park.officialUrl) {
      score -= 6;
      warnings.push("Official URL missing");
    }
    if (park.dateConfidence === "outreach-review" || String(ops.status || "").toLowerCase().indexOf("verify") >= 0) {
      warnings.push("Needs source verification");
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    return {
      score: score,
      tier: score >= 80 ? "Prime" : (score >= 62 ? "Strong" : (score >= 42 ? "Developing" : "Low")),
      factors: factors.slice(0, 6),
      warnings: warnings.slice(0, 5)
    };
  }

  function getOpsOpportunityRows(options) {
    var opts = options || {};
    var rows = getParks().map(function mapPark(park) {
      var score = getOpsOpportunityScore(park);
      var guide = getFestivalGuideMeta(park);
      return {
        id: park.id,
        name: park.name,
        city: park.city,
        dateRangeLabel: guide.dateRangeLabel,
        dataStatus: guide.dataStatus,
        dataLabel: guide.dataLabel,
        score: score.score,
        tier: score.tier,
        factors: score.factors,
        warnings: score.warnings,
        hasOps: Boolean(park.ops)
      };
    }).filter(function keep(row) {
      if (opts.opsOnly) return row.hasOps;
      return row.hasOps || row.score > 0;
    }).sort(function sortRows(a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    });

    return rows;
  }

  function needsSourceVerification(park, meta, ops) {
    if (!park || !meta) return false;
    if (meta.dataStatus === "needs-review" || meta.dataStatus === "needs-recheck" || meta.dataStatus === "next-confirmed") return true;
    if (meta.dateConfidence === "outreach-review" || meta.dateConfidence === "imported") return true;
    if (ops && String(ops.status || "").toLowerCase().indexOf("verify") >= 0) return true;
    if (!meta.officialUrl) return true;
    return false;
  }

  function getSourceVerificationQueue() {
    return getParks().map(function mapPark(park) {
      var meta = getFestivalGuideMeta(park);
      var ops = getFestivalOps(park.id);
      var score = getOpsOpportunityScore(park);
      return {
        id: park.id,
        name: park.name,
        city: park.city,
        dateRangeLabel: meta.dateRangeLabel,
        dataStatus: meta.dataStatus,
        dataLabel: meta.dataLabel,
        dateConfidence: meta.dateConfidence,
        officialUrl: meta.officialUrl,
        sourceNote: meta.sourceNote,
        lastReviewed: meta.lastReviewed,
        opsStatus: ops ? ops.status : "",
        score: score.score,
        scoreTier: score.tier,
        reason: meta.dataStatus === "next-confirmed" ? "Next season date needs 2026 follow-up" :
          (!meta.officialUrl ? "Official source missing" :
          (meta.dateConfidence === "outreach-review" || (ops && String(ops.status || "").toLowerCase().indexOf("verify") >= 0) ? "Ops source needs verification" : meta.dataLabel))
      };
    }).filter(function keep(row) {
      var park = getParkById(row.id);
      return needsSourceVerification(park, getFestivalGuideMeta(park), getFestivalOps(row.id));
    }).sort(function sortRows(a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    });
  }

  function previewFestivalPack(payload) {
    var importedParks = normalizeFestivalPack(payload);
    var currentParks = getParks();
    var existingIds = currentParks.map(function mapExisting(park) { return park.id; });
    var rows = importedParks.map(function previewPark(park) {
      var existing = currentParks.find(function findExisting(candidate) { return candidate.id === park.id; });
      var merged = existing ? mergeImportedPark(existing, park) : park;
      var packSessions = getRawPackSessions(payload, park);
      var shouldOverwriteSchedule = Boolean(payload.overwriteSchedules || (packSessions.sourcePark && packSessions.sourcePark.overwriteSchedule));
      var hasExistingSessions = existingIds.indexOf(park.id) >= 0 && getGamesByPark(park.id).length > 0;
      var changes = previewChangedFields(existing, merged);
      var score = getOpsOpportunityScore(merged);

      return {
        id: park.id,
        name: park.name,
        city: park.city,
        action: existing ? (changes.length ? "merge" : "unchanged") : "create",
        changeCount: changes.length,
        changes: changes.slice(0, 6),
        sessionCount: packSessions.sessions.length,
        scheduleAction: packSessions.sessions.length && (!hasExistingSessions || shouldOverwriteSchedule) ? "write" : (hasExistingSessions ? "preserve" : "none"),
        sourceNeedsVerification: needsSourceVerification(merged, getFestivalGuideMeta(merged), merged.ops),
        score: score.score,
        scoreTier: score.tier,
        warnings: score.warnings
      };
    });

    return {
      label: payload.label || payload.id || "Festival pack",
      payloadId: payload.id || "",
      festivals: rows.length,
      created: rows.filter(function created(row) { return row.action === "create"; }).length,
      merged: rows.filter(function merged(row) { return row.action === "merge"; }).length,
      unchanged: rows.filter(function unchanged(row) { return row.action === "unchanged"; }).length,
      sessions: rows.reduce(function count(total, row) { return total + row.sessionCount; }, 0),
      scheduleWrites: rows.filter(function writes(row) { return row.scheduleAction === "write"; }).length,
      verificationNeeded: rows.filter(function verify(row) { return row.sourceNeedsVerification; }).length,
      rows: rows
    };
  }

  function importFestivalPack(payload) {
    var importedParks = normalizeFestivalPack(payload);

    var importedIds = importedParks.map(function mapId(park) { return park.id; });
    var currentParks = getParks();
    var existingIds = currentParks.map(function mapExisting(park) { return park.id; });
    var importedById = importedParks.reduce(function indexImported(map, park) {
      map[park.id] = park;
      return map;
    }, {});
    var nextParks = currentParks.map(function mergeExisting(park) {
      return importedById[park.id] ? mergeImportedPark(park, importedById[park.id]) : park;
    });

    importedParks.forEach(function appendNew(park) {
      if (existingIds.indexOf(park.id) === -1) nextParks.push(park);
    });

    var customSchedule = storage.get(data.KEYS.festivalCustomSchedule) || {};
    if (!customSchedule || typeof customSchedule !== "object" || Array.isArray(customSchedule)) customSchedule = {};

    importedParks.forEach(function importSessions(park) {
      var packSessions = getRawPackSessions(payload, park);
      var sourcePark = packSessions.sourcePark;
      var sessions = packSessions.sessions;

      var shouldOverwriteSchedule = Boolean(payload.overwriteSchedules || (sourcePark && sourcePark.overwriteSchedule));
      var hasExistingSessions = existingIds.indexOf(park.id) >= 0 && getGamesByPark(park.id).length > 0;
      if (sessions.length && (!hasExistingSessions || shouldOverwriteSchedule)) customSchedule[park.id] = sessions;
      else if (!hasExistingSessions && !sessions.length) delete customSchedule[park.id];
    });

    storage.set(data.KEYS.parks, nextParks);
    storage.flush(data.KEYS.parks);
    storage.set(data.KEYS.festivalCustomSchedule, customSchedule);
    storage.flush(data.KEYS.festivalCustomSchedule);

    return {
      importedAt: nowIso(),
      festivals: importedParks.length,
      created: importedIds.filter(function isNew(parkId) { return existingIds.indexOf(parkId) === -1; }).length,
      merged: importedIds.filter(function isExisting(parkId) { return existingIds.indexOf(parkId) >= 0; }).length,
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
    var verificationRows = getSourceVerificationQueue();

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
        sourceVerificationQueue: verificationRows.length,
        nextConfirmed: auditRows.filter(function next(row) { return row.dataStatus === "next-confirmed"; }).length,
        opsIntelligence: parks.filter(function hasOps(park) { return Boolean(park.ops); }).length
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

  function getFestivalOps(parkId) {
    var park = getParkById(parkId);
    return park && park.ops && typeof park.ops === "object" ? cloneValue(park.ops) : null;
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
    getFestivalCalendarEvents: getFestivalCalendarEvents,
    getFestivalDateRange: getFestivalDateRange,
    getFestivalGuideMeta: getFestivalGuideMeta,
    getFestivalOps: getFestivalOps,
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
    previewFestivalPack: previewFestivalPack,
    importFestivalPack: importFestivalPack,
    downloadBackup: downloadBackup,
    createDiagnostics: createDiagnostics,
    downloadDiagnostics: downloadDiagnostics,
    getSourceAuditRows: getSourceAuditRows,
    getSourceVerificationQueue: getSourceVerificationQueue,
    getOpsOpportunityScore: getOpsOpportunityScore,
    getOpsOpportunityRows: getOpsOpportunityRows,
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
