export interface Vereda {
  id: string;
  name: string;
  /** Approximate centroid coordinates */
  lat: number;
  lng: number;
}

/** Representative veredas of the Santa Elena corregimiento, Medellín */
export const VEREDAS: Vereda[] = [
  { id: "barro-blanco", name: "Barro Blanco", lat: 6.2285, lng: -75.5012 },
  { id: "el-placer", name: "El Placer", lat: 6.2201, lng: -75.4978 },
  { id: "el-llano", name: "El Llano", lat: 6.2150, lng: -75.5100 },
  { id: "piedras-blancas", name: "Piedras Blancas", lat: 6.2350, lng: -75.4900 },
  { id: "media-luna", name: "Media Luna", lat: 6.2420, lng: -75.5050 },
  { id: "el-cerro", name: "El Cerro", lat: 6.2480, lng: -75.4850 },
  { id: "santa-elena-centro", name: "Santa Elena Centro", lat: 6.2300, lng: -75.4950 },
  { id: "pantanillo", name: "Pantanillo", lat: 6.2100, lng: -75.5200 },
];

/** Haversine distance in km between two lat/lng points */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Return the nearest vereda to the given coordinates */
export function nearestVereda(lat: number, lng: number): Vereda {
  return VEREDAS.reduce((best, v) => {
    const d = haversineKm(lat, lng, v.lat, v.lng);
    const bestD = haversineKm(lat, lng, best.lat, best.lng);
    return d < bestD ? v : best;
  });
}
