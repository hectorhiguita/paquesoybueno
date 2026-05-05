"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface MemberRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  isVerifiedProvider: boolean;
  createdAt: string;
  veredaName: string | null;
  avgRating: number | null;
  listingsCount: number;
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-600",
  locked: "bg-orange-100 text-orange-600",
  under_review: "bg-yellow-100 text-yellow-700",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Activo",
  suspended: "Suspendido",
  locked: "Bloqueado",
  under_review: "En revisión",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AdminMembersPanel() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");

  const [drawer, setDrawer] = useState<MemberRow | null>(null);
  const [verifyMode, setVerifyMode] = useState(false);
  const [verifyReason, setVerifyReason] = useState("");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams();
      if (statusFilter !== "all") p.set("status", statusFilter);
      if (roleFilter !== "all") p.set("role", roleFilter);
      if (verifiedFilter !== "all") p.set("verified", verifiedFilter);
      if (debouncedSearch) p.set("search", debouncedSearch);
      const res = await fetch(`/api/v1/admin/members?${p.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as { data?: { members?: MemberRow[] }; error?: { message?: string } };
      if (!res.ok) { setError(json.error?.message ?? "Error cargando miembros"); return; }
      setMembers(json.data?.members ?? []);
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, roleFilter, verifiedFilter, debouncedSearch]);

  useEffect(() => { void load(); }, [load]);

  const patchMember = (id: string, patch: Partial<MemberRow>) => {
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, ...patch } : m));
    setDrawer((prev) => prev?.id === id ? { ...prev, ...patch } : prev);
  };

  const openDrawer = (m: MemberRow) => {
    setDrawer(m);
    setVerifyMode(false);
    setVerifyReason("");
  };

  const closeDrawer = () => {
    setDrawer(null);
    setVerifyMode(false);
    setVerifyReason("");
  };

  const handlePromote = async (member: MemberRow) => {
    const newRole = member.role === "admin" ? "member" : "admin";
    const label = newRole === "admin" ? "promover a administrador" : "quitar el rol de administrador a";
    if (!confirm(`¿Deseas ${label} ${member.name}?`)) return;
    setActioning(member.id);
    try {
      const res = await fetch(`/api/v1/admin/members/${member.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) patchMember(member.id, { role: newRole });
      else alert("No se pudo cambiar el rol.");
    } catch { alert("Error de conexión."); }
    finally { setActioning(null); }
  };

  const handleSuspend = async (member: MemberRow) => {
    if (!confirm(`¿Suspender a ${member.name}? Esto ocultará todas sus publicaciones activas.`)) return;
    setActioning(member.id);
    try {
      const res = await fetch(`/api/v1/admin/members/${member.id}/suspend`, { method: "PATCH" });
      if (res.ok) patchMember(member.id, { status: "suspended" });
      else alert("No se pudo suspender al miembro.");
    } catch { alert("Error de conexión."); }
    finally { setActioning(null); }
  };

  const handleVerify = async (member: MemberRow) => {
    if (verifyReason.trim().length < 3) return;
    setActioning(member.id);
    try {
      const res = await fetch(`/api/v1/admin/members/${member.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: verifyReason.trim() }),
      });
      if (res.ok) {
        patchMember(member.id, { isVerifiedProvider: true });
        setVerifyMode(false);
        setVerifyReason("");
      } else {
        alert("No se pudo verificar al miembro.");
      }
    } catch { alert("Error de conexión."); }
    finally { setActioning(null); }
  };

  return (
    <div id="members" className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-gray-800">👥 Miembros de la comunidad</h2>
        <button
          onClick={() => void load()}
          className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
        >
          ↺ Recargar
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, correo o teléfono..."
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 min-h-[44px] flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 min-h-[44px]"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="suspended">Suspendidos</option>
          <option value="locked">Bloqueados</option>
          <option value="under_review">En revisión</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 min-h-[44px]"
        >
          <option value="all">Todos los roles</option>
          <option value="member">Miembros</option>
          <option value="admin">Administradores</option>
        </select>
        <select
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 min-h-[44px]"
        >
          <option value="all">Verificación: todos</option>
          <option value="yes">Verificados</option>
          <option value="no">No verificados</option>
        </select>
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
                <tr
                  key={m.id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openDrawer(m)}
                >
                  <td className="py-3 px-3">
                    <p className="font-medium text-gray-800">
                      {m.name}
                      {m.isVerifiedProvider && (
                        <span className="ml-1.5 text-xs bg-green-100 text-green-700 font-semibold px-1.5 py-0.5 rounded-full">✓</span>
                      )}
                      {m.role === "admin" && (
                        <span className="ml-1.5 text-xs bg-purple-100 text-purple-700 font-semibold px-1.5 py-0.5 rounded-full">Admin</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 truncate max-w-[180px]">{m.email}</p>
                  </td>
                  <td className="py-3 px-3 text-gray-500">{m.veredaName ?? "—"}</td>
                  <td className="py-3 px-3 text-gray-500">{m.listingsCount}</td>
                  <td className="py-3 px-3">{m.avgRating != null ? `⭐ ${m.avgRating}` : "—"}</td>
                  <td className="py-3 px-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[m.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABEL[m.status] ?? m.status}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); openDrawer(m); }}
                      className="text-xs text-green-700 border border-green-200 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      Ver perfil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drawer && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={closeDrawer} />
          <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-base">Perfil del miembro</h3>
              <button onClick={closeDrawer} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <p className="text-xl font-bold text-gray-800">{drawer.name}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[drawer.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {STATUS_LABEL[drawer.status] ?? drawer.status}
                  </span>
                  {drawer.role === "admin" && (
                    <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">Administrador</span>
                  )}
                  {drawer.isVerifiedProvider && (
                    <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">✓ Verificado</span>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm">
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 shrink-0">Correo</span>
                  <span className="text-gray-700 break-all">{drawer.email}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 shrink-0">Teléfono</span>
                  <span className="text-gray-700">{drawer.phone ?? "—"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 shrink-0">Vereda</span>
                  <span className="text-gray-700">{drawer.veredaName ?? "—"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 shrink-0">Registro</span>
                  <span className="text-gray-700">{formatDate(drawer.createdAt)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{drawer.listingsCount}</p>
                  <p className="text-xs text-blue-500 mt-0.5">Publicaciones</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-700">
                    {drawer.avgRating != null ? drawer.avgRating : "—"}
                  </p>
                  <p className="text-xs text-yellow-500 mt-0.5">Rating promedio</p>
                </div>
              </div>

              {verifyMode && !drawer.isVerifiedProvider && (
                <div className="border border-green-200 bg-green-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-green-800">Motivo de verificación</p>
                  <textarea
                    value={verifyReason}
                    onChange={(e) => setVerifyReason(e.target.value)}
                    placeholder="Ej: Verificado presencialmente como electricista certificado"
                    rows={3}
                    className="w-full border border-green-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setVerifyMode(false); setVerifyReason(""); }}
                      className="flex-1 border border-gray-300 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => void handleVerify(drawer)}
                      disabled={verifyReason.trim().length < 3 || actioning === drawer.id}
                      className="flex-1 bg-green-700 text-white text-sm py-2 rounded-lg hover:bg-green-800 transition-colors disabled:opacity-40"
                    >
                      {actioning === drawer.id ? "Verificando..." : "Confirmar"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 space-y-2">
              {!drawer.isVerifiedProvider && drawer.status === "active" && !verifyMode && (
                <button
                  onClick={() => setVerifyMode(true)}
                  disabled={actioning === drawer.id}
                  className="w-full bg-green-100 text-green-700 text-sm font-semibold py-2.5 rounded-xl hover:bg-green-200 transition-colors disabled:opacity-40"
                >
                  Verificar proveedor
                </button>
              )}
              <button
                onClick={() => void handlePromote(drawer)}
                disabled={actioning === drawer.id}
                className={`w-full text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-40 ${
                  drawer.role === "admin"
                    ? "bg-purple-50 text-purple-700 hover:bg-purple-100"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {actioning === drawer.id
                  ? "Procesando..."
                  : drawer.role === "admin"
                  ? "Quitar rol de administrador"
                  : "Promover a administrador"}
              </button>
              {drawer.status !== "suspended" && (
                <button
                  onClick={() => void handleSuspend(drawer)}
                  disabled={actioning === drawer.id}
                  className="w-full bg-red-50 text-red-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-40"
                >
                  {actioning === drawer.id ? "Procesando..." : "Suspender cuenta"}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
