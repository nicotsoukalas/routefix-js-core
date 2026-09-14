/** Cálculo de distância geográfica em metros. */
export function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => deg * Math.PI / 180;
  const R = 6371000;
  const phi1 = toRad(Number(lat1));
  const phi2 = toRad(Number(lat2));
  const dPhi = toRad(Number(lat2) - Number(lat1));
  const dLambda = toRad(Number(lon2) - Number(lon1));
  const a = Math.sin(dPhi / 2) ** 2 +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
