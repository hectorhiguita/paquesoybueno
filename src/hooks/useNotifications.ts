"use client";

import { useEffect, useCallback } from "react";

export function useNotifications() {
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return "denied";
    if (Notification.permission === "granted") return "granted";
    return await Notification.requestPermission();
  }, []);

  const subscribeToPush = useCallback(async (vapidPublicKey: string) => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey,
    });

    return subscription;
  }, []);

  useEffect(() => {
    // Subscribe to SSE for real-time notifications
    const eventSource = new EventSource("/api/v1/notifications/stream");

    eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      // Dispatch custom event for UI components to handle
      window.dispatchEvent(new CustomEvent("notification", { detail: notification }));
    };

    return () => eventSource.close();
  }, []);

  return { requestPermission, subscribeToPush };
}
