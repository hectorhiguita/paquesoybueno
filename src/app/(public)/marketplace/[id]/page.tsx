import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";
import { isSafeImageUrl } from "@/lib/utils/image";

export const dynamic = "force-dynamic";

export default async function MarketItemPage({ params }: { params: { id: string } }) {
  const item = await prisma.listing.findFirst({
    where: {
      id: params.id,
      communityId: SANTA_ELENA_COMMUNITY_ID,
      type: { in: ["sale", "trade"] },
      status: "active",
    },
    include: {
      author: { select: { id: true, name: true, phone: true, isVerifiedProvider: true } },
      vereda: { select: { name: true } },
      category: { select: { name: true } },
      images: { select: { id: true, url: true, order: true }, orderBy: { order: "asc" } },
      ratings: { select: { stars: true } },
    },
  });

  if (!item) notFound();

  const related = await prisma.listing.findMany({
    where: {
      communityId: SANTA_ELENA_COMMUNITY_ID,
      type: item.type,
      status: "active",
      id: { not: item.id },
    },
    include: {
      vereda: { select: { name: true } },
    },
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  const sellerAvg =
    item.ratings.length > 0
      ? Math.round(
          (item.ratings.reduce((s, r) => s + r.stars, 0) / item.ratings.length) * 10
        ) / 10
      : null;

  const waText = encodeURIComponent(
    `Hola, vi tu anuncio de "${item.title}" en Santa Elena y me interesa.`
  );

  const typeLabel = item.type === "sale" ? "🛒 Venta" : "🔄 Trueque";
  const typeSlug = item.type;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <Link
            href={`/marketplace?type=${typeSlug}`}
            className="text-sm text-green-700 hover:underline"
          >
            ← Volver al marketplace
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {isSafeImageUrl(item.images[0]?.url) ? (
            <img src={item.images[0].url} alt={item.title} className="h-56 w-full object-cover" />
          ) : (
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 h-56 flex items-center justify-center text-7xl">
              {item.type === "sale" ? "🛒" : "🔄"}
            </div>
          )}
          <div className="p-6">
            {item.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2 mb-5">
                {item.images.slice(1, 5).filter((img) => isSafeImageUrl(img.url)).map((image) => (
                  <img
                    key={image.id}
                    src={image.url}
                    alt={item.title}
                    className="h-20 w-full object-cover rounded-xl border border-gray-200"
                  />
                ))}
              </div>
            )}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{item.title}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  📍 {item.vereda.name} · Publicado{" "}
                  {item.createdAt.toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
              {item.priceCop !== null ? (
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-green-700">
                    ${Number(item.priceCop).toLocaleString("es-CO")}
                  </p>
                  <p className="text-xs text-gray-400">COP</p>
                </div>
              ) : (
                <span className="bg-amber-100 text-amber-700 font-bold text-sm px-3 py-1.5 rounded-full flex-shrink-0">
                  🔄 Trueque
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-600">
                {item.category.name}
              </span>
              <span className="text-xs text-gray-400">{typeLabel}</span>
            </div>

            <p className="text-gray-600 text-sm mt-4 leading-relaxed">{item.description}</p>

            {item.tradeDescription && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
                <p className="text-sm font-semibold text-amber-800">Busca a cambio:</p>
                <p className="text-sm text-amber-700 mt-0.5">{item.tradeDescription}</p>
              </div>
            )}

            {/* Vendedor */}
            <div className="flex items-center gap-3 mt-5 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700">
                {item.author.name[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-800">
                  {item.author.name}
                  {item.author.isVerifiedProvider && (
                    <span className="ml-1 text-green-600 text-xs font-bold">✓ Verificado</span>
                  )}
                </p>
                {sellerAvg !== null && (
                  <p className="text-xs text-gray-500">⭐ {sellerAvg} calificación promedio</p>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3 mt-5">
              {item.author.phone && (
                <a
                  href={`https://wa.me/57${item.author.phone}?text=${waText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-green-500 text-white font-semibold text-sm py-3 rounded-xl hover:bg-green-600 transition-colors min-h-[44px] flex items-center justify-center gap-2"
                >
                  💬 WhatsApp
                </a>
              )}
              <Link
                href={`/messages?participantId=${item.author.id}&listingId=${item.id}`}
                className="flex-1 bg-green-700 text-white font-semibold text-sm py-3 rounded-xl hover:bg-green-800 transition-colors min-h-[44px] flex items-center justify-center gap-2"
              >
                ✉️ Mensaje
              </Link>
            </div>
          </div>
        </div>

        {/* Relacionados */}
        {related.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {item.type === "sale" ? "Más artículos en venta" : "Más trueques"}
            </h2>
            <div className="space-y-3">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/marketplace/${r.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    {r.type === "sale" ? "🛒" : "🔄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{r.title}</p>
                    <p className="text-xs text-gray-500">📍 {r.vereda.name}</p>
                  </div>
                  {r.priceCop !== null ? (
                    <p className="text-sm font-bold text-green-700 flex-shrink-0">
                      ${Number(r.priceCop).toLocaleString("es-CO")}
                    </p>
                  ) : (
                    <span className="text-xs text-amber-600 font-semibold flex-shrink-0">
                      Trueque
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
