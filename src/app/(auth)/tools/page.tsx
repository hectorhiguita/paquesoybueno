import Link from "next/link";
import { TOOLS } from "@/lib/mock-data";

const conditionColor = {
  "Bueno": "bg-green-100 text-green-700",
  "Regular": "bg-yellow-100 text-yellow-700",
  "Necesita reparación": "bg-red-100 text-red-700",
};

export default function ToolsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🔨 Herramientas Compartidas</h1>
            <p className="text-gray-500 text-sm mt-1">Pide prestado lo que necesitas, comparte lo que tienes</p>
          </div>
          <Link
            href="/listings/new?type=tool"
            className="bg-green-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-green-800 transition-colors min-h-[44px] flex items-center gap-2"
          >
            + Compartir herramienta
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TOOLS.map((tool) => (
            <div
              key={tool.id}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 h-32 flex items-center justify-center text-6xl">
                {tool.emoji}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-800 leading-snug">{tool.name}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${conditionColor[tool.condition]}`}>
                    {tool.condition}
                  </span>
                </div>

                <p className="text-sm text-gray-500 mt-1">
                  👤 {tool.owner} · ⭐ {tool.ownerRating}
                </p>
                <p className="text-sm text-gray-500">📍 {tool.vereda}</p>

                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{tool.description}</p>

                {/* Disponibilidad */}
                <div className={`mt-3 flex items-center gap-2 text-sm font-medium ${tool.available ? "text-green-600" : "text-red-500"}`}>
                  <span>{tool.available ? "✅" : "❌"}</span>
                  <span>{tool.available ? "Disponible ahora" : "No disponible"}</span>
                </div>

                {/* Fechas bloqueadas */}
                {tool.blockedDates.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Reservado: {tool.blockedDates.join(", ")}
                  </p>
                )}

                <button
                  disabled={!tool.available}
                  className={`w-full mt-4 font-semibold text-sm py-2.5 rounded-xl transition-colors min-h-[44px] ${
                    tool.available
                      ? "bg-green-700 text-white hover:bg-green-800"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {tool.available ? "Solicitar préstamo" : "No disponible"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
