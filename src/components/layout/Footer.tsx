import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 text-gray-300 py-8 px-6 mt-auto">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-center sm:text-left">
          <span className="font-semibold text-white">🌿 Santa Elena</span>
          <span className="ml-2 text-gray-400">— Plataforma comunitaria, Medellín</span>
        </div>

        <nav className="flex items-center gap-5 text-sm">
          <Link href="/terminos" className="hover:text-white transition-colors">
            Términos y Condiciones
          </Link>
          <Link href="/services" className="hover:text-white transition-colors">
            Servicios
          </Link>
          <Link href="/marketplace" className="hover:text-white transition-colors">
            Marketplace
          </Link>
        </nav>

        <p className="text-xs text-gray-500 text-center sm:text-right">
          &copy; {year} Santa Elena. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
