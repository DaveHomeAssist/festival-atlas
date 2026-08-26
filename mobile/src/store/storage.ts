/**
 * Thin async KV wrapper over AsyncStorage that preserves the exact web JSON
 * shape under the FA: namespace. This is the on-device source of truth; the
 * full export/import (backup) round-trips through these same keys.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { KEYS, NAMESPACE, namespaced } from "./keys";

/**
 * Persistence failures must be visible (audit M-3): the device is the source
 * of truth, so a swallowed AsyncStorage error silently loses route, shortlist,
 * attended history, and journal data on restart. Every failed read parse or
 * write is reported to subscribers so the store can surface it in the UI.
 */
export interface StorageFailure {
  op: "read" | "write";
  key: string;
  message: string;
}

type StorageFailureListener = (failure: StorageFailure) => void;

const failureListeners = new Set<StorageFailureListener>();

export function onStorageFailure(listener: StorageFailureListener): () => void {
  failureListeners.add(listener);
  return () => {
    failureListeners.delete(listener);
  };
}

function reportFailure(op: "read" | "write", key: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  failureListeners.forEach((listener) => {
    try {
      listener({ op, key, message });
    } catch {
      /* a broken listener must not break storage */
    }
  });
}

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(namespaced(key));
  } catch (error) {
    reportFailure("read", key, error);
    return fallback;
  }
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    // Malformed stored data: quarantine the raw value before falling back so
    // the next persist cycle cannot silently overwrite the only copy.
    try {
      await AsyncStorage.setItem(namespaced(`corrupt:${key}`), raw);
    } catch {
      /* best effort — the report below is still emitted */
    }
    reportFailure("read", key, error);
    return fallback;
  }
}

/** Returns true when the value reached device storage. */
export async function writeJson<T>(key: string, value: T): Promise<boolean> {
  try {
    await AsyncStorage.setItem(namespaced(key), JSON.stringify(value));
    return true;
  } catch (error) {
    reportFailure("write", key, error);
    return false;
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(namespaced(key));
  } catch (error) {
    reportFailure("write", key, error);
  }
}

/** Export every FA: key as a plain object — the backup payload (web-compatible). */
export async function exportAll(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  await Promise.all(
    Object.values(KEYS).map(async (key) => {
      const raw = await AsyncStorage.getItem(namespaced(key));
      if (raw != null) {
        try {
          out[key] = JSON.parse(raw);
        } catch {
          out[key] = raw;
        }
      }
    })
  );
  return out;
}

/**
 * Import a backup payload. Accepts either bare keys ("visits") or fully
 * namespaced keys ("FA:visits") so web and mobile exports both restore.
 */
export async function importAll(payload: Record<string, unknown>): Promise<number> {
  let count = 0;
  await Promise.all(
    Object.entries(payload).map(async ([rawKey, value]) => {
      const key = rawKey.startsWith(`${NAMESPACE}:`)
        ? rawKey.slice(NAMESPACE.length + 1)
        : rawKey;
      const known = (Object.values(KEYS) as string[]).includes(key);
      if (!known) return;
      await AsyncStorage.setItem(namespaced(key), JSON.stringify(value));
      count += 1;
    })
  );
  return count;
}

export async function resetAll(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((key) => removeKey(key)));
}
