const RAD = Math.PI / 180;

function toJulian(date) { return date.valueOf() / 86400000 + 2440587.5; }
function fromJulian(j) { return new Date((j - 2440587.5) * 86400000); }

export function sunTimesUTC(date, lat, lon) {
  const J = toJulian(date);
  const n = Math.round(J - 2451545.0 + 0.0008);
  const Jstar = n - lon / 360;
  const M = (357.5291 + 0.98560028 * Jstar) % 360;
  const Mrad = M * RAD;
  const C = 1.9148 * Math.sin(Mrad) + 0.0200 * Math.sin(2 * Mrad)
          + 0.0003 * Math.sin(3 * Mrad);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const lambdaRad = lambda * RAD;
  const Jtransit = 2451545.0 + Jstar + 0.0053 * Math.sin(Mrad)
                 - 0.0069 * Math.sin(2 * lambdaRad);
  const sinDec = Math.sin(lambdaRad) * Math.sin(23.4397 * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * sinDec)
             / (Math.cos(lat * RAD) * cosDec);
  if (cosH > 1)  return { sunrise: null, sunset: null, polar: "night" };
  if (cosH < -1) return { sunrise: null, sunset: null, polar: "day" };
  const H = Math.acos(cosH) / RAD;
  return {
    sunrise: fromJulian(Jtransit - H / 360),
    sunset:  fromJulian(Jtransit + H / 360),
  };
}
