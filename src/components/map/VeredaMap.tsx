"use client";

import { VEREDAS } from "./veredas";

interface VeredaMapProps {
  selectedVeredaId?: string;
  onSelectVereda?: (veredaId: string) => void;
}

/**
 * Placeholder map component that renders vereda names as clickable labels
 * positioned proportionally within a bounding box.
 * Replace the inner content with a real map library (e.g. Leaflet, Mapbox)
 * when available.
 */
export function VeredaMap({ selectedVeredaId, onSelectVereda }: VeredaMapProps) {
  // Bounding box for Santa Elena area
  const LAT_MIN = 6.205;
  const LAT_MAX = 6.255;
  const LNG_MIN = -75.525;
  const LNG_MAX = -75.480;

  function toPercent(lat: number, lng: number) {
    const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100;
    // Invert y: higher lat = higher on screen
    const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * 100;
    return { x, y };
  }

  return (
    <div
      className="relative w-full bg-green-50 border border-green-200 rounded-lg overflow-hidden"
      style={{ paddingBottom: "60%" }}
      aria-label="Mapa de veredas de Santa Elena"
    >
      <div className="absolute inset-0">
        {VEREDAS.map((v) => {
          const { x, y } = toPercent(v.lat, v.lng);
          const isSelected = v.id === selectedVeredaId;
          return (
            <button
              key={v.id}
              onClick={() => onSelectVereda?.(v.id)}
              style={{ left: `${x}%`, top: `${y}%` }}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-green-700 ${
                isSelected
                  ? "bg-green-700 text-white shadow-lg scale-110"
                  : "bg-white text-green-800 border border-green-400 hover:bg-green-100"
              }`}
              title={v.name}
            >
              <span className="px-1 text-center leading-tight">{v.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
