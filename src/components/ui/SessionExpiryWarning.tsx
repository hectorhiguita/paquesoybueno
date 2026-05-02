"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";

const WARNING_BEFORE_MS = 5 * 60 * 1000; // muestra aviso 5 min antes de expirar

export function SessionExpiryWarning() {
  const { data: session, status, update } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const [extending, setExtending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
  };

  useEffect(() => {
    if (status !== "authenticated" || !session) return;

    // next-auth expira el token JWT — expires viene en la sesión como ISO string
    const expiresAt = session.expires ? new Date(session.expires).getTime() : null;
    if (!expiresAt) return;

    const now = Date.now();
    const msUntilExpiry = expiresAt - now;
    const msUntilWarning = msUntilExpiry - WARNING_BEFORE_MS;

    clearTimers();

    if (msUntilExpiry <= 0) {
      void signOut({ callbackUrl: "/login" });
      return;
    }

    if (msUntilWarning <= 0) {
      setShowWarning(true);
      startCountdown(Math.floor(msUntilExpiry / 1000));
    } else {
      warningTimer.current = setTimeout(() => {
        setShowWarning(true);
        startCountdown(Math.floor(WARNING_BEFORE_MS / 1000));
      }, msUntilWarning);
    }

    return clearTimers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

  const startCountdown = (seconds: number) => {
    setSecondsLeft(seconds);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    countdownTimer.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(countdownTimer.current!);
          void signOut({ callbackUrl: "/login" });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const handleExtend = async () => {
    setExtending(true);
    try {
      await update();
      setShowWarning(false);
      clearTimers();
    } finally {
      setExtending(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 max-w-sm w-full text-center">
        <div className="text-4xl mb-3">⏱️</div>
        <h2 className="text-lg font-bold text-gray-800">Tu sesión está por expirar</h2>
        <p className="text-gray-500 text-sm mt-2">
          Por seguridad, tu sesión cerrará en{" "}
          <span className="font-bold text-orange-600">{formatTime(secondsLeft)}</span>.
        </p>
        <p className="text-gray-400 text-xs mt-1">
          ¿Deseas permanecer conectado?
        </p>
        <div className="flex gap-3 mt-5">
          <button
            onClick={() => void signOut({ callbackUrl: "/login" })}
            className="flex-1 border border-gray-300 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            Cerrar sesión
          </button>
          <button
            onClick={handleExtend}
            disabled={extending}
            className="flex-1 bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-800 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {extending ? "Extendiendo..." : "Seguir conectado"}
          </button>
        </div>
      </div>
    </div>
  );
}
