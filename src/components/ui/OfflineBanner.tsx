"use client";

import { useOfflineQueue } from "@/hooks/useOfflineQueue";

export function OfflineBanner() {
  const { isOnline } = useOfflineQueue();

  if (isOnline) return null;

  return (
    <div className="w-full bg-yellow-500 text-yellow-900 text-sm text-center py-2 px-4">
      Sin conexión - tus acciones se sincronizarán al recuperar la red
    </div>
  );
}
