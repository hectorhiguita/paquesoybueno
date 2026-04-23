"use client";

import { useState, useEffect } from "react";
import { useNotifications } from "@/hooks/useNotifications";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  useNotifications();

  useEffect(() => {
    function handleNotification() {
      setUnreadCount((c) => c + 1);
    }
    window.addEventListener("notification", handleNotification);
    return () => window.removeEventListener("notification", handleNotification);
  }, []);

  return (
    <button
      aria-label={`Notificaciones${unreadCount > 0 ? `, ${unreadCount} sin leer` : ""}`}
      className="relative p-1 rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-white"
      onClick={() => setUnreadCount(0)}
    >
      <span aria-hidden="true" className="text-xl">🔔</span>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
