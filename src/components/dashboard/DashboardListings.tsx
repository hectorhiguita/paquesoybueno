"use client";

import { useState } from "react";

interface Listing {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: Date;
  _count: { ratings: number };
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
  flagged: "En revisión",
  pending_review: "Pendiente",
};

export function DashboardListings({
  initialListings,
  userId,
}: {
  initialListings: Listing[];
  userId: string;
}) {
  const [listings, setListings] = useState(initialListings);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState("");

  const toggle = async (listing: Listing) => {
    if (listing.status === "flagged" || listing.status === "pending_review") return;
    const newStatus = listing.status === "active" ? "inactive" : "active";
    setToggling(listing.id);
    setError("");

    // Optimistic update
    setListings((prev) =>
      prev.map((l) => (l.id === listing.id ? { ...l, status: newStatus } : l))
    );

    try {
      const res = await fetch(`/api/v1/listings/${listing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": userId,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        // Revert on error
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
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
          {error}
        </p>
      )}
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
                {typeLabel[listing.type] ?? listing.type} ·{" "}
                {listing._count.ratings} calificación
                {listing._count.ratings !== 1 ? "es" : ""}
              </p>
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusBadge[listing.status] ?? "bg-gray-100 text-gray-500"}`}
            >
              {statusLabel[listing.status] ?? listing.status}
            </span>
            {canToggle && (
              <button
                onClick={() => void toggle(listing)}
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
  );
}
