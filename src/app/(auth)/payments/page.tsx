import Link from "next/link";
import { PAYMENTS, MY_WALLET, WALLET_TRANSACTIONS, formatCOP, PLATFORM_FEE_PERCENT } from "@/lib/mock-payments";

const statusLabel: Record<string, { label: string; color: string; icon: string }> = {
  pending:    { label: "Pendiente",   color: "bg-yellow-100 text-yellow-700", icon: "⏳" },
  in_escrow:  { label: "En custodia", color: "bg-blue-100 text-blue-700",    icon: "🔒" },
  released:   { label: "Liberado",    color: "bg-green-100 text-green-700",  icon: "✅" },
  disputed:   { label: "En disputa",  color: "bg-red-100 text-red-600",      icon: "⚠️" },
  refunded:   { label: "Reembolsado", color: "bg-gray-100 text-gray-600",    icon: "↩️" },
};

export default function PaymentsPage() {
  const myPayments = PAYMENTS.filter((p) => p.providerName === "Carlos Restrepo");
  const inEscrow = myPayments.filter((p) => p.status === "in_escrow");

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">💰 Mis Pagos</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona tus cobros y saldo disponible</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Wallet */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-green-700 text-white rounded-2xl p-5 col-span-2 sm:col-span-1">
            <p className="text-green-200 text-xs font-semibold uppercase tracking-wide">Saldo disponible</p>
            <p className="text-3xl font-bold mt-1">{formatCOP(MY_WALLET.balance)}</p>
            <button className="mt-3 bg-white text-green-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors min-h-[44px]">
              Retirar →
            </button>
          </div>
          <div className="bg-white border border-blue-200 rounded-2xl p-5">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">En custodia</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{formatCOP(MY_WALLET.inEscrow)}</p>
            <p className="text-xs text-gray-400 mt-1">{inEscrow.length} trabajo{inEscrow.length !== 1 ? "s" : ""} en progreso</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Total ganado</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{formatCOP(MY_WALLET.totalEarned)}</p>
            <p className="text-xs text-gray-400 mt-1">Histórico</p>
          </div>
          <div className="bg-white border border-red-100 rounded-2xl p-5">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Comisiones pagadas</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{formatCOP(MY_WALLET.totalFeesPaid)}</p>
            <p className="text-xs text-gray-400 mt-1">{PLATFORM_FEE_PERCENT}% por transacción</p>
          </div>
        </div>

        {/* Pagos en custodia — acción requerida del cliente */}
        {inEscrow.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <h2 className="font-bold text-blue-800 mb-3">🔒 Pagos esperando confirmación del cliente</h2>
            <div className="space-y-3">
              {inEscrow.map((p) => (
                <div key={p.id} className="bg-white rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{p.serviceTitle}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Cliente: {p.clientName} · {p.date}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-green-700">{formatCOP(p.payout)}</p>
                    <p className="text-xs text-gray-400">Recibirás al liberar</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-blue-600 mt-3">
              El cliente debe confirmar que el trabajo fue completado para liberar el pago.
            </p>
          </div>
        )}

        {/* Historial de pagos */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Historial de pagos</h2>
          <div className="space-y-3">
            {myPayments.map((p) => {
              const s = statusLabel[p.status];
              return (
                <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{p.serviceTitle}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.clientName} · {p.date} · {p.method}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-800">{formatCOP(p.payout)}</p>
                    <p className="text-xs text-red-400">- {formatCOP(p.fee)} comisión</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${s.color}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Movimientos del wallet */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Movimientos de cuenta</h2>
          <div className="space-y-2">
            {WALLET_TRANSACTIONS.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-gray-700">{t.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.date}</p>
                </div>
                <span className={`font-bold text-sm ${t.amount > 0 ? "text-green-600" : "text-red-500"}`}>
                  {t.amount > 0 ? "+" : ""}{formatCOP(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
