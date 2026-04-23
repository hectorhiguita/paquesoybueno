import Link from "next/link";
import { MARKET_ITEMS } from "@/lib/mock-data";
import { notFound } from "next/navigation";

export default function MarketItemPage({ params }: { params: { id: string } }) {
  const item = MARKET_ITEMS.find((i) => i.id === params.id);
  if (!item) notFound();

  const related = MARKET_ITEMS.filter((i) => i.type === item.type && i.id !== item.id).slice(0, 3);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <Link href={`/marketplace?type=${item.type}`} className="text-sm text-green-700 hover:underline">
            ← Volver al marketplace
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
        {/* Imagen / emoji */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 h-56 flex items-center justify-center text-8xl">
            {item.emoji}
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{item.title}</h1>
                <p className="text-sm text-gray-500 mt-1">📍 {item.vereda} · Publicado {item.date}</p>
              </div>
              {item.price ? (
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-green-700">
                    ${item.price.toLocaleString("es-CO")}
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
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                item.condition === "Como nuevo"
                  ? "bg-green-100 text-green-700"
                  : item.condition === "Buen estado"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}>
                {item.condition}
              </span>
              <span className="text-xs text-gray-400">
                {item.type === "sale" ? "🛒 Venta" : "🔄 Trueque"}
              </span>
            </div>

            <p className="text-gray-600 text-sm mt-4 leading-relaxed">{item.description}</p>

            {item.tradeFor && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
                <p className="text-sm font-semibold text-amber-800">Busca a cambio:</p>
                <p className="text-sm text-amber-700 mt-0.5">{item.tradeFor}</p>
              </div>
            )}

            {/* Vendedor */}
            <div className="flex items-center gap-3 mt-5 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">
                👤
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-800">{item.seller}</p>
                <p className="text-xs text-gray-500">⭐ {item.sellerRating} · Miembro verificado</p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3 mt-5">
              <a
                href={`https://wa.me/?text=Hola%2C%20vi%20tu%20anuncio%20de%20${encodeURIComponent(item.title)}%20en%20Santa%20Elena%20Platform`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-green-500 text-white font-semibold text-sm py-3 rounded-xl hover:bg-green-600 transition-colors min-h-[44px] flex items-center justify-center gap-2"
              >
                💬 WhatsApp
              </a>
              <Link
                href="/register"
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
                    {r.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{r.title}</p>
                    <p className="text-xs text-gray-500">📍 {r.vereda}</p>
                  </div>
                  {r.price ? (
                    <p className="text-sm font-bold text-green-700 flex-shrink-0">
                      ${r.price.toLocaleString("es-CO")}
                    </p>
                  ) : (
                    <span className="text-xs text-amber-600 font-semibold flex-shrink-0">Trueque</span>
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
