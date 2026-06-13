/** Domain types for Festival Atlas mobile. Mirrors the web data model (MOBILE_APP_SPEC §3). */

export type Tier = "S" | "A" | "B";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface SearchMeta {
  localName: string;
  region: string;
}

export interface Booking {
  airportCode: string;
  lodgingQuery: string;
  groundQuery: string;
}

export interface Festival {
  id: string;
  name: string;
  genre: string;
  setting: string;
  city: string;
  tier: Tier;
  color: string;
  capacity: number | null;
  note: string;
  ticketApproach: string;
  transitNote: string;
  coordinates: Coordinates;
  specialEvents: string[];
  searchMeta: SearchMeta;
  booking: Booking;
  officialUrl: string;
  lastReviewed: string;
  sourceLabel: string;
  sourceNote: string;
  dateConfidence: string;
}

export interface Session {
  weekday: string;
  date: string; // ISO yyyy-mm-dd
  time: string | null;
  headliner: string | null;
  label: string;
}

export type SeasonStatus =
  | "happening-now"
  | "happening-soon"
  | "upcoming"
  | "past"
  | "dates-tbd";

export interface DateRange {
  start: string;
  end: string;
  count: number;
  years: string[];
  label: string;
}

export interface FestivalGuideMeta {
  dateStart: string;
  dateEnd: string;
  dateCount: number;
  dateRangeLabel: string;
  seasonStatus: SeasonStatus;
  seasonLabel: string;
  dataStatus: string;
  dataLabel: string;
  planningStatus: string;
  officialUrl: string;
  lastReviewed: string;
  reviewAgeDays: number | null;
  sourceNote: string;
  dateConfidence: string;
}

/** Per-festival attended record (FA:visits). */
export interface VisitMeta {
  visitDate?: string;
  notes?: string;
  bestFeature?: string;
}

export interface VisitRecord {
  parkId: string;
  visited: boolean;
  meta: VisitMeta;
}

/** A logged set inside the journal (FA:festivalJournalEntries). */
export interface JournalEntry {
  id: string;
  festivalId: string;
  artist: string;
  stage?: string;
  day?: string;
  rating?: number;
  note?: string;
  photoUris?: string[];
  createdAt: string;
}

export interface ActiveTrip {
  id: string;
  title: string;
  parkIds: string[];
  notes: string;
  updatedAt: string;
}
