"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export function HeroCTA() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <div className="h-[44px] w-36 rounded-xl bg-white/20 animate-pulse" />
        <div className="h-[44px] w-36 rounded-xl bg-white/10 animate-pulse" />
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/dashboard"
          className="bg-white text-green-700 font-bold px-8 py-3 rounded-xl hover:bg-green-50 transition-colors min-h-[44px] flex items-center justify-center text-base"
        >
          Mi panel
        </Link>
        <Link
          href="/services"
          className="border-2 border-white text-white font-semibold px-8 py-3 rounded-xl hover:bg-green-600 transition-colors min-h-[44px] flex items-center justify-center text-base"
        >
          Ver servicios
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <Link
        href="/register"
        className="bg-white text-green-700 font-bold px-8 py-3 rounded-xl hover:bg-green-50 transition-colors min-h-[44px] flex items-center justify-center text-base"
      >
        Únete gratis
      </Link>
      <Link
        href="/services"
        className="border-2 border-white text-white font-semibold px-8 py-3 rounded-xl hover:bg-green-600 transition-colors min-h-[44px] flex items-center justify-center text-base"
      >
        Ver servicios
      </Link>
    </div>
  );
}
