"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/ui/Select";
import { VEREDAS, nearestVereda } from "./veredas";

interface VeredaSelectorProps {
  value?: string;
  onChange?: (veredaId: string) => void;
  label?: string;
}

export function VeredaSelector({
  value,
  onChange,
  label = "Vereda",
}: VeredaSelectorProps) {
  const [suggested, setSuggested] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    if (!navigator?.geolocation) return;
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = nearestVereda(pos.coords.latitude, pos.coords.longitude);
        setSuggested(nearest.id);
        setGpsStatus("done");
        // Auto-select if no value chosen yet
        if (!value) onChange?.(nearest.id);
      },
      () => setGpsStatus("error"),
      { timeout: 5000 },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = VEREDAS.map((v) => ({
    value: v.id,
    label: v.id === suggested ? `${v.name} (sugerida por GPS)` : v.name,
  }));

  return (
    <div className="flex flex-col gap-1">
      <Select
        label={label}
        options={[{ value: "", label: "Selecciona una vereda…" }, ...options]}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
      />
      {gpsStatus === "loading" && (
        <p className="text-xs text-gray-500">Detectando ubicación por GPS…</p>
      )}
      {gpsStatus === "error" && (
        <p className="text-xs text-gray-500">GPS no disponible. Selecciona manualmente.</p>
      )}
    </div>
  );
}
