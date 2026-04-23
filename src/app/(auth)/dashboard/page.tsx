import Link from "next/link";
import { PROVIDERS, MESSAGES, NOTIFICATIONS, TOOLS } from "@/lib/mock-data";

// Simula el usuario logueado
const ME = PROVIDERS[0]; // Carlos Restrepo

export default function DashboardPage() {
  const unreadMessages = MESSAGES.filter((m) => m.unread).length;
  const unreadNotifs = NOTIFICATIONS.filter((n) => !n.read).length;
  const myTools = TOOLS.filter((t) => t.owner === ME.name);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-500 text-sm">Bienvenido de nuevo</p>
          <h1 className="text-2xl font-bold text-gray-800 mt-0.5">
            {ME.avatar} {ME.name}
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Trabajos completados", value: ME.jobs, icon: "🔨", color: "bg-green-50 border-green-200" },
            { label: "Calificación promedio", value: `⭐ ${ME.rating}`, icon: "⭐", color: "bg-yellow-50 border-yellow-200" },
            { label: "Mensajes sin leer", value: unreadMessages, icon: "✉️", color: "bg-blue-50 border-blue-200" },
            { label: "Notificaciones", value: unreadNotifs, icon: "🔔", color: "bg-purple-50 border-purple-200" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className={`bg-white border rounded-2xl p-5 ${color}`}>
              <p className="text-2xl">{icon}</p>
              <p className="text-2xl font-bold text-gray-800 mt-2">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Acciones rápidas */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Acciones rápidas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: "/listings/new", icon: "➕", label: "Publicar servicio" },
              { href: "/messages", icon: "✉️", label: "Ver mensajes" },
              { href: "/notifications", icon: "🔔", label: "Notificaciones" },
              { href: "/tools", icon: "🔨", label: "Herramientas" },
            ].map(({ href, icon, label }) => (
              <Link
                key={href}
                href={href}
                className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-green-400 hover:shadow-sm transition-all min-h-[44px]"
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-xs font-medium text-gray-600 text-center">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Mi perfil */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Mi perfil de proveedor</h2>
            <Link href={`/services/${ME.id}`} className="text-sm text-green-700 hover:underline">
              Ver público →
            </Link>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center text-3xl">
              {ME.avatar}
            </div>
            <div>
              <p className="font-bold text-gray-800">{ME.name}</p>
              <p className="text-sm text-gray-500">{ME.category} · 📍 {ME.vereda}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {ME.tags.map((tag) => (
                  <span key={tag} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-4">{ME.description}</p>
        </div>

        {/* Mensajes recientes */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Mensajes recientes</h2>
            <Link href="/messages" className="text-sm text-green-700 hover:underline">Ver todos →</Link>
          </div>
          <div className="space-y-3">
            {MESSAGES.slice(0, 3).map((msg) => (
              <Link
                key={msg.id}
                href="/messages"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl flex-shrink-0">
                  {msg.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800">{msg.from}</p>
                  <p className="text-xs text-gray-500 truncate">{msg.preview}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-gray-400">{msg.time}</span>
                  {msg.unread && <div className="w-2 h-2 bg-green-600 rounded-full" />}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Mis herramientas */}
        {myTools.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Mis herramientas compartidas</h2>
              <Link href="/tools" className="text-sm text-green-700 hover:underline">Ver todas →</Link>
            </div>
            <div className="space-y-3">
              {myTools.map((tool) => (
                <div key={tool.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <span className="text-2xl">{tool.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-800">{tool.name}</p>
                    <p className="text-xs text-gray-500">{tool.condition}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tool.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {tool.available ? "Disponible" : "Prestada"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
