"use client";

import { useEffect, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

let _addToast: ((message: string, type?: ToastType) => void) | null = null;

/** Call this from anywhere (e.g. React Query mutation callbacks) to show a toast. */
export function showToast(message: string, type: ToastType = "success") {
  _addToast?.(message, type);
}

const typeStyles: Record<ToastType, string> = {
  success: "bg-green-700 text-white",
  error: "bg-red-600 text-white",
  info: "bg-blue-600 text-white",
};

/** Mount <ToastProvider /> once at the root layout to enable toasts. */
export function Toast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2000);
  }, []);

  useEffect(() => {
    _addToast = addToast;
    return () => {
      _addToast = null;
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium min-h-[44px] flex items-center ${typeStyles[t.type]}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

/** Convenience hook for use inside React components. */
export function useToast() {
  return { showToast };
}
