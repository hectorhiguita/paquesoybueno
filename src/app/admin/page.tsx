export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";
import { AdminCategoriesPanel } from "./AdminCategoriesPanel";
import { AdminListingsPanel } from "./AdminListingsPanel";
import { AdminMembersPanel } from "./AdminMembersPanel";
import { AdminReportsPanel } from "./AdminReportsPanel";

async function getStats() {
  const communityId = SANTA_ELENA_COMMUNITY_ID;
  const [totalUsers, verifiedProviders, totalListings, totalTools, pendingReports] =
    await Promise.all([
      prisma.user.count({ where: { communityId } }),
      prisma.user.count({ where: { communityId, isVerifiedProvider: true } }),
      prisma.listing.count({ where: { communityId } }),
      prisma.listing.count({ where: { communityId, type: "tool" } }),
      prisma.report.count({ where: { communityId, status: "pending" } }),
    ]);
  return { totalUsers, verifiedProviders, totalListings, totalTools, pendingReports };
}

export default async function AdminPage() {
  const { totalUsers, verifiedProviders, totalListings, totalTools, pendingReports } =
    await getStats();

  const statCards = [
    { label: "Miembros", value: totalUsers, icon: "👥", color: "border-blue-200 hover:border-blue-400", href: "#members" },
    { label: "Verificados", value: verifiedProviders, icon: "✅", color: "border-green-200 hover:border-green-400", href: "#members" },
    { label: "Publicaciones", value: totalListings, icon: "📋", color: "border-purple-200 hover:border-purple-400", href: "#listings" },
    { label: "Herramientas", value: totalTools, icon: "🔨", color: "border-yellow-200 hover:border-yellow-400", href: "#listings" },
    { label: "Reportes pendientes", value: pendingReports, icon: "⚠️", color: "border-red-200 hover:border-red-400", href: "#reports" },
  ];

  return (
    <main>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {statCards.map(({ label, value, icon, color, href }) => (
            <Link
              key={label}
              href={href}
              className={`bg-white border rounded-xl p-4 ${color} hover:shadow-md transition-all block`}
            >
              <p className="text-2xl">{icon}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </Link>
          ))}
        </div>

        <div id="listings">
          <AdminListingsPanel />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div id="reports">
            <AdminReportsPanel />
          </div>
          <AdminCategoriesPanel />
        </div>

        <AdminMembersPanel />
      </div>
    </main>
  );
}
