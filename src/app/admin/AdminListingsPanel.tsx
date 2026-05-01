"use client";

import { useEffect, useState } from "react";

interface ListingRow {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  author: { id: string; name: string };
  category: { name: string } | null;
}

const typeLabel: Record<string, string> = {
  service: "Servicio",
  sale: "Venta",
  trade: "Trueque",
  tool: "Herramienta",
  rent: "Arriendo",
};

const statusBadge: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
  flagged: "bg-yellow-100 text-yellow-700",
  pending_review: "bg-orange-100 text-orange-700",
};

const statusLabel: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  flagged: "Flagged",
  pending_review: "Pendiente",
};

export function AdminListingsPanel() {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const load = async (status?: string) => {
    setLoading(true);
    setError("");
    try {
      const url =
        status && status !== "all"
          ? `/api/v1/admin/listings?status=${status}`
          : "/api/v1/admin/listings";
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json()) as { data?: { listings?: ListingRow[] }; error?: { message?: string } };
      if (!res.ok) {
        setError(json.error?.message ?? "No fue posible cargar las publicaciones.");
        return;
      }
      setListings(json.data?.listings ?? []);
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(filter);
  }, [filter]);

  const toggleStatus = async (listing: ListingRow) => {
    const newStatus = listing.status === "active" ? "inactive" : "active";
    setToggling(listing.id);
    setError("");

    // Optimistic update
    setListings((prev) =>
      prev.map((l) => (l.id === listing.id ? { ...l, status: newStatus } : l))
    );

    try {
      const res = await fetch(`/api/v1/admin/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setListings((prev) =>
          prev.map((l) => (l.id === listing.id ? { ...l, status: listing.status } : l))
        );
        setError("No fue posible actualizar la publicación.");
      }
    } catch {
      setListings((prev) =>
        prev.map((l) => (l.id === listing.id ? { ...l, status: listing.status } : l))
      );
      setError("Error de conexión.");
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-gray-800">📋 Publicaciones</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 min-h-[44px]"
        >
          <option value="all">Todas</option>
          <option value="active">Activas</option>
          <option value="inactive">Inactivas</option>
          <option value="flagged">Flagged</option>
          <option value="pending_review">Pendientes</option>
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Cargando publicaciones...</p>
      ) : listings.length === 0 ? (
        <p className="text-sm text-gray-400">No hay publicaciones con este filtro.</p>
      ) : (
        <div className="space-y-2">
          {listings.map((listing) => {
            const canToggle =
              listing.status === "active" || listing.status === "inactive";
            return (
              <div
                key={listing.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">
                    {listing.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {typeLabel[listing.type] ?? listing.type}
                    {listing.category ? ` · ${listing.category.name}` : ""} ·{" "}
                    {listing.author.name}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusBadge[listing.status] ?? "bg-gray-100 text-gray-500"}`}
                >
                  {statusLabel[listing.status] ?? listing.status}
                </span>
                {canToggle && (
                  <button
                    onClick={() => void toggleStatus(listing)}
                    disabled={toggling === listing.id}
                    className="text-xs text-gray-500 hover:text-gray-800 border border-gray-300 hover:border-gray-400 px-2 py-1 rounded-lg transition-colors min-h-[44px] flex-shrink-0 disabled:opacity-40"
                  >
                    {toggling === listing.id
                      ? "..."
                      : listing.status === "active"
                        ? "Desactivar"
                        : "Activar"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
