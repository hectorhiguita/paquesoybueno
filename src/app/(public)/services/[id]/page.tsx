import Link from "next/link";
import { PROVIDERS } from "@/lib/mock-data";
import { notFound } from "next/navigation";

export default function ProviderDetailPage({ params }: { params: { id: string } }) {
  const provider = PROVIDERS.find((p) => p.id === params.id);
  if (!provider) notFound();

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Back */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <Link href="/services" className="text-sm text-green-700 hover:underline">
            ← Volver al directorio
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Perfil principal */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-green-100 flex items-center justify-center text-4xl flex-shrink-0">
              {provider.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-800">{provider.name}</h1>
                {provider.verified && (
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    ✓ Verificado
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm mt-0.5">
                {provider.category} · 📍 {provider.vereda}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="font-semibold text-gray-800">⭐ {provider.rating}</span>
                <span className="text-gray-500">({provider.reviews} reseñas)</span>
                <span className="text-gray-500">🔨 {provider.jobs} trabajos</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {provider.tags.map((tag) => (
              <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>

          {/* Descripción */}
          <p className="text-gray-600 text-sm mt-4 leading-relaxed">{provider.description}</p>

          {/* Info rápida */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Tiempo de respuesta</p>
              <p className="text-sm font-semibold text-gray-700 mt-0.5">⚡ {provider.responseTime}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Miembro desde</p>
              <p className="text-sm font-semibold text-gray-700 mt-0.5">📅 {provider.memberSince}</p>
            </div>
          </div>

          {/* Acciones */}
          <div className="grid grid-cols-2 gap-2 mt-5">
            <Link
              href={`/pay/${provider.id}`}
              className="col-span-2 bg-green-700 text-white font-bold text-sm py-3 rounded-xl hover:bg-green-800 transition-colors min-h-[44px] flex items-center justify-center gap-2"
            >
              💳 Contratar y pagar
            </Link>
            <a
              href={`https://wa.me/57${provider.phone}?text=Hola%20${encodeURIComponent(provider.name)}%2C%20vi%20tu%20perfil%20en%20Santa%20Elena%20Platform%20y%20me%20interesa%20tu%20servicio.`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-green-600 transition-colors min-h-[44px] flex items-center justify-center gap-2"
            >
              💬 WhatsApp
            </a>
            <Link
              href="/messages"
              className="border border-gray-300 text-gray-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors min-h-[44px] flex items-center justify-center gap-2"
            >
              ✉️ Mensaje
            </Link>
          </div>
        </div>

        {/* Reseñas */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Reseñas ({provider.reviews_list.length})
          </h2>
          <div className="space-y-4">
            {provider.reviews_list.map((r, i) => (
              <div key={i} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-800">{r.author}</span>
                  <span className="text-xs text-gray-400">{r.date}</span>
                </div>
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <span key={j} className={j < r.rating ? "text-yellow-400" : "text-gray-200"}>
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-1">{r.comment}</p>
              </div>
            ))}
          </div>

          {/* Dejar reseña */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <Link
              href="/register"
              className="text-sm text-green-700 font-medium hover:underline"
            >
              + Dejar una reseña (requiere cuenta)
            </Link>
          </div>
        </div>

        {/* Otros proveedores de la misma categoría */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Más proveedores de {provider.category}
          </h2>
          <div className="space-y-3">
            {PROVIDERS.filter((p) => p.categorySlug === provider.categorySlug && p.id !== provider.id)
              .slice(0, 3)
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/services/${p.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl flex-shrink-0">
                    {p.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-500">📍 {p.vereda} · ⭐ {p.rating}</p>
                  </div>
                  {p.verified && (
                    <span className="text-green-600 text-xs font-bold">✓</span>
                  )}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}
