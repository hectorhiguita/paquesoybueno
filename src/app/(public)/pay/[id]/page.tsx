"use client";

import { useState } from "react";
import Link from "next/link";
import { PROVIDERS } from "@/lib/mock-data";
import { calcFee, formatCOP, PLATFORM_FEE_PERCENT } from "@/lib/mock-payments";

const PAYMENT_METHODS = [
  { id: "pse", label: "PSE", icon: "🏦", description: "Débito bancario inmediato" },
  { id: "nequi", label: "Nequi", icon: "📱", description: "Pago desde tu app Nequi" },
  { id: "card", label: "Tarjeta", icon: "💳", description: "Crédito o débito" },
  { id: "bancolombia", label: "Bancolombia", icon: "🟡", description: "Botón Bancolombia" },
];

export default function PayPage({ params }: { params: { id: string } }) {
  const provider = PROVIDERS.find((p) => p.id === params.id) ?? PROVIDERS[0];
  const [amount, setAmount] = useState(150000);
  const [method, setMethod] = useState("pse");
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [description, setDescription] = useState("");

  const { fee, payout } = calcFee(amount);

  if (step === "success") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto">
            ✅
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mt-4">¡Pago recibido!</h2>
          <p className="text-gray-500 text-sm mt-2">
            Tu pago de <strong>{formatCOP(amount)}</strong> está en custodia.
            Se liberará a {provider.name} cuando confirmes que el trabajo fue completado.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-5 text-left">
            <p className="text-sm font-semibold text-blue-800 mb-2">¿Cómo funciona el escrow?</p>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li>Tu dinero queda protegido en la plataforma</li>
              <li>El proveedor realiza el trabajo</li>
              <li>Tú confirmas que quedaste satisfecho</li>
              <li>El dinero se libera automáticamente al proveedor</li>
            </ol>
          </div>

          <div className="flex gap-3 mt-6">
            <Link
              href="/dashboard"
              className="flex-1 border border-gray-300 text-gray-700 font-semibold text-sm py-3 rounded-xl hover:bg-gray-50 transition-colors min-h-[44px] flex items-center justify-center"
            >
              Mi panel
            </Link>
            <Link
              href={`/payments/pay1`}
              className="flex-1 bg-green-700 text-white font-semibold text-sm py-3 rounded-xl hover:bg-green-800 transition-colors min-h-[44px] flex items-center justify-center"
            >
              Ver pago →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (step === "confirm") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full">
          <h2 className="text-xl font-bold text-gray-800 mb-5">Confirmar pago</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Proveedor</span>
              <span className="font-semibold text-gray-800">{provider.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Servicio</span>
              <span className="font-semibold text-gray-800 text-right max-w-[200px]">{description || "Servicio contratado"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Método de pago</span>
              <span className="font-semibold text-gray-800">
                {PAYMENT_METHODS.find((m) => m.id === method)?.label}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Monto del servicio</span>
              <span className="font-semibold text-gray-800">{formatCOP(amount)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Comisión plataforma ({PLATFORM_FEE_PERCENT}%)</span>
              <span className="text-red-500 font-semibold">- {formatCOP(fee)}</span>
            </div>
            <div className="flex justify-between py-2 bg-green-50 rounded-xl px-3">
              <span className="font-bold text-gray-800">El proveedor recibirá</span>
              <span className="font-bold text-green-700 text-lg">{formatCOP(payout)}</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4 text-xs text-amber-700">
            🔒 El pago quedará en custodia hasta que confirmes que el trabajo fue completado satisfactoriamente.
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep("form")}
              className="flex-1 border border-gray-300 text-gray-700 font-semibold text-sm py-3 rounded-xl hover:bg-gray-50 transition-colors min-h-[44px]"
            >
              Atrás
            </button>
            <button
              onClick={() => setStep("success")}
              className="flex-1 bg-green-700 text-white font-semibold text-sm py-3 rounded-xl hover:bg-green-800 transition-colors min-h-[44px]"
            >
              Pagar {formatCOP(amount)}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-lg mx-auto">
          <Link href={`/services/${provider.id}`} className="text-sm text-green-700 hover:underline">
            ← Volver al perfil
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8 space-y-5">
        <h1 className="text-2xl font-bold text-gray-800">Pagar servicio</h1>

        {/* Proveedor */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-3xl">
            {provider.avatar}
          </div>
          <div>
            <p className="font-bold text-gray-800">{provider.name}</p>
            <p className="text-sm text-gray-500">{provider.category} · 📍 {provider.vereda}</p>
            <p className="text-xs text-green-600 mt-0.5">⭐ {provider.rating} · {provider.jobs} trabajos</p>
          </div>
        </div>

        {/* Descripción del servicio */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <label className="text-sm font-semibold text-gray-700 block mb-2">
            Descripción del servicio
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Poda de 3 árboles y mantenimiento del jardín trasero"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 resize-none"
          />
        </div>

        {/* Monto */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <label className="text-sm font-semibold text-gray-700 block mb-3">
            Monto acordado (COP)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-xl pl-7 pr-3 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-700 min-h-[44px]"
            />
          </div>

          {/* Montos sugeridos */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {[50000, 100000, 150000, 200000, 300000].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors min-h-[44px] ${
                  amount === v
                    ? "bg-green-700 text-white border-green-700"
                    : "border-gray-300 text-gray-600 hover:border-green-400"
                }`}
              >
                {formatCOP(v)}
              </button>
            ))}
          </div>

          {/* Desglose */}
          {amount > 0 && (
            <div className="mt-4 bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Monto del servicio</span>
                <span className="font-semibold">{formatCOP(amount)}</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>Comisión plataforma ({PLATFORM_FEE_PERCENT}%)</span>
                <span className="font-semibold">- {formatCOP(fee)}</span>
              </div>
              <div className="flex justify-between text-green-700 font-bold border-t border-gray-200 pt-2">
                <span>{provider.name} recibirá</span>
                <span>{formatCOP(payout)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Método de pago */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Método de pago</p>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all min-h-[44px] text-left ${
                  method === m.id
                    ? "border-green-700 bg-green-50"
                    : "border-gray-200 hover:border-green-300"
                }`}
              >
                <span className="text-2xl">{m.icon}</span>
                <div>
                  <p className="font-semibold text-sm text-gray-800">{m.label}</p>
                  <p className="text-xs text-gray-400">{m.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Garantía */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="font-semibold text-sm text-blue-800">Pago protegido con escrow</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Tu dinero queda retenido hasta que confirmes que el trabajo fue completado. Si hay algún problema, puedes abrir una disputa.
            </p>
          </div>
        </div>

        <button
          onClick={() => setStep("confirm")}
          disabled={amount <= 0}
          className="w-full bg-green-700 text-white font-bold text-base py-4 rounded-2xl hover:bg-green-800 transition-colors min-h-[44px] disabled:opacity-50"
        >
          Continuar → {amount > 0 && formatCOP(amount)}
        </button>
      </div>
    </main>
  );
}
