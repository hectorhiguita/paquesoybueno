"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const PUBLIC_LINKS = [
  { href: "/services", label: "Servicios" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/tools", label: "Herramientas" },
];

interface SessionResponse {
  user?: { id?: string | null; name?: string | null } | null;
}

export function Navbar() {
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as SessionResponse;
        if (!cancelled) {
          setHasSession(Boolean(data?.user?.id));
        }
      } catch {
        if (!cancelled) {
          setHasSession(false);
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <nav className="w-full bg-green-700 text-white px-4 py-3 flex items-center justify-between shadow-md">
      <Link href="/" className="font-bold text-lg tracking-tight">
        🌿 Santa Elena
      </Link>

      <ul className="hidden md:flex gap-6 items-center text-sm font-medium">
        {PUBLIC_LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} className="hover:text-green-200 transition-colors">
              {label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        {hasSession ? (
          <>
            <Link
              href="/dashboard"
              className="border border-white text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-green-600 transition-colors min-h-[44px] flex items-center"
            >
              Mi panel
            </Link>
            <Link
              href="/api/auth/signout"
              className="bg-white/10 text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-white/20 transition-colors min-h-[44px] flex items-center"
            >
              Salir
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/register"
              className="bg-white text-green-700 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-green-50 transition-colors min-h-[44px] flex items-center"
            >
              Registrarse
            </Link>
            <Link
              href="/login"
              className="border border-white text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-green-600 transition-colors min-h-[44px] flex items-center"
            >
              Ingresar
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
