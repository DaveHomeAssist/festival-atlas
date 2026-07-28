/**
 * Logistics deep links (delivers the web `logisticsLinks` flag). We never
 * transact — these open official/first-party search surfaces seeded by the
 * per-festival booking enrichment.
 */
import type { Booking, Festival } from "@/data/types";

function q(text: string): string {
  return encodeURIComponent(text);
}

export function flightsUrl(booking: Booking): string {
  // Google Flights search to the festival's nearest airport.
  return `https://www.google.com/travel/flights?q=${q("flights to " + booking.airportCode)}`;
}

export function lodgingUrl(booking: Booking): string {
  return `https://www.google.com/maps/search/${q(booking.lodgingQuery)}`;
}

export function groundUrl(booking: Booking): string {
  return `https://www.google.com/maps/search/${q(booking.groundQuery)}`;
}

export function directionsUrl(festival: Festival): string {
  const { lat, lng } = festival.coordinates;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

/** Falls back to a web search for the official site when no source URL is seeded. */
export function officialSellerUrl(festival: Festival): string {
  if (festival.officialUrl) return festival.officialUrl;
  return `https://www.google.com/search?q=${q(festival.name + " official tickets")}`;
}
