export interface VeredaMetadata {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sectors: string[];
  territory?: "medellin" | "neighbor";
  municipality?: string;
}

export const VEREDA_METADATA: VeredaMetadata[] = [
  {
    id: "barro-blanco",
    name: "Barro Blanco",
    lat: 6.2285,
    lng: -75.5012,
    sectors: ["El Rosario", "El Salado", "Centro Poblado Barro Blanco", "El Tambo"],
  },
  {
    id: "mazo",
    name: "Mazo",
    lat: 6.239,
    lng: -75.475,
    sectors: ["San Roque", "Centro Poblado Mazo", "Parque Arvi"],
  },
  {
    id: "piedra-gorda",
    name: "Piedra Gorda",
    lat: 6.225,
    lng: -75.486,
    sectors: ["Las Flores", "San Ignacio"],
  },
  {
    id: "el-plan",
    name: "El Plan",
    lat: 6.217,
    lng: -75.503,
    sectors: ["San Pedro", "Los Sauces"],
  },
  {
    id: "el-llano",
    name: "El Llano",
    lat: 6.215,
    lng: -75.51,
    sectors: ["La Puerta", "El Pensamiento"],
  },
  {
    id: "piedras-blancas-matasano",
    name: "Piedras Blancas – Matasano",
    lat: 6.235,
    lng: -75.49,
    sectors: ["Matasano", "Piedras Blancas"],
  },
  {
    id: "santa-elena-sector-central",
    name: "Santa Elena (Sector Central)",
    lat: 6.23,
    lng: -75.495,
    sectors: ["La Y", "Parque Principal", "San Lucas", "Santa Fe"],
  },
  {
    id: "media-luna",
    name: "Media Luna",
    lat: 6.242,
    lng: -75.505,
    sectors: ["El Silletero", "Media Luna Alta"],
  },
  {
    id: "el-placer",
    name: "El Placer",
    lat: 6.2201,
    lng: -75.4978,
    sectors: ["El Porvenir", "San Jose"],
  },
  {
    id: "el-cerro",
    name: "El Cerro",
    lat: 6.248,
    lng: -75.485,
    sectors: ["El Cerro Parte Alta", "Los Pinos"],
  },
  {
    id: "las-palmas",
    name: "Las Palmas",
    lat: 6.214,
    lng: -75.557,
    sectors: ["Via Las Palmas", "El Penolcito"],
  },
  {
    id: "san-miguel",
    name: "San Miguel",
    lat: 6.245,
    lng: -75.45,
    sectors: [],
    territory: "neighbor",
    municipality: "Guarne",
  },
  {
    id: "perico",
    name: "Perico",
    lat: 6.188,
    lng: -75.54,
    sectors: [],
    territory: "neighbor",
    municipality: "Envigado",
  },
  {
    id: "pantanillo",
    name: "Pantanillo",
    lat: 6.21,
    lng: -75.52,
    sectors: [],
    territory: "neighbor",
    municipality: "Envigado",
  },
];

export function getVeredaMetadataByName(name: string) {
  return VEREDA_METADATA.find((vereda) => vereda.name === name);
}

export function buildVeredaLabel(name: string) {
  const metadata = getVeredaMetadataByName(name);
  if (!metadata) return name;

  const sectors =
    metadata.sectors.length > 0 ? ` · ${metadata.sectors.join(", ")}` : "";
  const municipality =
    metadata.territory === "neighbor" && metadata.municipality
      ? ` (${metadata.municipality})`
      : "";

  return `${metadata.name}${municipality}${sectors}`;
}
