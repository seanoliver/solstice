export function zoneNow(tz, at = new Date()) {
  const opts = { hour: "numeric", minute: "2-digit", hour12: true };
  if (tz !== "local") opts.timeZone = tz;
  const parts = new Intl.DateTimeFormat("en-US", {
    ...opts, hourCycle: "h23",
  }).formatToParts(at);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const label = new Intl.DateTimeFormat("en-US", opts).format(at);
  return { hour, minute, label };
}
