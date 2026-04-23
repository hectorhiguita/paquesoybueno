import Link from "next/link";
import { PAYMENTS, ADMIN_FINANCE, formatCOP, PLATFORM_FEE_PERCENT } from "@/lib/mock-payments";

const statusLabel: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pendiente",   color: "bg-yellow-100 text-yellow-700" },
  in_escrow: { label: "En custodia", color: "bg-blue-100 text-blue-700" },
  released:  { label: "Liberado",    color: "bg-green-100 text-green-700" },
  disputed:  { label: "En disputa",  color: "bg-red-100 text-red-600" },
  refunded:  { label: "Reembolsado", color: "bg-gray-100 text-gray-600" },
};

export default function AdminFinancePage() {
  return (
    <main className="min-h-screen bg-gray-100">
      <div className="bg-green-800 text-white px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-green-300 text-sm hover:text-white">← Panel admin</Link>
            <h1 className="text-xl font-bold mt-1">💰 Panel Financiero</h1>
          </div>
          <div className="text-right">
            <p className="text-green-200 text-xs">Comisión configurada</p>
            <p className="text-2xl font-bold">{PLATFORM_FEE_PERCENT}%</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Volumen total", value: formatCOP(ADMIN_FINANCE.totalVolume), icon: "📊", color: "border-gray-200" },
            { label: "Comisiones ganadas", value: formatCOP(ADMIN_FINANCE.totalFees), icon: "💵", color: "border-green-200 bg-green-50" },
            { label: "En custodia", value: formatCOP(ADMIN_FINANCE.inEscrow), icon: "🔒", color: "border-blue-200" },
            { label: "Desembolsos pendientes", value: ADMIN_FINANCE.pendingPayouts, icon: "⏳", color: "border-yellow-200" },
            { label: "Disputas activas", value: ADMIN_FINANCE.disputes, icon: "⚠️", color: "border-red-200" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className={`bg-white border rounded-xl p-4 ${color}`}>
              <p className="text-2xl">{icon}</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Este mes */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📅 Este mes — Junio 2025</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-800">{ADMIN_FINANCE.thisMonth.transactions}</p>
              <p className="text-xs text-gray-500 mt-1">Transacciones</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-800">{formatCOP(ADMIN_FINANCE.thisMonth.volume)}</p>
              <p className="text-xs text-gray-500 mt-1">Volumen procesado</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <p className="text-2xl font-bold text-green-700">{formatCOP(ADMIN_FINANCE.thisMonth.fees)}</p>
              <p className="text-xs text-gray-500 mt-1">Comisiones ({PLATFORM_FEE_PERCENT}%)</p>
            </div>
          </div>
        </div>

        {/* Disputas activas */}
        <div className="bg-white rounded-2xl border border-red-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">⚠️ Disputas activas</h2>
          {PAYMENTS.filter((p) => p.status === "disputed").map((p) => (
            <div key={p.id} className="border border-red-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-800">{p.serviceTitle}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Cliente: {p.clientName} · Proveedor: {p.providerName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.date} · {p.method}</p>
                </div>
                <p className="font-bold text-gray-800 flex-shrink-0">{formatCOP(p.amount)}</p>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 bg-green-700 text-white text-xs font-semibold py-2 rounded-lg hover:bg-green-800 transition-colors min-h-[44px]">
                  Liberar al proveedor
                </button>
                <button className="flex-1 border border-gray-300 text-gray-600 text-xs font-semibold py-2 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]">
                  Reembolsar al cliente
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Todas las transacciones */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Todas las transacciones</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="py-2 px-3 text-gray-500 font-semibold">Servicio</th>
                  <th className="py-2 px-3 text-gray-500 font-semibold">Cliente</th>
                  <th className="py-2 px-3 text-gray-500 font-semibold">Proveedor</th>
                  <th className="py-2 px-3 text-gray-500 font-semibold">Monto</th>
                  <th className="py-2 px-3 text-gray-500 font-semibold text-green-700">Comisión</th>
                  <th className="py-2 px-3 text-gray-500 font-semibold">Desembolso</th>
                  <th className="py-2 px-3 text-gray-500 font-semibold">Estado</th>
                  <th className="py-2 px-3 text-gray-500 font-semibold">Método</th>
                </tr>
              </thead>
              <tbody>
                {PAYMENTS.map((p) => {
                  const s = statusLabel[p.status];
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-800 max-w-[180px] truncate">{p.serviceTitle}</td>
                      <td className="py-3 px-3 text-gray-500">{p.clientName}</td>
                      <td className="py-3 px-3 text-gray-500">{p.providerName}</td>
                      <td className="py-3 px-3 font-semibold">{formatCOP(p.amount)}</td>
                      <td className="py-3 px-3 font-semibold text-green-700">{formatCOP(p.fee)}</td>
                      <td className="py-3 px-3 text-gray-600">{formatCOP(p.payout)}</td>
                      <td className="py-3 px-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.color}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-400">{p.method}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={3} className="py-3 px-3 font-bold text-gray-700">TOTAL</td>
                  <td className="py-3 px-3 font-bold">{formatCOP(PAYMENTS.reduce((s, p) => s + p.amount, 0))}</td>
                  <td className="py-3 px-3 font-bold text-green-700">{formatCOP(PAYMENTS.reduce((s, p) => s + p.fee, 0))}</td>
                  <td className="py-3 px-3 font-bold">{formatCOP(PAYMENTS.reduce((s, p) => s + p.payout, 0))}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Configuración de comisión */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">⚙️ Configuración de comisión</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Comisión actual por transacción</p>
              <p className="text-xs text-gray-400 mt-0.5">Se retiene automáticamente al liberar cada pago</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                defaultValue={PLATFORM_FEE_PERCENT}
                min={1}
                max={30}
                className="w-20 border border-gray-300 rounded-xl px-3 py-2 text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-green-700 min-h-[44px]"
              />
              <span className="text-xl font-bold text-gray-500">%</span>
              <button className="bg-green-700 text-white font-semibold text-sm px-4 py-2 rounded-xl hover:bg-green-800 transition-colors min-h-[44px]">
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
