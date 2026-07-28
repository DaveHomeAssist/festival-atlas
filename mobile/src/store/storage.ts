/**
 * Thin async KV wrapper over AsyncStorage that preserves the exact web JSON
 * shape under the FA: namespace. This is the on-device source of truth; the
 * full export/import (backup) round-trips through these same keys.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { KEYS, NAMESPACE, namespaced } from "./keys";

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(namespaced(key));
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(namespaced(key), JSON.stringify(value));
  } catch {
    // Local-first: a failed write is non-fatal; in-memory state stays correct.
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(namespaced(key));
  } catch {
    /* noop */
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
