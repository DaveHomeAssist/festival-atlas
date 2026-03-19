(function attachLogosModule(global) {
  "use strict";

  var COLOR_PAIRS = [
    ["#FF6B35", "#FFF4E8"],
    ["#2563EB", "#EFF6FF"],
    ["#DC2626", "#FEF2F2"],
    ["#0F766E", "#ECFDF5"],
    ["#D97706", "#FFFBEB"],
    ["#0284C7", "#F0F9FF"],
    ["#E11D48", "#FFF1F2"],
    ["#14B8A6", "#F0FDFA"]
  ];

  var cache = {};

  function hashString(value) {
    var hash = 0;
    for (var index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) - hash) + value.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function getInitials(name) {
    return String(name || "")
      .split(/[^a-z0-9]+/i)
      .filter(Boolean)
      .slice(0, 2)
      .map(function mapPart(part) {
        return part.charAt(0).toUpperCase();
      })
      .join("") || "MF";
  }

  function buildSvg(name) {
    var key = String(name || "").trim() || "Music Festival";
    if (cache[key]) return cache[key];

    var pair = COLOR_PAIRS[hashString(key) % COLOR_PAIRS.length];
    var initials = getInitials(key);
    var svg = [
      "<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96' role='img' aria-label='" + key.replace(/'/g, "&apos;") + "'>",
      "<defs>",
      "<linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>",
      "<stop offset='0%' stop-color='" + pair[0] + "'/>",
      "<stop offset='100%' stop-color='#111827'/>",
      "</linearGradient>",
      "</defs>",
      "<rect width='96' height='96' rx='24' fill='url(#g)'/>",
      "<circle cx='76' cy='20' r='8' fill='rgba(255,255,255,0.18)'/>",
      "<text x='48' y='56' text-anchor='middle' font-family='DM Sans, Arial, sans-serif' font-size='34' font-weight='700' fill='" + pair[1] + "'>" + initials + "</text>",
      "</svg>"
    ].join("");

    cache[key] = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
    return cache[key];
  }

  function getTeamLogo(name) {
    return buildSvg(name);
  }

  global.BPQ = global.BPQ || {};
  global.BPQ.logos = {
    getTeamLogo: getTeamLogo
  };
})(window);
