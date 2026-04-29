import Link from "next/link";
import { auth } from "@/lib/auth/config";

const PUBLIC_LINKS = [
  { href: "/services", label: "Servicios" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/tools", label: "Herramientas" },
];

export async function Navbar() {
  let session = null;

  try {
    session = await auth();
  } catch (error) {
    // No dejes que un fallo de auth/sesion derribe toda la navegacion publica.
    console.error("[Navbar] Failed to resolve session:", error);
  }

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
        {session ? (
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
