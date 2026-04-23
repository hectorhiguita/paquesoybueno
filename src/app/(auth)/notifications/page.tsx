import { NOTIFICATIONS } from "@/lib/mock-data";

const typeIcon: Record<string, string> = {
  message: "✉️",
  rating: "⭐",
  reservation: "🔨",
  system: "🔔",
};

const typeBg: Record<string, string> = {
  message: "bg-blue-100",
  rating: "bg-yellow-100",
  reservation: "bg-green-100",
  system: "bg-gray-100",
};

export default function NotificationsPage() {
  const unread = NOTIFICATIONS.filter((n) => !n.read);
  const read = NOTIFICATIONS.filter((n) => n.read);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🔔 Notificaciones</h1>
            <p className="text-gray-500 text-sm mt-1">{unread.length} sin leer</p>
          </div>
          <button className="text-sm text-green-700 font-medium hover:underline">
            Marcar todas como leídas
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Sin leer */}
        {unread.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Sin leer</h2>
            <div className="space-y-2">
              {unread.map((n) => (
                <div
                  key={n.id}
                  className="bg-white border border-green-200 rounded-xl p-4 flex items-start gap-4 hover:shadow-sm transition-shadow"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${typeBg[n.type]}`}>
                    {typeIcon[n.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800">{n.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                  </div>
                  <div className="w-2.5 h-2.5 bg-green-600 rounded-full flex-shrink-0 mt-1" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leídas */}
        {read.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Anteriores</h2>
            <div className="space-y-2">
              {read.map((n) => (
                <div
                  key={n.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4 opacity-70"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${typeBg[n.type]}`}>
                    {typeIcon[n.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-700">{n.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
