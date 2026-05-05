"use client";

import { useRef, useState } from "react";
import { EditProfilePanel } from "./EditProfilePanel";
import { isSafeImageUrl } from "@/lib/utils/image";

interface Vereda { id: string; name: string }

interface Props {
  userId: string;
  initialName: string;
  initialPhone: string | null;
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [promotingAdmin, setPromotingAdmin] = useState(false);
  const [promoteError, setPromoteError] = useState("");
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError("");
    setAvatarUploading(true);
    const form = new FormData();
    form.append("avatar", file);
    try {
      const res = await fetch("/api/v1/users/me/avatar", { method: "POST", body: form });
      const json = (await res.json()) as { data?: { avatarUrl: string }; error?: { message?: string } };
      if (!res.ok) { setAvatarError(json.error?.message ?? "Error subiendo imagen"); return; }
      setAvatarUrl(json.data?.avatarUrl ?? null);
    } catch {
      setAvatarError("Error de conexión al subir imagen");
    } finally {
      setAvatarUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  };

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
    setPromoteError("");
    try {
      const res = await fetch("/api/v1/admin/auth/promote", { method: "POST" });
      if (res.ok) {
        window.location.href = "/admin";
        return;
      }
      if (res.status === 401) {
        setPromoteError("Sesión expirada. Recarga la página e intenta de nuevo.");
      } else if (res.status === 403) {
        setPromoteError("Tu cuenta aún no tiene permisos de administrador en la base de datos.");
      } else {
        setPromoteError("No se pudo acceder al panel admin. Intenta de nuevo.");
      }
    } catch {
      setPromoteError("Error de conexión. Verifica tu red e intenta de nuevo.");
    } finally {
      setPromotingAdmin(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header de perfil */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => avatarFileRef.current?.click()}
            disabled={avatarUploading}
            className="relative w-14 h-14 rounded-full overflow-hidden bg-green-100 flex items-center justify-center flex-shrink-0 group focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            title="Cambiar foto de perfil"
          >
            {isSafeImageUrl(avatarUrl) ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-green-700">{name[0]?.toUpperCase()}</span>
            )}
            <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              {avatarUploading ? (
                <span className="text-white text-xs">...</span>
              ) : (
                <span className="text-white text-lg">📷</span>
              )}
            </span>
          </button>
          <input
            ref={avatarFileRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleAvatarUpload}
          />
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

        {avatarError && (
          <p className="text-xs text-red-600 mt-2">{avatarError}</p>
        )}

        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <button
              onClick={handlePromoteAdmin}
              disabled={promotingAdmin}
              className="w-full sm:w-auto bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 min-h-[44px]"
            >
              {promotingAdmin ? "Accediendo..." : "⚙️ Ir al panel de administración"}
            </button>
            {promoteError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {promoteError}
              </p>
            )}
          </div>
        )}
      </div>

      {editing && (
        <EditProfilePanel
          userId={userId}
          currentName={name}
          currentPhone={initialPhone ?? ""}
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
