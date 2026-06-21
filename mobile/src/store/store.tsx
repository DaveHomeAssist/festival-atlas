/**
 * Local-first app store. Holds the user-owned state (attended visits, route,
 * shortlist, journal) hydrated from AsyncStorage on mount and persisted on
 * every change. No network, no account — the device is the source of truth.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { FESTIVALS, getSessions } from "@/data/seed";
import type {
  ActiveTrip,
  Festival,
  FestivalGuideMeta,
  JournalEntry,
  VisitRecord,
} from "@/data/types";
import { getGuideMeta } from "@/lib/season";
import { KEYS } from "./keys";
import {
  exportAll as storageExportAll,
  importAll as storageImportAll,
  readJson,
  resetAll as storageResetAll,
  writeJson,
} from "./storage";

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyTrip(): ActiveTrip {
  return {
    id: newId("trip"),
    title: "Next Festival Run",
    parkIds: [],
    notes: "",
    updatedAt: new Date().toISOString(),
  };
}

interface StoreValue {
  ready: boolean;
  festivals: Festival[];
  visits: VisitRecord[];
  trip: ActiveTrip;
  shortlist: string[];
  journal: JournalEntry[];

  // derived
  metaFor: (festivalId: string) => FestivalGuideMeta;
  isVisited: (festivalId: string) => boolean;
  isOnRoute: (festivalId: string) => boolean;
  isShortlisted: (festivalId: string) => boolean;

  // actions
  toggleShortlist: (festivalId: string) => void;
  addToRoute: (festivalId: string) => void;
  removeFromRoute: (festivalId: string) => void;
  reorderRoute: (parkIds: string[]) => void;
  setTripNotes: (notes: string) => void;
  markAttended: (
    festivalId: string,
    meta: { visitDate?: string; notes?: string; bestFeature?: string }
  ) => void;
  unmarkAttended: (festivalId: string) => void;
  addJournalEntry: (entry: Omit<JournalEntry, "id" | "createdAt">) => void;
  removeJournalEntry: (entryId: string) => void;

  // ops
  exportBackup: () => Promise<Record<string, unknown>>;
  importBackup: (payload: Record<string, unknown>) => Promise<number>;
  resetData: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [trip, setTrip] = useState<ActiveTrip>(emptyTrip);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);

  // Hydrate from disk once.
  useEffect(() => {
    let active = true;
    (async () => {
      const [v, t, s, j] = await Promise.all([
        readJson<VisitRecord[]>(KEYS.visits, []),
        readJson<ActiveTrip | null>(KEYS.activeTrip, null),
        readJson<string[]>(KEYS.shortlistFestivalIds, []),
        readJson<JournalEntry[]>(KEYS.festivalJournalEntries, []),
      ]);
      if (!active) return;
      setVisits(Array.isArray(v) ? v : []);
      setTrip(t && Array.isArray(t.parkIds) ? t : emptyTrip());
      setShortlist(Array.isArray(s) ? s : []);
      setJournal(Array.isArray(j) ? j : []);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Persist on change (after hydration).
  useEffect(() => {
    if (ready) void writeJson(KEYS.visits, visits);
  }, [ready, visits]);
  useEffect(() => {
    if (ready) void writeJson(KEYS.activeTrip, trip);
  }, [ready, trip]);
  useEffect(() => {
    if (ready) void writeJson(KEYS.shortlistFestivalIds, shortlist);
  }, [ready, shortlist]);
  useEffect(() => {
    if (ready) void writeJson(KEYS.festivalJournalEntries, journal);
  }, [ready, journal]);

  const isVisited = useCallback(
    (id: string) => visits.some((rec) => rec.parkId === id && rec.visited),
    [visits]
  );
  const isOnRoute = useCallback(
    (id: string) => trip.parkIds.includes(id),
    [trip.parkIds]
  );
  const isShortlisted = useCallback(
    (id: string) => shortlist.includes(id),
    [shortlist]
  );

  const metaFor = useCallback(
    (id: string): FestivalGuideMeta => {
      const festival = FESTIVALS.find((f) => f.id === id)!;
      return getGuideMeta(festival, getSessions(id), {
        isVisited: isVisited(id),
        isOnRoute: isOnRoute(id),
      });
    },
    [isVisited, isOnRoute]
  );

  const toggleShortlist = useCallback((id: string) => {
    setShortlist((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const touchTrip = (next: Omit<ActiveTrip, "updatedAt">): ActiveTrip => ({
    ...next,
    updatedAt: new Date().toISOString(),
  });

  const addToRoute = useCallback((id: string) => {
    setTrip((prev) =>
      prev.parkIds.includes(id)
        ? prev
        : touchTrip({ ...prev, parkIds: [...prev.parkIds, id] })
    );
  }, []);
  const removeFromRoute = useCallback((id: string) => {
    setTrip((prev) =>
      touchTrip({ ...prev, parkIds: prev.parkIds.filter((x) => x !== id) })
    );
  }, []);
  const reorderRoute = useCallback((parkIds: string[]) => {
    setTrip((prev) => touchTrip({ ...prev, parkIds }));
  }, []);
  const setTripNotes = useCallback((notes: string) => {
    setTrip((prev) => touchTrip({ ...prev, notes }));
  }, []);

  const markAttended = useCallback(
    (
      id: string,
      meta: { visitDate?: string; notes?: string; bestFeature?: string }
    ) => {
      setVisits((prev) => {
        const without = prev.filter((rec) => rec.parkId !== id);
        return [...without, { parkId: id, visited: true, meta }];
      });
    },
    []
  );
  const unmarkAttended = useCallback((id: string) => {
    setVisits((prev) => prev.filter((rec) => rec.parkId !== id));
  }, []);

  const addJournalEntry = useCallback(
    (entry: Omit<JournalEntry, "id" | "createdAt">) => {
      setJournal((prev) => [
        { ...entry, id: newId("set"), createdAt: new Date().toISOString() },
        ...prev,
      ]);
    },
    []
  );
  const removeJournalEntry = useCallback((entryId: string) => {
    setJournal((prev) => prev.filter((e) => e.id !== entryId));
  }, []);

  const exportBackup = useCallback(() => storageExportAll(), []);
  const importBackup = useCallback(async (payload: Record<string, unknown>) => {
    const count = await storageImportAll(payload);
    // re-hydrate in-memory state from the freshly written keys
    const [v, t, s, j] = await Promise.all([
      readJson<VisitRecord[]>(KEYS.visits, []),
      readJson<ActiveTrip | null>(KEYS.activeTrip, null),
      readJson<string[]>(KEYS.shortlistFestivalIds, []),
      readJson<JournalEntry[]>(KEYS.festivalJournalEntries, []),
    ]);
    setVisits(Array.isArray(v) ? v : []);
    setTrip(t && Array.isArray(t.parkIds) ? t : emptyTrip());
    setShortlist(Array.isArray(s) ? s : []);
    setJournal(Array.isArray(j) ? j : []);
    return count;
  }, []);
  const resetData = useCallback(async () => {
    await storageResetAll();
    setVisits([]);
    setTrip(emptyTrip());
    setShortlist([]);
    setJournal([]);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      festivals: FESTIVALS,
      visits,
      trip,
      shortlist,
      journal,
      metaFor,
      isVisited,
      isOnRoute,
      isShortlisted,
      toggleShortlist,
      addToRoute,
      removeFromRoute,
      reorderRoute,
      setTripNotes,
      markAttended,
      unmarkAttended,
      addJournalEntry,
      removeJournalEntry,
      exportBackup,
      importBackup,
      resetData,
    }),
    [
      ready,
      visits,
      trip,
      shortlist,
      journal,
      metaFor,
      isVisited,
      isOnRoute,
      isShortlisted,
      toggleShortlist,
      addToRoute,
      removeFromRoute,
      reorderRoute,
      setTripNotes,
      markAttended,
      unmarkAttended,
      addJournalEntry,
      removeJournalEntry,
      exportBackup,
      importBackup,
      resetData,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
