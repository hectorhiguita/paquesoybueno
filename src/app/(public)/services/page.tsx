import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";

const CATEGORY_ICONS: Record<string, string> = {
  jardineria: "🌿",
  electricidad: "⚡",
  plomeria: "🔧",
  construccion: "🏠",
  tecnologia: "📱",
  transporte: "🚗",
  cocina: "🍳",
  electrodomesticos: "🔌",
  agricultura: "🌾",
  cuidado: "👶",
  educacion: "📚",
  belleza: "💇",
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: { categoryId?: string };
}) {
  const { categoryId } = searchParams;

  const categories = await prisma.category.findMany({
    where: { communityId: SANTA_ELENA_COMMUNITY_ID, active: true },
    orderBy: { name: "asc" },
  });

  const listings = categoryId
    ? await prisma.listing.findMany({
        where: {
          communityId: SANTA_ELENA_COMMUNITY_ID,
          type: "service",
          status: "active",
          categoryId,
        },
        include: {
          author: { select: { id: true, name: true, isVerifiedProvider: true, phone: true } },
          vereda: { select: { name: true } },
          category: { select: { name: true, icon: true } },
          ratings: { select: { stars: true } },
          _count: { select: { ratings: true } },
        },
        orderBy: [{ author: { isVerifiedProvider: "desc" } }, { createdAt: "desc" }],
      })
    : [];

  const listingsWithRating = listings.map((l) => {
    const avg =
      l.ratings.length > 0
        ? Math.round((l.ratings.reduce((s, r) => s + r.stars, 0) / l.ratings.length) * 10) / 10
        : null;
    const { ratings, ...rest } = l;
    return { ...rest, avgRating: avg };
  });

  const activeCategory = categories.find((c) => c.id === categoryId);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">Directorio de Servicios</h1>
          <p className="text-gray-500 text-sm mt-1">
            Encuentra proveedores de confianza en tu vereda
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Categorías */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-10">
          {categories.map((cat) => {
            const icon = cat.icon ?? CATEGORY_ICONS[cat.name.toLowerCase()] ?? "🔧";
            return (
              <Link
                key={cat.id}
                href={`/services?categoryId=${cat.id}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all min-h-[44px] ${
                  categoryId === cat.id
                    ? "bg-green-700 text-white border-green-700 shadow-md"
                    : "bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:shadow-sm"
                }`}
              >
                <span className="text-xl">{icon}</span>
                <span className="text-sm font-medium">{cat.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Resultados */}
        {activeCategory ? (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-800">
                {activeCategory.icon ?? "🔧"} {activeCategory.name}
              </h2>
              <span className="text-sm text-gray-500">
                {listingsWithRating.length} proveedor
                {listingsWithRating.length !== 1 ? "es" : ""}
              </span>
            </div>

            {listingsWithRating.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {listingsWithRating.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/services/${listing.id}`}
                    className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:border-green-300 transition-all block"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center text-2xl flex-shrink-0 font-bold text-green-700">
                        {listing.author.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-800">{listing.author.name}</h3>
                          {listing.author.isVerifiedProvider && (
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{listing.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">📍 {listing.vereda.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm">
                          {listing.avgRating !== null ? (
                            <>
                              <span className="font-semibold text-gray-700">
                                ⭐ {listing.avgRating}
                              </span>
                              <span className="text-gray-400">({listing._count.ratings})</span>
                            </>
                          ) : (
                            <span className="text-gray-400 text-xs">Sin calificaciones aún</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-3 line-clamp-2">
                      {listing.description}
                    </p>
                    <div className="mt-4">
                      <span className="w-full bg-green-700 text-white text-sm font-medium py-2 rounded-lg min-h-[44px] flex items-center justify-center">
                        Ver perfil →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-4xl mb-3">{activeCategory.icon ?? "🔧"}</p>
                <p className="text-gray-500 font-medium">
                  Aún no hay proveedores en esta categoría
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  ¡Sé el primero en ofrecer este servicio!
                </p>
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
            <p className="text-sm mt-1">
              Elige un tipo de servicio para ver los proveedores disponibles
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
