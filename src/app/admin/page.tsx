import Link from "next/link";
import { PROVIDERS, MARKET_ITEMS, TOOLS } from "@/lib/mock-data";

const REPORTS = [
  { id: "r1", reporter: "Ana Gómez", target: "Anuncio: Nevera Samsung", reason: "Precio sospechoso", status: "pending", date: "Hace 1 hora" },
  { id: "r2", reporter: "Pedro Álvarez", target: "Usuario: Miguel Ruiz", reason: "Comportamiento inapropiado", status: "pending", date: "Hace 3 horas" },
  { id: "r3", reporter: "Claudia Herrera", target: "Anuncio: Bicicleta Trek", reason: "Descripción engañosa", status: "resolved", date: "Ayer" },
];

const CATEGORIES_ADMIN = [
  { name: "Jardinería", listings: 2, active: true },
  { name: "Electricidad", listings: 2, active: true },
  { name: "Plomería", listings: 1, active: true },
  { name: "Construcción", listings: 1, active: true },
  { name: "Tecnología", listings: 1, active: true },
  { name: "Transporte", listings: 1, active: true },
  { name: "Electrodomésticos", listings: 1, active: true },
  { name: "Agricultura", listings: 1, active: true },
  { name: "Cocina", listings: 0, active: false },
];

export default function AdminPage() {
  const totalProviders = PROVIDERS.length;
  const verifiedProviders = PROVIDERS.filter((p) => p.verified).length;
  const totalListings = MARKET_ITEMS.length;
  const totalTools = TOOLS.length;
  const pendingReports = REPORTS.filter((r) => r.status === "pending").length;

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-green-800 text-white px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">⚙️ Panel de Administración</h1>
            <p className="text-green-200 text-sm mt-0.5">Santa Elena Platform</p>
          </div>
          <Link href="/" className="text-green-200 text-sm hover:text-white">← Ver sitio</Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Miembros", value: totalProviders, icon: "👥", color: "border-blue-200" },
            { label: "Verificados", value: verifiedProviders, icon: "✅", color: "border-green-200" },
            { label: "Anuncios", value: totalListings, icon: "📋", color: "border-purple-200" },
            { label: "Herramientas", value: totalTools, icon: "🔨", color: "border-yellow-200" },
            { label: "Reportes pendientes", value: pendingReports, icon: "⚠️", color: "border-red-200" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className={`bg-white border rounded-xl p-4 ${color}`}>
              <p className="text-2xl">{icon}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reportes pendientes */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">⚠️ Reportes pendientes</h2>
            <div className="space-y-3">
              {REPORTS.map((r) => (
                <div key={r.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{r.target}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Reportado por: {r.reporter}</p>
                      <p className="text-xs text-gray-500">Motivo: {r.reason}</p>
                      <p className="text-xs text-gray-400 mt-1">{r.date}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      r.status === "pending" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
                    }`}>
                      {r.status === "pending" ? "Pendiente" : "Resuelto"}
                    </span>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2 mt-3">
                      <button className="flex-1 bg-red-600 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-red-700 transition-colors min-h-[44px]">
                        Suspender usuario
                      </button>
                      <button className="flex-1 border border-gray-300 text-gray-600 text-xs font-semibold py-1.5 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]">
                        Desestimar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Gestión de categorías */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">📂 Categorías</h2>
              <button className="text-sm bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-800 transition-colors min-h-[44px] flex items-center">
                + Nueva
              </button>
            </div>
            <div className="space-y-2">
              {CATEGORIES_ADMIN.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{cat.name}</p>
                    <p className="text-xs text-gray-500">{cat.listings} anuncios</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      cat.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                    }`}>
                      {cat.active ? "Activa" : "Inactiva"}
                    </span>
                    <button className="text-xs text-gray-400 hover:text-gray-600 min-h-[44px] px-2">
                      {cat.active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Miembros */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">👥 Miembros de la comunidad</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-semibold">Miembro</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-semibold">Vereda</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-semibold">Categoría</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-semibold">Rating</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-semibold">Estado</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {PROVIDERS.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{p.avatar}</span>
                        <span className="font-medium text-gray-800">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-500">{p.vereda}</td>
                    <td className="py-3 px-3 text-gray-500">{p.category}</td>
                    <td className="py-3 px-3">⭐ {p.rating}</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        p.verified ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {p.verified ? "✓ Verificado" : "Sin verificar"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1">
                        {!p.verified && (
                          <button className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 transition-colors min-h-[44px]">
                            Verificar
                          </button>
                        )}
                        <button className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors min-h-[44px]">
                          Suspender
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
