"use client";

import { useState } from "react";
import { EditProfilePanel } from "./EditProfilePanel";

interface Vereda { id: string; name: string }

interface Props {
  userId: string;
  initialName: string;
  initialPhone: string;
  initialVeredaId: string | null;
  initialAvatarUrl: string | null;
  initialVeredaName: string | null;
  isVerifiedProvider: boolean;
  isAdmin: boolean;
  veredas: Vereda[];
}

export function DashboardProfileSection({
  userId,
  initialName,
  initialPhone,
  initialVeredaId,
  initialAvatarUrl,
  initialVeredaName,
  isVerifiedProvider,
  isAdmin,
  veredas,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [veredaId, setVeredaId] = useState(initialVeredaId);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [promotingAdmin, setPromotingAdmin] = useState(false);

  const currentVeredaName =
    veredaId
      ? (veredas.find((v) => v.id === veredaId)?.name ?? initialVeredaName)
      : initialVeredaName;

  const handleSaved = (newName: string, newVeredaId: string | null, newAvatarUrl: string | null) => {
    setName(newName);
    setVeredaId(newVeredaId);
    setAvatarUrl(newAvatarUrl);
    setEditing(false);
  };

  const handlePromoteAdmin = async () => {
    setPromotingAdmin(true);
    try {
      const res = await fetch("/api/v1/admin/auth/promote", { method: "POST" });
      if (res.ok) {
        window.location.href = "/admin";
      } else {
        alert("No se pudo acceder al panel admin.");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setPromotingAdmin(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header de perfil */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-green-100 flex items-center justify-center flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-green-700">{name[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800">
              {name}
              {isVerifiedProvider && (
                <span className="ml-2 text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full align-middle">
                  ✓ Verificado
                </span>
              )}
            </p>
            {currentVeredaName && (
              <p className="text-sm text-gray-500 mt-0.5">📍 {currentVeredaName}</p>
            )}
          </div>
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-sm text-green-700 font-semibold hover:underline flex-shrink-0"
          >
            {editing ? "Cancelar" : "Editar perfil"}
          </button>
        </div>

        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={handlePromoteAdmin}
              disabled={promotingAdmin}
              className="w-full sm:w-auto bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 min-h-[44px]"
            >
              {promotingAdmin ? "Accediendo..." : "⚙️ Ir al panel de administración"}
            </button>
          </div>
        )}
      </div>

      {editing && (
        <EditProfilePanel
          userId={userId}
          currentName={name}
          currentPhone={initialPhone}
          currentVeredaId={veredaId}
          currentAvatarUrl={avatarUrl}
          veredas={veredas}
          onClose={() => setEditing(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
