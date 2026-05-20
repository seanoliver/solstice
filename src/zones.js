import { ZONES as SEED } from "../config.js";

const isLocal = (z) => z.tz === "local";

// Non-local zones carry a `name` (immutable original) so an empty `label`
// can fall back to the original city name. Older persisted data lacks it.
function withName(z) {
  if (isLocal(z) || z.name) return z;
  return { ...z, name: z.label };
}

export function ensureLocal(list) {
  const normalized = list.map(withName);
  if (normalized.some(isLocal)) return normalized;
  const seedLocal = SEED.find(isLocal);
  return seedLocal ? [seedLocal, ...normalized] : normalized;
}

export function saveZones(list, storage) {
  storage.setItem("zones", JSON.stringify(list));
}

export function loadZones(storage) {
  try {
    const raw = storage.getItem("zones");
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) {
        const migrated = ensureLocal(arr);
        if (JSON.stringify(migrated) !== raw) saveZones(migrated, storage);
        return migrated;
      }
    }
  } catch { /* fall through to seed */ }
  const seeded = ensureLocal(SEED.map((z) => ({ ...z })));
  saveZones(seeded, storage);
  return seeded;
}

export function addZone(list, city) {
  if (list.some((z) => z.tz === city.tz && z.name === city.name)) return list;
  return [...list, {
    label: city.name, name: city.name,
    tz: city.tz, lat: city.lat, lon: city.lon,
  }];
}

export function removeZone(list, idx) {
  const z = list[idx];
  if (!z || isLocal(z)) return list;
  return list.filter((_, i) => i !== idx);
}

export function renameZone(list, idx, newLabel) {
  if (idx < 0 || idx >= list.length) return list;
  const label = String(newLabel ?? "").trim();
  return list.map((z, i) => (i === idx ? { ...z, label } : z));
}

export function reorderZones(list, fromIdx, toIdx) {
  if (fromIdx === toIdx) return list;
  if (fromIdx < 0 || fromIdx >= list.length) return list;
  if (toIdx < 0 || toIdx >= list.length) return list;
  if (isLocal(list[fromIdx])) return list;
  if (toIdx === 0) return list;
  const next = list.slice();
  const [item] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, item);
  return next;
}
