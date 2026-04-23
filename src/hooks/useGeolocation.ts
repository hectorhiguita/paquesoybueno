"use client";

import { useState, useCallback } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
  });

  const getCurrentPosition = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState((prev) => ({
        ...prev,
        error: "La geolocalización no está disponible en este dispositivo",
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (error) => {
        setState({
          latitude: null,
          longitude: null,
          error:
            error.code === error.PERMISSION_DENIED
              ? "Permiso de ubicación denegado. Puedes seleccionar tu vereda manualmente."
              : "No se pudo obtener tu ubicación",
          loading: false,
        });
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return { ...state, getCurrentPosition };
}
