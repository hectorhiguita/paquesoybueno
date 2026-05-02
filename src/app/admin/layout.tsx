"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const ADMIN_IDLE_TIMEOUT_MS = 15 * 60 * 1000;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // No aplicar el wrapper en la página de login
  if (pathname === "/admin/login") return <>{children}</>;

  const handleLogout = async () => {
    await fetch("/api/v1/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  useEffect(() => {
    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        void handleLogout();
      }, ADMIN_IDLE_TIMEOUT_MS);
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    resetTimer();
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <span className="text-xl">⚙️</span>
          <span className="text-white font-bold text-sm">Panel Admin — Santa Elena</span>
          <nav className="hidden sm:flex items-center gap-1">
            <a
              href="/admin"
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                pathname === "/admin" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              Dashboard
            </a>
            <a
              href="/admin/stats"
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                pathname === "/admin/stats" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              📊 Analytics
            </a>
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-700"
        >
          Cerrar sesión
        </button>
      </header>
      {children}
    </div>
  );
}
