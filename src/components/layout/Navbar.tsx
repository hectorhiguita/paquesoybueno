import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/services", label: "Servicios" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/tools", label: "Herramientas" },
  { href: "/payments", label: "💰 Mis pagos" },
];

export function Navbar() {
  return (
    <nav className="w-full bg-green-700 text-white px-4 py-3 flex items-center justify-between shadow-md">
      <Link href="/" className="font-bold text-lg tracking-tight">
        🌿 Santa Elena
      </Link>
      <ul className="hidden md:flex gap-6 items-center text-sm font-medium">
        {NAV_LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} className="hover:text-green-200 transition-colors">
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
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
      </div>
    </nav>
  );
}
