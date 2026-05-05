"use client";

import { useEffect, useState } from "react";

interface ReportRow {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  reporterId: string;
  targetId: string;
  targetType: string;
}

export function AdminReportsPanel() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/admin/reports", { cache: "no-store" });
      const json = (await res.json()) as { data?: { reports?: ReportRow[] }; error?: { message?: string } };
      if (!res.ok) { setError(json.error?.message ?? "Error cargando reportes"); return; }
      setReports(json.data?.reports ?? []);
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Hace menos de 1 hora";
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? "s" : ""}`;
    const days = Math.floor(hours / 24);
    return `Hace ${days} día${days > 1 ? "s" : ""}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">⚠️ Reportes pendientes</h2>
        <button
          onClick={() => void load()}
          className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
        >
          ↺
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Cargando reportes...</p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-gray-400">No hay reportes pendientes.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm text-gray-800 capitalize">{r.targetType}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Motivo: {r.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(r.createdAt)}</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex-shrink-0">
                  Pendiente
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
