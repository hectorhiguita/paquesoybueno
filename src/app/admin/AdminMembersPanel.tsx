"use client";

import { useEffect, useState } from "react";

interface MemberRow {
  id: string;
  name: string;
  email: string;
  status: string;
  isVerifiedProvider: boolean;
  createdAt: string;
  veredaName: string | null;
  avgRating: number | null;
  listingsCount: number;
}

const statusBadge: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-600",
  pending: "bg-yellow-100 text-yellow-700",
};

const statusLabel: Record<string, string> = {
  active: "Activo",
  suspended: "Suspendido",
  pending: "Pendiente",
};

export function AdminMembersPanel() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);
  const [verifyModal, setVerifyModal] = useState<MemberRow | null>(null);
  const [verifyReason, setVerifyReason] = useState("");
  const [filter, setFilter] = useState("all");

  const load = async (status: string) => {
    setLoading(true);
    setError("");
    try {
      const url = status !== "all" ? `/api/v1/admin/members?status=${status}` : "/api/v1/admin/members";
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json()) as { data?: { members?: MemberRow[] }; error?: { message?: string } };
      if (!res.ok) { setError(json.error?.message ?? "Error cargando miembros"); return; }
      setMembers(json.data?.members ?? []);
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(filter); }, [filter]);

  const handleSuspend = async (member: MemberRow) => {
    if (!confirm(`¿Suspender a ${member.name}? Esto ocultará todas sus publicaciones activas.`)) return;
    setActioning(member.id);
    try {
      const res = await fetch(`/api/v1/admin/members/${member.id}/suspend`, { method: "PATCH" });
      if (res.ok) {
        setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, status: "suspended" } : m));
      } else {
        alert("No se pudo suspender al miembro.");
      }
    } catch {
      alert("Error de conexión.");
    } finally {
      setActioning(null);
    }
  };

  const handleVerify = async () => {
    if (!verifyModal || verifyReason.trim().length < 3) return;
    setActioning(verifyModal.id);
    try {
      const res = await fetch(`/api/v1/admin/members/${verifyModal.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: verifyReason.trim() }),
      });
      if (res.ok) {
        setMembers((prev) => prev.map((m) => m.id === verifyModal.id ? { ...m, isVerifiedProvider: true } : m));
        setVerifyModal(null);
        setVerifyReason("");
      } else {
        alert("No se pudo verificar al miembro.");
      }
    } catch {
      alert("Error de conexión.");
    } finally {
      setActioning(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-gray-800">👥 Miembros de la comunidad</h2>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 min-h-[44px]"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="suspended">Suspendidos</option>
          </select>
          <button
            onClick={() => void load(filter)}
            className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            ↺ Recargar
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Cargando miembros...</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-gray-400">No hay miembros con este filtro.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-gray-500 font-semibold">Miembro</th>
                <th className="text-left py-2 px-3 text-gray-500 font-semibold">Vereda</th>
                <th className="text-left py-2 px-3 text-gray-500 font-semibold">Publicaciones</th>
                <th className="text-left py-2 px-3 text-gray-500 font-semibold">Rating</th>
                <th className="text-left py-2 px-3 text-gray-500 font-semibold">Estado</th>
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-3">
                    <p className="font-medium text-gray-800">
                      {m.name}
                      {m.isVerifiedProvider && (
                        <span className="ml-1.5 text-xs bg-green-100 text-green-700 font-semibold px-1.5 py-0.5 rounded-full">
                          ✓
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 truncate max-w-[180px]">{m.email}</p>
                  </td>
                  <td className="py-3 px-3 text-gray-500">{m.veredaName ?? "—"}</td>
                  <td className="py-3 px-3 text-gray-500">{m.listingsCount}</td>
                  <td className="py-3 px-3">
                    {m.avgRating != null ? `⭐ ${m.avgRating}` : "—"}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusBadge[m.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {statusLabel[m.status] ?? m.status}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex gap-1 justify-end">
                      {!m.isVerifiedProvider && m.status === "active" && (
                        <button
                          onClick={() => { setVerifyModal(m); setVerifyReason(""); }}
                          disabled={actioning === m.id}
                          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 transition-colors min-h-[44px] disabled:opacity-40"
                        >
                          Verificar
                        </button>
                      )}
                      {m.status !== "suspended" && (
                        <button
                          onClick={() => void handleSuspend(m)}
                          disabled={actioning === m.id}
                          className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors min-h-[44px] disabled:opacity-40"
                        >
                          Suspender
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal verificar */}
      {verifyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-800 mb-1">Verificar proveedor</h3>
            <p className="text-sm text-gray-500 mb-4">
              Verificarás a <strong>{verifyModal.name}</strong>. Escribe el motivo:
            </p>
            <textarea
              value={verifyReason}
              onChange={(e) => setVerifyReason(e.target.value)}
              placeholder="Ej: Verificado presencialmente como electricista certificado"
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setVerifyModal(null)}
                className="flex-1 border border-gray-300 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleVerify()}
                disabled={verifyReason.trim().length < 3 || actioning === verifyModal.id}
                className="flex-1 bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40"
              >
                {actioning === verifyModal.id ? "Verificando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
