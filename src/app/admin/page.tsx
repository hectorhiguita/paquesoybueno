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

  return (
    <main>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Miembros", value: totalUsers, icon: "👥", color: "border-blue-200" },
            { label: "Verificados", value: verifiedProviders, icon: "✅", color: "border-green-200" },
            { label: "Publicaciones", value: totalListings, icon: "📋", color: "border-purple-200" },
            { label: "Herramientas", value: totalTools, icon: "🔨", color: "border-yellow-200" },
            { label: "Reportes pendientes", value: pendingReports, icon: "⚠️", color: "border-red-200" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className={`bg-white border rounded-xl p-4 ${color}`}>
              <p className="text-2xl">{icon}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <AdminListingsPanel />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdminReportsPanel />
          <AdminCategoriesPanel />
        </div>

        <AdminMembersPanel />
      </div>
    </main>
  );
}
