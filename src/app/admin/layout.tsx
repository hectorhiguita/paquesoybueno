"use client";

import { usePathname, useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // No aplicar el wrapper en la página de login
  if (pathname === "/admin/login") return <>{children}</>;

  const handleLogout = async () => {
    await fetch("/api/v1/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚙️</span>
          <span className="text-white font-bold text-sm">Panel Admin — Santa Elena</span>
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
