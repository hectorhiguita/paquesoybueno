"use client";

import { useEffect, useState } from "react";

interface Stats {
  users: {
    total: number;
    active: number;
    newThisWeek: number;
    newThisMonth: number;
    verifiedProviders: number;
  };
  listings: {
    total: number;
    newThisWeek: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  };
  engagement: {
    totalRatings: number;
    avgRating: number | null;
    totalMessages: number;
    messagesThisWeek: number;
    totalThreads: number;
  };
  moderation: {
    pendingReports: number;
    totalReservations: number;
    activeCategories: number;
  };
  recentActivity: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    createdAt: string;
    author: { name: string };
  }>;
}

const typeLabel: Record<string, string> = {
  service: "Servicios",
  sale: "Ventas",
  rent: "Arriendos",
  trade: "Trueques",
  tool: "Herramientas",
};

const statusLabel: Record<string, string> = {
  active: "Activas",
  inactive: "Inactivas",
  flagged: "Flagged",
  pending_review: "Pendientes",
};

const statusColor: Record<string, string> = {
  active: "text-green-700",
  inactive: "text-gray-500",
  flagged: "text-yellow-600",
  pending_review: "text-orange-600",
};

export default function AdminStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/v1/admin/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setStats(json.data as Stats);
        else setError(json.error?.message ?? "Error al cargar estadísticas");
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 text-gray-400 text-sm">Cargando estadísticas...</div>;
  if (error) return <div className="p-10 text-red-600 text-sm">{error}</div>;
  if (!stats) return null;

  return (
    <main>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <h1 className="text-2xl font-bold text-gray-800">📊 Analytics de la plataforma</h1>

        {/* Usuarios */}
        <section>
          <h2 className="text-lg font-bold text-gray-700 mb-3">👥 Usuarios</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: "Total", value: stats.users.total, color: "border-blue-200" },
              { label: "Activos", value: stats.users.active, color: "border-green-200" },
              { label: "Nuevos esta semana", value: stats.users.newThisWeek, color: "border-teal-200" },
              { label: "Nuevos este mes", value: stats.users.newThisMonth, color: "border-indigo-200" },
              { label: "Verificados", value: stats.users.verifiedProviders, color: "border-yellow-200" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`bg-white border rounded-xl p-4 ${color}`}>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Publicaciones */}
        <section>
          <h2 className="text-lg font-bold text-gray-700 mb-3">📋 Publicaciones</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-600 mb-3">Por estado</p>
              <div className="space-y-2">
                {Object.entries(stats.listings.byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${statusColor[status] ?? "text-gray-600"}`}>
                      {statusLabel[status] ?? status}
                    </span>
                    <span className="text-sm font-bold text-gray-800">{count}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Total</span>
                  <span className="text-sm font-bold text-gray-800">{stats.listings.total}</span>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-600 mb-3">Por tipo</p>
              <div className="space-y-2">
                {Object.entries(stats.listings.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{typeLabel[type] ?? type}</span>
                    <span className="text-sm font-bold text-gray-800">{count}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Nuevas esta semana</span>
                  <span className="text-sm font-bold text-green-700">+{stats.listings.newThisWeek}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Engagement */}
        <section>
          <h2 className="text-lg font-bold text-gray-700 mb-3">💬 Interacción</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: "Calificaciones totales", value: stats.engagement.totalRatings, color: "border-yellow-200" },
              { label: "Calificación promedio", value: stats.engagement.avgRating ? `⭐ ${stats.engagement.avgRating}` : "—", color: "border-amber-200" },
              { label: "Mensajes totales", value: stats.engagement.totalMessages, color: "border-blue-200" },
              { label: "Mensajes esta semana", value: stats.engagement.messagesThisWeek, color: "border-cyan-200" },
              { label: "Conversaciones", value: stats.engagement.totalThreads, color: "border-purple-200" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`bg-white border rounded-xl p-4 ${color}`}>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Moderación */}
        <section>
          <h2 className="text-lg font-bold text-gray-700 mb-3">🛡️ Moderación</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Reportes pendientes", value: stats.moderation.pendingReports, color: "border-red-200" },
              { label: "Reservas totales", value: stats.moderation.totalReservations, color: "border-orange-200" },
              { label: "Categorías activas", value: stats.moderation.activeCategories, color: "border-green-200" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`bg-white border rounded-xl p-4 ${color}`}>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SEO */}
        <section>
          <h2 className="text-lg font-bold text-gray-700 mb-3">🔍 SEO</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 text-sm">
            <div className="grid grid-cols-[160px_1fr] gap-2">
              <span className="text-gray-500 font-medium">URL canónica</span>
              <span className="text-gray-800">https://santaelenacomunidad.online</span>
            </div>
            <div className="grid grid-cols-[160px_1fr] gap-2">
              <span className="text-gray-500 font-medium">Título</span>
              <span className="text-gray-800">Santa Elena Platform — Marketplace comunitario</span>
            </div>
            <div className="grid grid-cols-[160px_1fr] gap-2">
              <span className="text-gray-500 font-medium">Descripción</span>
              <span className="text-gray-800">Marketplace comunitario para Santa Elena, Medellín</span>
            </div>
            <div className="grid grid-cols-[160px_1fr] gap-2">
              <span className="text-gray-500 font-medium">Publicaciones indexables</span>
              <span className="text-gray-800 font-semibold">{stats.listings.byStatus.active ?? 0} publicaciones activas</span>
            </div>
            <div className="grid grid-cols-[160px_1fr] gap-2">
              <span className="text-gray-500 font-medium">Proveedores verificados</span>
              <span className="text-gray-800 font-semibold">{stats.users.verifiedProviders} prestadores</span>
            </div>
          </div>
        </section>

        {/* Actividad reciente */}
        {stats.recentActivity.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-700 mb-3">🕐 Actividad en las últimas 24h</h2>
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
              {stats.recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                    <p className="text-xs text-gray-400">
                      {typeLabel[item.type] ?? item.type} · por {item.author.name}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold ${statusColor[item.status] ?? "text-gray-500"}`}>
                    {statusLabel[item.status] ?? item.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
