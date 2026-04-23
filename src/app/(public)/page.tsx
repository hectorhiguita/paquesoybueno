import Link from "next/link";

const SERVICE_CATEGORIES = [
  { icon: "🌿", label: "Jardinería", href: "/services?category=jardineria" },
  { icon: "⚡", label: "Electricidad", href: "/services?category=electricidad" },
  { icon: "🔧", label: "Plomería", href: "/services?category=plomeria" },
  { icon: "🏠", label: "Construcción", href: "/services?category=construccion" },
  { icon: "📱", label: "Tecnología", href: "/services?category=tecnologia" },
  { icon: "🚗", label: "Transporte", href: "/services?category=transporte" },
  { icon: "🍳", label: "Cocina", href: "/services?category=cocina" },
  { icon: "🔌", label: "Electrodomésticos", href: "/services?category=electrodomesticos" },
];

const MARKETPLACE_CATEGORIES = [
  {
    icon: "🛒",
    label: "Compra y Venta",
    description: "Encuentra artículos de segunda mano o vende lo que ya no usas",
    href: "/marketplace?type=sale",
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    iconBg: "bg-blue-100",
  },
  {
    icon: "🔄",
    label: "Trueque",
    description: "Intercambia bienes o servicios con tus vecinos sin usar dinero",
    href: "/marketplace?type=trade",
    color: "bg-amber-50 border-amber-200 hover:bg-amber-100",
    iconBg: "bg-amber-100",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-700 to-green-900 text-white py-16 px-6 text-center">
        <h1 className="text-4xl font-bold mb-3">Bienvenido a Santa Elena</h1>
        <p className="text-green-100 text-lg max-w-xl mx-auto mb-8">
          Conectamos a los vecinos de Santa Elena para compartir servicios, intercambiar bienes y construir comunidad.
        </p>
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
      </section>

      {/* Servicios por categoría */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Servicios locales</h2>
          <Link href="/services" className="text-green-700 font-medium text-sm hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {SERVICE_CATEGORIES.map(({ icon, label, href }) => (
            <Link
              key={label}
              href={href}
              className="flex flex-col items-center gap-2 bg-white border border-gray-200 rounded-xl p-5 hover:border-green-400 hover:shadow-md transition-all min-h-[44px]"
            >
              <span className="text-3xl">{icon}</span>
              <span className="text-sm font-medium text-gray-700 text-center">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Marketplace */}
      <section className="max-w-5xl mx-auto px-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Marketplace</h2>
          <Link href="/marketplace" className="text-green-700 font-medium text-sm hover:underline">
            Ver todo →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {MARKETPLACE_CATEGORIES.map(({ icon, label, description, href, color, iconBg }) => (
            <Link
              key={label}
              href={href}
              className={`flex items-start gap-4 border rounded-xl p-6 transition-colors ${color}`}
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 ${iconBg}`}>
                {icon}
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{label}</h3>
                <p className="text-gray-600 text-sm mt-1">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Herramientas compartidas */}
      <section className="bg-green-50 border-t border-green-100 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">🔨 Herramientas compartidas</h2>
            <p className="text-gray-600 max-w-md">
              ¿Necesitas una herramienta por un día? Pídela prestada a un vecino. ¿Tienes herramientas sin usar? Compártelas con la comunidad.
            </p>
          </div>
          <Link
            href="/tools"
            className="bg-green-700 text-white font-semibold px-8 py-3 rounded-xl hover:bg-green-800 transition-colors min-h-[44px] flex items-center whitespace-nowrap"
          >
            Ver herramientas
          </Link>
        </div>
      </section>
    </main>
  );
}
