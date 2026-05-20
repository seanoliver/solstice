import { ZONES as SEED } from "../config.js";

const isLocal = (z) => z.tz === "local";

export function ensureLocal(list) {
  if (list.some(isLocal)) return list;
  const seedLocal = SEED.find(isLocal);
  return seedLocal ? [seedLocal, ...list] : list;
}

export function saveZones(list, storage) {
  storage.setItem("zones", JSON.stringify(list));
}

export function loadZones(storage) {
  try {
    const raw = storage.getItem("zones");
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return ensureLocal(arr);
    }
  } catch { /* fall through to seed */ }
  const seeded = ensureLocal(SEED.map((z) => ({ ...z })));
  saveZones(seeded, storage);
  return seeded;
}

export function addZone(list, city) {
  if (list.some((z) => z.tz === city.tz && z.label === city.name)) return list;
  return [...list, { label: city.name, tz: city.tz, lat: city.lat, lon: city.lon }];
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
