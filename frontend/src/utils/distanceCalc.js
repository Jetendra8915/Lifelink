/**
 * Haversine formula – calculates distance between two lat/lng points in km
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Fuzz a coordinate by up to `radiusKm` kilometres in a random direction.
 * Used to protect donor privacy — never expose exact residential coordinates.
 */
export function fuzzCoordinate(lat, lon, radiusKm = 2) {
  const r = radiusKm / 111; // roughly 1 degree ~ 111 km
  const angle = Math.random() * 2 * Math.PI;
  const fuzzedLat = lat + r * Math.cos(angle);
  const fuzzedLon = lon + r * Math.sin(angle);
  return { lat: fuzzedLat, lon: fuzzedLon };
}

/**
 * Alias that returns [lat, lon] array for use with Leaflet (MapView)
 */
export function fuzzCoordinates(lat, lon, radiusKm = 2) {
  const { lat: fLat, lon: fLon } = fuzzCoordinate(lat, lon, radiusKm);
  return [fLat, fLon];
}

/**
 * Returns a human-readable distance string
 */
export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
