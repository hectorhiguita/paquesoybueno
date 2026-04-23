import Link from "next/link";
import { PROVIDERS } from "@/lib/mock-data";

const CATEGORIES = [
  { slug: "jardineria", icon: "🌿", label: "Jardinería" },
  { slug: "electricidad", icon: "⚡", label: "Electricidad" },
  { slug: "plomeria", icon: "🔧", label: "Plomería" },
  { slug: "construccion", icon: "🏠", label: "Construcción" },
  { slug: "tecnologia", icon: "📱", label: "Tecnología" },
  { slug: "transporte", icon: "🚗", label: "Transporte" },
  { slug: "cocina", icon: "🍳", label: "Cocina" },
  { slug: "electrodomesticos", icon: "🔌", label: "Electrodomésticos" },
  { slug: "agricultura", icon: "🌾", label: "Agricultura" },
  { slug: "cuidado", icon: "👶", label: "Cuidado de personas" },
  { slug: "educacion", icon: "📚", label: "Educación" },
  { slug: "belleza", icon: "💇", label: "Belleza y salud" },
];

export default function ServicesPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const activeCategory = searchParams.category ?? null;
  const activeCat = CATEGORIES.find((c) => c.slug === activeCategory);
  const providers = activeCategory
    ? PROVIDERS.filter((p) => p.categorySlug === activeCategory)
    : [];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">Directorio de Servicios</h1>
          <p className="text-gray-500 text-sm mt-1">Encuentra proveedores de confianza en tu vereda</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Categorías */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-10">
          {CATEGORIES.map(({ slug, icon, label }) => (
            <Link
              key={slug}
              href={`/services?category=${slug}`}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all min-h-[44px] ${
                activeCategory === slug
                  ? "bg-green-700 text-white border-green-700 shadow-md"
                  : "bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:shadow-sm"
              }`}
            >
              <span className="text-xl">{icon}</span>
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
        </div>

        {/* Resultados */}
        {activeCat ? (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-800">
                {activeCat.icon} {activeCat.label}
              </h2>
              <span className="text-sm text-gray-500">{providers.length} proveedor{providers.length !== 1 ? "es" : ""}</span>
            </div>

            {providers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {providers.map((p) => (
                  <Link
                    key={p.id}
                    href={`/services/${p.id}`}
                    className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:border-green-300 transition-all block"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center text-3xl flex-shrink-0">
                        {p.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-800">{p.name}</h3>
                          {p.verified && (
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-1.5 py-0.5 rounded-full">✓</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">📍 {p.vereda}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm">
                          <span className="font-semibold text-gray-700">⭐ {p.rating}</span>
                          <span className="text-gray-400">({p.reviews})</span>
                          <span className="text-gray-400">🔨 {p.jobs}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-3 line-clamp-2">{p.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {p.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <span className="flex-1 bg-green-700 text-white text-sm font-medium py-2 rounded-lg text-center min-h-[44px] flex items-center justify-center">
                        Ver perfil →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-4xl mb-3">{activeCat.icon}</p>
                <p className="text-gray-500 font-medium">Aún no hay proveedores en esta categoría</p>
                <p className="text-gray-400 text-sm mt-1">¡Sé el primero en ofrecer este servicio!</p>
                <Link
                  href="/register"
                  className="inline-flex items-center mt-4 bg-green-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-green-800 transition-colors min-h-[44px]"
                >
                  Publicar mi servicio
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-lg font-medium text-gray-700">Selecciona una categoría</p>
            <p className="text-sm mt-1">Elige un tipo de servicio para ver los proveedores disponibles</p>
          </div>
        )}
      </div>
    </main>
  );
}
