// Optional IP-based city detection for the local zone. Cached in
// localStorage with a TTL so the network is hit rarely, not per tab.
// Any failure returns null → caller falls back to the timezone city.

const KEY = "geoCity";
const TTL_MS = 24 * 60 * 60 * 1000; // 1 day

export function readCachedCity(storage, now = Date.now()) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const { city, ts } = JSON.parse(raw);
    if (!city || typeof ts !== "number") return null;
    if (now - ts > TTL_MS) return null; // stale → caller should refetch
    return city;
  } catch {
    return null;
  }
}

export function writeCachedCity(storage, city, now = Date.now()) {
  storage.setItem(KEY, JSON.stringify({ city, ts: now }));
}

export async function fetchCity(fetchImpl = fetch) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetchImpl("https://ipapi.co/json/", {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const city =
      data && typeof data.city === "string" ? data.city.trim() : "";
    return city || null;
  } catch {
    return null;
  }
}
