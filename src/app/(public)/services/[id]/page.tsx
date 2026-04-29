import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ServiceDetailPage({ params }: { params: { id: string } }) {
  const listing = await prisma.listing.findFirst({
    where: { id: params.id, communityId: SANTA_ELENA_COMMUNITY_ID, type: "service" },
    include: {
      author: { select: { id: true, name: true, phone: true, isVerifiedProvider: true, createdAt: true } },
      category: { select: { id: true, name: true, icon: true } },
      vereda: { select: { name: true } },
      images: { select: { id: true, url: true, order: true }, orderBy: { order: "asc" } },
      ratings: {
        include: { rater: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: { select: { ratings: true, reservations: true } },
    },
  });

  if (!listing) notFound();

  const avgRating =
    listing.ratings.length > 0
      ? Math.round(
          (listing.ratings.reduce((s, r) => s + r.stars, 0) / listing.ratings.length) * 10
        ) / 10
      : null;

  const related = await prisma.listing.findMany({
    where: {
      communityId: SANTA_ELENA_COMMUNITY_ID,
      type: "service",
      status: "active",
      categoryId: listing.categoryId,
      id: { not: listing.id },
    },
    include: {
      author: { select: { name: true, isVerifiedProvider: true } },
      vereda: { select: { name: true } },
      ratings: { select: { stars: true } },
    },
    take: 3,
  });

  const waText = encodeURIComponent(
    `Hola ${listing.author.name}, vi tu servicio de "${listing.title}" en Santa Elena y me interesa.`
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <Link
            href={`/services?categoryId=${listing.categoryId}`}
            className="text-sm text-green-700 hover:underline"
          >
            ← Volver al directorio
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Perfil */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          {listing.images[0]?.url && (
            <div className="mb-5">
              <img
                src={listing.images[0].url}
                alt={listing.title}
                className="h-64 w-full object-cover rounded-2xl"
              />
              {listing.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {listing.images.slice(1, 5).map((image) => (
                    <img
                      key={image.id}
                      src={image.url}
                      alt={listing.title}
                      className="h-20 w-full object-cover rounded-xl border border-gray-200"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-green-100 flex items-center justify-center text-3xl font-bold text-green-700 flex-shrink-0">
              {listing.author.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-800">{listing.author.name}</h1>
                {listing.author.isVerifiedProvider && (
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    ✓ Verificado
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm mt-0.5">
                {listing.category.name} · 📍 {listing.vereda.name}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                {avgRating !== null ? (
                  <>
                    <span className="font-semibold text-gray-800">⭐ {avgRating}</span>
                    <span className="text-gray-500">({listing._count.ratings} reseñas)</span>
                  </>
                ) : (
                  <span className="text-gray-400 text-sm">Sin calificaciones aún</span>
                )}
                <span className="text-gray-500">🔨 {listing.completedJobs} trabajos</span>
              </div>
            </div>
          </div>

          {/* Título y descripción */}
          <h2 className="text-lg font-bold text-gray-800 mt-5">{listing.title}</h2>
          <p className="text-gray-600 text-sm mt-2 leading-relaxed">{listing.description}</p>

          {listing.priceCop !== null && (
            <p className="mt-3 text-green-700 font-bold text-lg">
              ${Number(listing.priceCop).toLocaleString("es-CO")} COP
            </p>
          )}

          {/* Info rápida */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Categoría</p>
              <p className="text-sm font-semibold text-gray-700 mt-0.5">
                {listing.category.icon ?? "🔧"} {listing.category.name}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Miembro desde</p>
              <p className="text-sm font-semibold text-gray-700 mt-0.5">
                📅{" "}
                {listing.author.createdAt.toLocaleDateString("es-CO", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Acciones */}
          <div className="grid grid-cols-2 gap-2 mt-5">
            <a
              href={`https://wa.me/57${listing.author.phone}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-2 bg-green-500 text-white font-bold text-sm py-3 rounded-xl hover:bg-green-600 transition-colors min-h-[44px] flex items-center justify-center gap-2"
            >
              💬 Contactar por WhatsApp
            </a>
            <Link
              href={`/messages?participantId=${listing.author.id}&listingId=${listing.id}`}
              className="border border-gray-300 text-gray-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors min-h-[44px] flex items-center justify-center gap-2"
            >
              ✉️ Mensaje interno
            </Link>
            <Link
              href="/register"
              className="bg-green-700 text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-green-800 transition-colors min-h-[44px] flex items-center justify-center gap-2"
            >
              ⭐ Calificar
            </Link>
          </div>
        </div>

        {/* Reseñas */}
        {listing.ratings.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Reseñas ({listing._count.ratings})
            </h2>
            <div className="space-y-4">
              {listing.ratings.map((r) => (
                <div key={r.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-800">{r.rater.name}</span>
                    <span className="text-xs text-gray-400">
                      {r.createdAt.toLocaleDateString("es-CO")}
                    </span>
                  </div>
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <span key={j} className={j < r.stars ? "text-yellow-400" : "text-gray-200"}>
                        ★
                      </span>
                    ))}
                  </div>
                  {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100">
              <Link href="/login" className="text-sm text-green-700 font-medium hover:underline">
                + Dejar una reseña (requiere cuenta)
              </Link>
            </div>
          </div>
        )}

        {/* Relacionados */}
        {related.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Más proveedores de {listing.category.name}
            </h2>
            <div className="space-y-3">
              {related.map((r) => {
                const rAvg =
                  r.ratings.length > 0
                    ? Math.round(
                        (r.ratings.reduce((s, x) => s + x.stars, 0) / r.ratings.length) * 10
                      ) / 10
                    : null;
                return (
                  <Link
                    key={r.id}
                    href={`/services/${r.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center font-bold text-green-700 flex-shrink-0">
                      {r.author.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800">{r.author.name}</p>
                      <p className="text-xs text-gray-500">
                        📍 {r.vereda.name}
                        {rAvg !== null ? ` · ⭐ ${rAvg}` : ""}
                      </p>
                    </div>
                    {r.author.isVerifiedProvider && (
                      <span className="text-green-600 text-xs font-bold">✓</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
