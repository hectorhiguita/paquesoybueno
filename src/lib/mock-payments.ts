// ─── Configuración de comisiones ──────────────────────────────────────────────

export const PLATFORM_FEE_PERCENT = 8; // 8% de comisión de la plataforma

export function calcFee(amount: number) {
  const fee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
  const payout = amount - fee;
  return { fee, payout };
}

export function formatCOP(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(amount);
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type PaymentStatus =
  | "pending"      // Pago iniciado, esperando confirmación del cliente
  | "in_escrow"    // Dinero retenido, trabajo en progreso
  | "released"     // Trabajo confirmado, desembolso realizado
  | "disputed"     // En disputa
  | "refunded";    // Reembolsado al cliente

export interface Payment {
  id: string;
  serviceTitle: string;
  clientName: string;
  providerName: string;
  providerAvatar: string;
  amount: number;
  fee: number;
  payout: number;
  status: PaymentStatus;
  date: string;
  releaseDate?: string;
  method: string;
}

export interface WalletTransaction {
  id: string;
  type: "credit" | "debit" | "fee";
  description: string;
  amount: number;
  date: string;
  paymentId: string;
}

// ─── Pagos mock ───────────────────────────────────────────────────────────────

export const PAYMENTS: Payment[] = [
  {
    id: "pay1",
    serviceTitle: "Poda de árboles y mantenimiento de jardín",
    clientName: "María García",
    providerName: "Carlos Restrepo",
    providerAvatar: "👨‍🌾",
    amount: 180000,
    fee: calcFee(180000).fee,
    payout: calcFee(180000).payout,
    status: "released",
    date: "10 Jun 2025",
    releaseDate: "12 Jun 2025",
    method: "PSE",
  },
  {
    id: "pay2",
    serviceTitle: "Instalación eléctrica cocina",
    clientName: "Jorge López",
    providerName: "Luis Martínez",
    providerAvatar: "👨‍🔧",
    amount: 250000,
    fee: calcFee(250000).fee,
    payout: calcFee(250000).payout,
    status: "in_escrow",
    date: "14 Jun 2025",
    method: "Nequi",
  },
  {
    id: "pay3",
    serviceTitle: "Reparación tubería baño",
    clientName: "Rosa Martínez",
    providerName: "Juan Pérez",
    providerAvatar: "🔧",
    amount: 120000,
    fee: calcFee(120000).fee,
    payout: calcFee(120000).payout,
    status: "in_escrow",
    date: "15 Jun 2025",
    method: "Tarjeta",
  },
  {
    id: "pay4",
    serviceTitle: "Reparación nevera Samsung",
    clientName: "Beatriz Luna",
    providerName: "Claudia Herrera",
    providerAvatar: "🔌",
    amount: 95000,
    fee: calcFee(95000).fee,
    payout: calcFee(95000).payout,
    status: "released",
    date: "8 Jun 2025",
    releaseDate: "9 Jun 2025",
    method: "PSE",
  },
  {
    id: "pay5",
    serviceTitle: "Soporte técnico computador",
    clientName: "Tomás Arango",
    providerName: "Sofía Torres",
    providerAvatar: "📱",
    amount: 80000,
    fee: calcFee(80000).fee,
    payout: calcFee(80000).payout,
    status: "disputed",
    date: "13 Jun 2025",
    method: "Nequi",
  },
];

// ─── Wallet del proveedor (Carlos Restrepo) ───────────────────────────────────

export const MY_WALLET = {
  balance: 345600,       // Saldo disponible para retirar
  inEscrow: 165600,      // En custodia (trabajos en progreso)
  totalEarned: 1240000,  // Total ganado histórico
  totalFeesPaid: 99200,  // Total comisiones pagadas
};

export const WALLET_TRANSACTIONS: WalletTransaction[] = [
  { id: "wt1", type: "credit", description: "Pago liberado: Poda de árboles", amount: 165600, date: "12 Jun 2025", paymentId: "pay1" },
  { id: "wt2", type: "fee", description: "Comisión plataforma (8%): Poda de árboles", amount: -14400, date: "12 Jun 2025", paymentId: "pay1" },
  { id: "wt3", type: "credit", description: "Pago liberado: Reparación nevera", amount: 87400, date: "9 Jun 2025", paymentId: "pay4" },
  { id: "wt4", type: "fee", description: "Comisión plataforma (8%): Reparación nevera", amount: -7600, date: "9 Jun 2025", paymentId: "pay4" },
  { id: "wt5", type: "debit", description: "Retiro a cuenta bancaria", amount: -200000, date: "5 Jun 2025", paymentId: "" },
  { id: "wt6", type: "credit", description: "Pago liberado: Instalación jardín", amount: 138000, date: "1 Jun 2025", paymentId: "" },
  { id: "wt7", type: "fee", description: "Comisión plataforma (8%): Instalación jardín", amount: -12000, date: "1 Jun 2025", paymentId: "" },
];

// ─── Resumen admin ────────────────────────────────────────────────────────────

export const ADMIN_FINANCE = {
  totalVolume: 725000,
  totalFees: 58000,
  inEscrow: 370000,
  pendingPayouts: 2,
  disputes: 1,
  thisMonth: {
    volume: 725000,
    fees: 58000,
    transactions: 5,
  },
};
