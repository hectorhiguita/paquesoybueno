"use client";

import { useEffect, useState, useCallback } from "react";
import { enqueueAction, replayPendingActions } from "@/lib/offline/queue";

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const syncPendingActions = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await replayPendingActions();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingActions();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPendingActions]);

  const queueAction = useCallback(
    async (url: string, method: string, body?: unknown, headers?: Record<string, string>) => {
      if (isOnline) {
        // Try direct request first
        try {
          const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json", ...headers },
            body: body ? JSON.stringify(body) : undefined,
          });
          return response;
        } catch {
          // Fall through to queue
        }
      }

      // Queue for later
      await enqueueAction({
        url,
        method,
        body: body ? JSON.stringify(body) : undefined,
        headers,
      });
      return null;
    },
    [isOnline]
  );

  return { isOnline, isSyncing, queueAction };
}
