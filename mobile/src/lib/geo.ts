/** Haversine distance + rough drive estimate, matching the web route planner. */
import type { Coordinates } from "@/data/types";

const EARTH_MILES = 3958.8;

export function haversineMiles(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(EARTH_MILES * 2 * Math.asin(Math.sqrt(h)));
}

/** Very rough windshield-time estimate at ~55 mph average. */
export function estimateDriveHours(miles: number): number {
  return Math.round((miles / 55) * 10) / 10;
}
