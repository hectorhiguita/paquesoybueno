"use client";

import { useState } from "react";
import Link from "next/link";
import { PAYMENTS, formatCOP } from "@/lib/mock-payments";

export default function ConfirmPaymentPage({ params }: { params: { id: string } }) {
  const payment = PAYMENTS.find((p) => p.id === params.id) ?? PAYMENTS[1];
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto">
            🎉
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mt-4">¡Trabajo confirmado!</h2>
          <p className="text-gray-500 text-sm mt-2">
            El pago de <strong>{formatCOP(payment.payout)}</strong> fue liberado a{" "}
            <strong>{payment.providerName}</strong>.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4 text-sm text-green-700">
            Tu calificación de {rating} ⭐ fue publicada en el perfil del proveedor.
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center mt-6 bg-green-700 text-white font-semibold px-8 py-3 rounded-xl hover:bg-green-800 transition-colors min-h-[44px]"
          >
            Volver al panel
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-lg mx-auto">
          <Link href="/payments" className="text-sm text-green-700 hover:underline">
            ← Mis pagos
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Confirmar trabajo completado</h1>
          <p className="text-gray-500 text-sm mt-1">
            Al confirmar, el pago se liberará inmediatamente al proveedor.
          </p>
        </div>

        {/* Resumen del pago */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-2xl">
              {payment.providerAvatar}
            </div>
            <div>
              <p className="font-bold text-gray-800">{payment.providerName}</p>
              <p className="text-sm text-gray-500">{payment.serviceTitle}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm border-t border-gray-100 pt-4">
            <div className="flex justify-between">
              <span className="text-gray-500">Monto pagado</span>
              <span className="font-semibold">{formatCOP(payment.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Comisión plataforma</span>
              <span className="text-red-500 font-semibold">- {formatCOP(payment.fee)}</span>
            </div>
            <div className="flex justify-between font-bold text-green-700 border-t border-gray-100 pt-2">
              <span>El proveedor recibirá</span>
              <span>{formatCOP(payment.payout)}</span>
            </div>
          </div>
        </div>

        {/* Calificación */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="font-semibold text-gray-800 mb-3">¿Cómo fue el servicio?</p>
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`text-3xl transition-transform hover:scale-110 min-h-[44px] min-w-[44px] flex items-center justify-center ${
                  star <= rating ? "text-yellow-400" : "text-gray-200"
                }`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Cuéntanos cómo fue tu experiencia (opcional)..."
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 resize-none"
          />
        </div>

        {/* Advertencia */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          ⚠️ <strong>Importante:</strong> Una vez confirmes, el pago se libera de forma irreversible. Si tienes algún problema, abre una disputa antes de confirmar.
        </div>

        <div className="flex gap-3">
          <button className="flex-1 border border-red-300 text-red-600 font-semibold text-sm py-3 rounded-xl hover:bg-red-50 transition-colors min-h-[44px]">
            Abrir disputa
          </button>
          <button
            onClick={() => setConfirmed(true)}
            disabled={rating === 0}
            className="flex-1 bg-green-700 text-white font-bold text-sm py-3 rounded-xl hover:bg-green-800 transition-colors min-h-[44px] disabled:opacity-50"
          >
            ✅ Confirmar y liberar pago
          </button>
        </div>
      </div>
    </main>
  );
}
