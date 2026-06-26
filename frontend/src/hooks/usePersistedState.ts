/**
 * Persisted page state — survives navigation (and reload) by mirroring a value
 * to localStorage with a sliding TTL.
 *
 * Why: page filters / dates / generated reports live in component-local
 * `useState` inside per-page hooks; react-router unmounts a page on navigation,
 * so that state is garbage-collected. Persisting it above that boundary keeps
 * it; the stored timestamp lets us reset only after the page has been idle for
 * longer than `ttlMs` (default 1 hour).
 *
 * Reset rule: an entry is discarded when (now - lastTouch) > ttlMs. `lastTouch`
 * is refreshed on every save — and a save runs on mount (sliding window) — so
 * state the user keeps coming back to within the hour never drops.
 *
 * Two shapes:
 *  - `loadPersisted` / `savePersisted` — primitives. Use with a normal
 *    `useState(() => loadPersisted(...))` + a save `useEffect` when the setter is
 *    fed into a `useCallback` dependency array (eslint's exhaustive-deps only
 *    treats a real `useState` setter as stable, not one returned from a hook).
 *  - `usePersistedState` — drop-in `useState` replacement for the simple case
 *    where the setter is NOT used in a dependency array.
 */

import { useEffect, useState } from "react"

const ONE_HOUR_MS = 60 * 60 * 1000

interface Stored<T> {
  v: T
  t: number
}

/** Pure expiry predicate. Exported so the dev self-check can exercise it. */
export function isExpired(t: number, now: number, ttlMs: number): boolean {
  return !Number.isFinite(t) || now - t > ttlMs
}

/** Read a persisted value, or compute `fallback` when missing / expired / corrupt. */
export function loadPersisted<T>(
  key: string,
  fallback: T | (() => T),
  ttlMs: number = ONE_HOUR_MS,
): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as Stored<T>
      if (parsed && !isExpired(parsed.t, Date.now(), ttlMs)) return parsed.v
      localStorage.removeItem(key)
    }
  } catch {
    /* corrupt JSON, or no storage (private mode / SSR) — fall through to default */
  }
  return typeof fallback === "function" ? (fallback as () => T)() : fallback
}

/** Persist a value, stamping it with the current time (refreshes the sliding TTL). */
export function savePersisted<T>(key: string, value: T): void {
  try {
    // ponytail: localStorage caps ~5MB; report payloads are well under. A
    // quota/serialize failure silently no-ops — state still works in-session.
    localStorage.setItem(key, JSON.stringify({ v: value, t: Date.now() } satisfies Stored<T>))
  } catch {
    /* ignore */
  }
}

/** Drop-in `useState` replacement, persisted with a sliding TTL. */
export function usePersistedState<T>(
  key: string,
  initial: T | (() => T),
  ttlMs: number = ONE_HOUR_MS,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => loadPersisted(key, initial, ttlMs))
  useEffect(() => {
    savePersisted(key, state)
  }, [key, state])
  return [state, setState]
}

// Dev-only self-check: throws (and shows the Vite error overlay) if the expiry
// rule regresses. No test runner is wired in this repo, so this is the smallest
// thing that fails loudly when the logic breaks. Stripped from prod builds.
if (import.meta.env.DEV) {
  const H = ONE_HOUR_MS
  const ok =
    !isExpired(1000, 1000 + H - 1, H) && // fresh just inside the window
    isExpired(1000, 1000 + H + 1, H) && //  expired just past the window
    isExpired(Number.NaN, 5, H) //          missing timestamp counts as expired
  if (!ok) throw new Error("usePersistedState: TTL self-check failed")
}
