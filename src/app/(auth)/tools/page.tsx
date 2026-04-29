import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";
import { parseToolMeta } from "@/lib/tool-meta";

export const dynamic = "force-dynamic";

const conditionColor: Record<string, string> = {
  Bueno: "bg-green-100 text-green-700",
  Regular: "bg-yellow-100 text-yellow-700",
  "Necesita reparación": "bg-red-100 text-red-700",
};

export default async function ToolsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tools = await prisma.listing.findMany({
    where: { communityId: SANTA_ELENA_COMMUNITY_ID, type: "tool", status: "active" },
    include: {
      author: { select: { id: true, name: true, isVerifiedProvider: true } },
      vereda: { select: { name: true } },
      images: { select: { url: true, order: true }, orderBy: { order: "asc" } },
      reservations: {
        where: { status: "confirmed" },
        select: { startDate: true, endDate: true },
      },
      ratings: { select: { stars: true } },
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toolsWithAvail = tools.map((t) => {
    const meta = parseToolMeta(t.tradeDescription);
    const isReservedNow = t.reservations.some((r) => {
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      return start <= today && end >= today;
    });
    const avg =
      t.ratings.length > 0
        ? Math.round((t.ratings.reduce((s, r) => s + r.stars, 0) / t.ratings.length) * 10) / 10
        : null;
    return { ...t, isAvailable: !isReservedNow, avgRating: avg, toolMeta: meta };
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🔨 Herramientas Compartidas</h1>
            <p className="text-gray-500 text-sm mt-1">
              Alquila lo que necesitas por hora o por día · Comparte lo que tienes
            </p>
          </div>
          <Link
            href="/listings/new?type=tool"
            className="bg-green-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-green-800 transition-colors min-h-[44px] flex items-center gap-2"
          >
            + Publicar herramienta
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {toolsWithAvail.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-4xl mb-3">🔨</p>
            <p className="text-gray-600 font-semibold">No hay herramientas disponibles aún</p>
            <p className="text-gray-400 text-sm mt-1">
              ¡Sé el primero en publicar una herramienta para alquilar en la comunidad!
            </p>
            <Link
              href="/listings/new?type=tool"
              className="inline-flex items-center mt-5 bg-green-700 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-green-800 transition-colors min-h-[44px]"
            >
              + Publicar mi herramienta
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {toolsWithAvail.map((tool) => (
              <div
                key={tool.id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
              >
                {tool.images[0]?.url ? (
                  <img
                    src={tool.images[0].url}
                    alt={tool.title}
                    className="h-32 w-full object-cover"
                  />
                ) : (
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 h-32 flex items-center justify-center text-5xl">
                    🔨
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-800 leading-snug">{tool.title}</h3>
                    {tool.toolMeta.condition && (
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          conditionColor[tool.toolMeta.condition] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {tool.toolMeta.condition}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 mt-1">
                    👤 {tool.author.name}
                    {tool.author.isVerifiedProvider && (
                      <span className="ml-1 text-green-600 font-semibold">✓</span>
                    )}
                    {tool.avgRating !== null && ` · ⭐ ${tool.avgRating}`}
                  </p>
                  <p className="text-sm text-gray-500">📍 {tool.vereda.name}</p>

                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{tool.description}</p>

                  {(tool.toolMeta.pricePerHourCop !== null || tool.toolMeta.pricePerDayCop !== null) && (
                    <div className="mt-2 space-y-1">
                      {tool.toolMeta.pricePerHourCop !== null && (
                        <p className="text-green-700 font-semibold text-sm">
                          ${Number(tool.toolMeta.pricePerHourCop).toLocaleString("es-CO")} COP / hora
                        </p>
                      )}
                      {tool.toolMeta.pricePerDayCop !== null && (
                        <p className="text-green-700 font-semibold text-sm">
                          ${Number(tool.toolMeta.pricePerDayCop).toLocaleString("es-CO")} COP / día
                        </p>
                      )}
                    </div>
                  )}

                  <div
                    className={`mt-3 flex items-center gap-2 text-sm font-medium ${
                      tool.isAvailable ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    <span>{tool.isAvailable ? "✅" : "❌"}</span>
                    <span>{tool.isAvailable ? "Disponible ahora" : "Reservada"}</span>
                  </div>

                  <Link
                    href={`/messages?participantId=${tool.author.id}&listingId=${tool.id}`}
                    className={`w-full mt-4 font-semibold text-sm py-2.5 rounded-xl transition-colors min-h-[44px] flex items-center justify-center ${
                      tool.isAvailable
                        ? "bg-green-700 text-white hover:bg-green-800"
                        : "bg-gray-100 text-gray-400 pointer-events-none"
                    }`}
                  >
                    {tool.isAvailable ? "Solicitar alquiler" : "No disponible"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
