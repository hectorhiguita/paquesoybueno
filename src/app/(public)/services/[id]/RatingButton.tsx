"use client";

import Link from "next/link";
import { useState } from "react";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";

interface Props {
  providerId: string;
  listingId: string;
  userId: string | null;
}

export function RatingButton({ providerId, listingId, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!userId) {
    return (
      <Link
        href="/register"
        className="bg-green-700 text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-green-800 transition-colors min-h-[44px] flex items-center justify-center gap-2"
      >
        ⭐ Calificar
      </Link>
    );
  }

  if (done) {
    return (
      <div className="bg-green-50 text-green-700 font-semibold text-sm py-2.5 rounded-xl min-h-[44px] flex items-center justify-center gap-2 border border-green-200">
        ✓ ¡Calificación enviada!
      </div>
    );
  }

  const handleSubmit = async () => {
    if (stars === 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Community-ID": SANTA_ELENA_COMMUNITY_ID,
          "X-User-ID": userId,
        },
        body: JSON.stringify({
          providerId,
          listingId,
          stars,
          ...(comment.trim() ? { comment: comment.trim() } : {}),
        }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setError(json.error?.message ?? "No se pudo enviar la calificación");
      } else {
        setDone(true);
        setOpen(false);
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-green-700 text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-green-800 transition-colors min-h-[44px] flex items-center justify-center gap-2"
      >
        ⭐ Calificar
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-800 text-lg mb-1">Calificar proveedor</h3>
            <p className="text-sm text-gray-500 mb-5">Tu opinión ayuda a la comunidad</p>

            <div
              className="flex gap-2 justify-center mb-5"
              onMouseLeave={() => setHovered(0)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHovered(n)}
                  onClick={() => setStars(n)}
                  className={`text-4xl transition-transform hover:scale-110 ${
                    n <= (hovered || stars) ? "text-yellow-400" : "text-gray-200"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comentario opcional (máx. 500 caracteres)"
              maxLength={500}
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
            />

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
                {error}
              </p>
            )}

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => { setOpen(false); setError(""); }}
                className="flex-1 border border-gray-300 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={stars === 0 || loading}
                className="flex-1 bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40"
              >
                {loading ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
