import { VEREDA_METADATA } from "@/lib/vereda-metadata";

export interface Vereda {
  id: string;
  name: string;
  /** Approximate centroid coordinates */
  lat: number;
  lng: number;
  sectors: string[];
  territory?: "medellin" | "neighbor";
  municipality?: string;
}

/** Veredas del territorio cultural de Santa Elena y veredas vecinas asociadas */
export const VEREDAS: Vereda[] = VEREDA_METADATA;

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
