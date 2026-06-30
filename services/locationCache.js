import {
  requestForegroundPermissionsAsync,
  getForegroundPermissionsAsync,
  getCurrentPositionAsync,
  getLastKnownPositionAsync,
  LocationAccuracy,
} from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TTL_MS = 2 * 60 * 1000; // 2 minutes
const DISK_TTL_MS = 10 * 60 * 1000; // 10 min — disk cache is staler but instant
const LAST_KNOWN_MAX_AGE = 5 * 60 * 1000; // 5 min for OS-level cache
const GPS_TIMEOUT_MS = 8000; // JS-side timeout (expo ignores maximumAge/timeout)
const STORAGE_KEY = "@location_cache";

let _cache = null; // { lat, lng, fetchedAt }
let _inflight = null; // deduplicate concurrent fetches
let _lastPermission = null; // { status, canAskAgain }
let _diskLoaded = false;

// Manual location override — in-memory only, resets on app kill.
// When set, getCachedLocation() returns these coords for ALL callers
// (home, dailypass, membership, fitness class, PT). GPS path is bypassed.
let _override = null; // { lat, lng, label }

/* ── Disk persistence helpers ──────────────────────────────────── */

let _diskLoadPromise = null; // resolved once disk load finishes

async function _loadFromDisk() {
  if (_diskLoaded) return;
  _diskLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && Date.now() - parsed.fetchedAt < DISK_TTL_MS) {
      if (!_cache) _cache = parsed;
    }
  } catch { }
}

// Eagerly load disk cache on module import so it's ready before the
// first getCachedLocation() call — shaves ~50-100 ms off cold start.
_diskLoadPromise = _loadFromDisk();

function _saveToDisk(lat, lng, fetchedAt) {
  AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ lat, lng, fetchedAt }),
  ).catch(() => { });
}

/* ── Permission helper (avoids Android hang) ───────────────────── */

async function _ensurePermission() {
  // Check first — requesting when already granted can hang on Android
  const check = await getForegroundPermissionsAsync();
  if (check.status === "granted") {
    _lastPermission = { status: check.status, canAskAgain: check.canAskAgain };
    return true;
  }
  const req = await requestForegroundPermissionsAsync();
  _lastPermission = { status: req.status, canAskAgain: req.canAskAgain };
  return req.status === "granted";
}

/* ── Background GPS refresh (fire-and-forget) ──────────────────── */

function _refreshInBackground() {
  Promise.race([
    getCurrentPositionAsync({ accuracy: LocationAccuracy.Balanced }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("bg_timeout")), GPS_TIMEOUT_MS),
    ),
  ])
    .then((pos) => {
      if (pos) {
        const now = Date.now();
        _cache = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          fetchedAt: now,
        };
        _saveToDisk(_cache.lat, _cache.lng, now);
      }
    })
    .catch(() => { });
}

/* ── Public API ─────────────────────────────────────────────────── */

/**
 * Returns { lat, lng } as fast as possible:
 *  1. In-memory cache (instant)
 *  2. AsyncStorage disk cache (< 50 ms on cold start)
 *  3. OS last-known position (instant, no GPS hardware)
 *  4. Fresh GPS fix (slow path, with JS timeout)
 *
 * Layers 2–3 return immediately and kick off a background refresh
 * so the next call gets an accurate, fresh position.
 */
export async function getCachedLocation() {
  // Manual override beats GPS — user explicitly picked this location.
  if (_override) {
    return { lat: _override.lat, lng: _override.lng };
  }

  const now = Date.now();

  // ① Memory cache
  if (_cache && now - _cache.fetchedAt < TTL_MS) {
    return { lat: _cache.lat, lng: _cache.lng };
  }

  // Deduplicate concurrent calls
  if (_inflight) return _inflight;

  _inflight = (async () => {
    try {
      // ② Disk cache (survives app kill)
      await _diskLoadPromise; // already started at import time
      if (_cache && now - _cache.fetchedAt < TTL_MS) {
        return { lat: _cache.lat, lng: _cache.lng };
      }

      // If disk cache is stale but within disk TTL, return it immediately
      // and refresh in background (no need to wait for permission first)
      if (_cache && now - _cache.fetchedAt < DISK_TTL_MS) {
        _refreshInBackground();
        return { lat: _cache.lat, lng: _cache.lng };
      }

      // Need permission for anything beyond this point
      const granted = await _ensurePermission();
      if (!granted) return null;

      // ③ OS last-known position (instant, no GPS hardware spin-up)
      const lastKnown = await getLastKnownPositionAsync({
        maxAge: LAST_KNOWN_MAX_AGE,
        requiredAccuracy: 1000,
      });

      if (lastKnown) {
        const ts = Date.now();
        _cache = {
          lat: lastKnown.coords.latitude,
          lng: lastKnown.coords.longitude,
          fetchedAt: ts,
        };
        _saveToDisk(_cache.lat, _cache.lng, ts);
        _refreshInBackground();
        return { lat: _cache.lat, lng: _cache.lng };
      }

      // ④ Fresh GPS fix (slow path) — JS-side timeout
      const position = await Promise.race([
        getCurrentPositionAsync({ accuracy: LocationAccuracy.Balanced }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("gps_timeout")), GPS_TIMEOUT_MS),
        ),
      ]);

      if (!position) return null;

      const ts = Date.now();
      _cache = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        fetchedAt: ts,
      };
      _saveToDisk(_cache.lat, _cache.lng, ts);
      return { lat: _cache.lat, lng: _cache.lng };
    } catch {
      return null;
    } finally {
      _inflight = null;
    }
  })();

  return _inflight;
}

/** Call this to force a fresh GPS fetch next time */
export function clearLocationCache() {
  _cache = null;
  _inflight = null;
  _diskLoaded = false;
  _diskLoadPromise = Promise.resolve(); // skip disk on next call since we just cleared it
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => { });
}

/** Returns cached coords without fetching (or null if no cache) */
export function peekCachedLocation() {
  const now = Date.now();
  if (_cache && now - _cache.fetchedAt < TTL_MS) {
    return { lat: _cache.lat, lng: _cache.lng };
  }
  return null;
}

/**
 * Returns the last known permission result as
 * { status, canAskAgain } — or null if permission has never been queried.
 * Does not trigger a system prompt.
 */
export function peekPermissionStatus() {
  return _lastPermission;
}

/**
 * Set a manual location override. All subsequent getCachedLocation() calls
 * across every screen will return these coords until clearLocationOverride()
 * is called or the app is killed (in-memory only, never persisted).
 */
export function setLocationOverride(override) {
  if (
    !override ||
    typeof override.lat !== "number" ||
    typeof override.lng !== "number"
  ) {
    _override = null;
    return;
  }
  _override = {
    lat: override.lat,
    lng: override.lng,
    label: override.label || "",
  };
}

/** Returns the current override or null. */
export function getLocationOverride() {
  return _override;
}

/** Drop the manual override; future getCachedLocation() calls fall back to GPS. */
export function clearLocationOverride() {
  _override = null;
}

/**
 * Queries current foreground location permission without prompting.
 * Updates the cached permission state and returns { status, canAskAgain }.
 */
export async function refreshPermissionStatus() {
  try {
    const perm = await getForegroundPermissionsAsync();
    _lastPermission = {
      status: perm.status,
      canAskAgain: perm.canAskAgain,
    };
    return _lastPermission;
  } catch {
    return _lastPermission;
  }
}
