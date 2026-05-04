import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";
import { DashboardListings } from "@/components/dashboard/DashboardListings";
import { DashboardProfileSection } from "@/components/dashboard/DashboardProfileSection";

export const dynamic = "force-dynamic";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isVerifiedProvider: boolean;
  avatarUrl: string | null;
  veredaId: string | null;
  homeVereda: { id: string; name: string } | null;
  _count: { ratingsReceived: number };
}

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        isVerifiedProvider: true, avatarUrl: true, veredaId: true,
        homeVereda: { select: { id: true, name: true } },
        _count: { select: { ratingsReceived: true } },
      },
    }) as UserProfile | null;
  } catch {
    const basic = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, role: true, isVerifiedProvider: true },
    });
    if (!basic) return null;
    return { ...basic, avatarUrl: null, veredaId: null, homeVereda: null, _count: { ratingsReceived: 0 } };
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.requiresPhoneVerification) redirect("/complete-profile");

  const userId = session.user.id;
  const communityId = session.communityId;

  const [user, unreadMessages, unreadNotifs, myListings, veredas] = await Promise.all([
    fetchUserProfile(userId),
    prisma.message.count({
      where: {
        communityId,
        delivered: false,
        thread: { OR: [{ participantA: userId }, { participantB: userId }] },
        senderId: { not: userId },
      },
    }),
    prisma.notification.count({
      where: { userId, communityId, read: false, expiresAt: { gt: new Date() } },
    }),
    prisma.listing.findMany({
      where: { authorId: userId, communityId },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        createdAt: true,
        _count: { select: { ratings: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.vereda.findMany({
      where: { communityId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!user) redirect("/login");

  const avgRatingResult = await prisma.rating.aggregate({
    where: { providerId: userId, communityId },
    _avg: { stars: true },
    _count: { stars: true },
  });
  const avgRating = avgRatingResult._avg.stars
    ? Math.round(avgRatingResult._avg.stars * 10) / 10
    : null;

  const recentThreads = await prisma.messageThread.findMany({
    where: { communityId, OR: [{ participantA: userId }, { participantB: userId }] },
    include: {
      messages: {
        orderBy: { sentAt: "desc" },
        take: 1,
        select: { content: true, sentAt: true, senderId: true },
      },
      userA: { select: { id: true, name: true } },
      userB: { select: { id: true, name: true } },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 3,
  });

  const toolListings = myListings.filter((l) => l.type === "tool");

  const statusBadge: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-500",
    flagged: "bg-yellow-100 text-yellow-700",
    pending_review: "bg-orange-100 text-orange-700",
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-500 text-sm">Bienvenido de nuevo</p>
          <h1 className="text-2xl font-bold text-gray-800 mt-0.5">Mi panel</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Perfil + botón admin */}
        <DashboardProfileSection
          userId={userId}
          initialName={user.name}
          initialPhone={user.phone}
          initialVeredaId={user.veredaId ?? null}
          initialAvatarUrl={user.avatarUrl ?? null}
          initialVeredaName={user.homeVereda?.name ?? null}
          isVerifiedProvider={user.isVerifiedProvider}
          isAdmin={user.role === "admin"}
          veredas={veredas}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Publicaciones", value: myListings.length, icon: "📋", color: "bg-green-50 border-green-200" },
            { label: "Calificación", value: avgRating ? `⭐ ${avgRating}` : "—", icon: "⭐", color: "bg-yellow-50 border-yellow-200" },
            { label: "Mensajes sin leer", value: unreadMessages, icon: "✉️", color: "bg-blue-50 border-blue-200" },
            { label: "Notificaciones", value: unreadNotifs, icon: "🔔", color: "bg-purple-50 border-purple-200" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className={`bg-white border rounded-2xl p-5 ${color}`}>
              <p className="text-2xl">{icon}</p>
              <p className="text-2xl font-bold text-gray-800 mt-2">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Acciones rápidas */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Acciones rápidas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: "/listings/new", icon: "➕", label: "Publicar anuncio" },
              { href: "/messages", icon: "✉️", label: "Ver mensajes" },
              { href: "/notifications", icon: "🔔", label: "Notificaciones" },
              { href: "/tools", icon: "🔨", label: "Herramientas" },
            ].map(({ href, icon, label }) => (
              <Link
                key={href}
                href={href}
                className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-green-400 hover:shadow-sm transition-all min-h-[44px]"
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-xs font-medium text-gray-600 text-center">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Mis publicaciones */}
        {myListings.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Mis publicaciones</h2>
              <Link href="/listings/new" className="text-sm text-green-700 hover:underline">
                + Nueva →
              </Link>
            </div>
            <DashboardListings initialListings={myListings} userId={userId} />
          </div>
        )}

        {/* Mensajes recientes */}
        {recentThreads.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Mensajes recientes</h2>
              <Link href="/messages" className="text-sm text-green-700 hover:underline">
                Ver todos →
              </Link>
            </div>
            <div className="space-y-3">
              {recentThreads.map((thread) => {
                const other = thread.userA.id === userId ? thread.userB : thread.userA;
                const lastMsg = thread.messages[0];
                const isUnread = !!lastMsg && lastMsg.senderId !== userId;
                return (
                  <Link
                    key={thread.id}
                    href={`/messages?thread=${thread.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg flex-shrink-0 font-semibold text-green-700">
                      {other.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800">{other.name}</p>
                      {lastMsg && (
                        <p className="text-xs text-gray-500 truncate">{lastMsg.content}</p>
                      )}
                    </div>
                    {isUnread && <div className="w-2 h-2 bg-green-600 rounded-full flex-shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Herramientas compartidas */}
        {toolListings.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Mis herramientas compartidas</h2>
              <Link href="/tools" className="text-sm text-green-700 hover:underline">
                Ver todas →
              </Link>
            </div>
            <div className="space-y-3">
              {toolListings.map((tool) => (
                <div key={tool.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <span className="text-2xl">🔨</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-800">{tool.title}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge[tool.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {tool.status === "active" ? "Disponible" : "No disponible"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {myListings.length === 0 && recentThreads.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-4xl mb-3">🌱</p>
            <p className="text-gray-700 font-semibold">¡Tu perfil está listo!</p>
            <p className="text-gray-400 text-sm mt-1">
              Publica tu primer servicio o herramienta para empezar.
            </p>
            <Link
              href="/listings/new"
              className="inline-flex items-center mt-5 bg-green-700 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-green-800 transition-colors min-h-[44px]"
            >
              + Crear mi primera publicación
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
