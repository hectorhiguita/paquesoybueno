"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface Vereda { id: string; name: string }

interface Props {
  userId: string;
  currentName: string;
  currentPhone: string;
  currentVeredaId: string | null;
  currentAvatarUrl: string | null;
  veredas: Vereda[];
  onClose: () => void;
  onSaved: (name: string, veredaId: string | null, avatarUrl: string | null) => void;
}

type PhoneStep = "idle" | "code_sent" | "verified";

export function EditProfilePanel({
  currentName,
  currentPhone,
  currentVeredaId,
  currentAvatarUrl,
  veredas,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] = useState(currentName);
  const [veredaId, setVeredaId] = useState(currentVeredaId ?? "");
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [avatarPreview, setAvatarPreview] = useState(currentAvatarUrl);

  const [newPhone, setNewPhone] = useState(currentPhone);
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("idle");
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const veredaOptions = [
    { value: "", label: "Sin especificar" },
    ...veredas.map((v) => ({ value: v.id, label: v.name })),
  ];

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);

    const form = new FormData();
    form.append("avatar", file);
    try {
      const res = await fetch("/api/v1/users/me/avatar", { method: "POST", body: form });
      const json = (await res.json()) as { data?: { avatarUrl: string }; error?: { message?: string } };
      if (!res.ok) {
        setSaveError(json.error?.message ?? "Error subiendo imagen");
        setAvatarPreview(currentAvatarUrl);
        return;
      }
      setAvatarUrl(json.data?.avatarUrl ?? null);
    } catch {
      setSaveError("Error de conexión al subir imagen");
      setAvatarPreview(currentAvatarUrl);
    }
  };

  const handleSendPhoneCode = async () => {
    setPhoneError("");
    setPhoneSending(true);
    try {
      const res = await fetch("/api/v1/users/me/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) { setPhoneError(json.error?.message ?? "Error enviando código"); return; }
      setPhoneStep("code_sent");
    } catch {
      setPhoneError("Error de conexión");
    } finally {
      setPhoneSending(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    setPhoneError("");
    setPhoneSending(true);
    try {
      const res = await fetch("/api/v1/users/me/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone, code: phoneCode }),
      });
      const json = (await res.json()) as { error?: { code?: string; message?: string } };
      if (!res.ok) {
        setPhoneError(json.error?.message ?? "Código incorrecto");
        return;
      }
      setPhoneStep("verified");
    } catch {
      setPhoneError("Error de conexión");
    } finally {
      setPhoneSending(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          veredaId: veredaId || null,
        }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) { setSaveError(json.error?.message ?? "Error al guardar"); return; }
      onSaved(name, veredaId || null, avatarUrl);
    } catch {
      setSaveError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">✏️ Editar perfil</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none"
        >
          ×
        </button>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-green-100 flex items-center justify-center flex-shrink-0">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-green-700">{currentName[0]?.toUpperCase()}</span>
          )}
        </div>
        <div>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-sm text-green-700 font-semibold hover:underline"
          >
            Cambiar foto de perfil
          </button>
          <p className="text-xs text-gray-400 mt-0.5">JPEG o PNG, máx. 5 MB</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
      </div>

      {/* Nombre */}
      <Input
        label="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tu nombre completo"
      />

      {/* Vereda */}
      <Select
        label="Tu vereda"
        options={veredaOptions}
        value={veredaId}
        onChange={(e) => setVeredaId(e.target.value)}
      />

      {/* Cambio de teléfono */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700">📱 Cambiar número de teléfono</p>
        {phoneStep === "verified" ? (
          <p className="text-sm text-green-700 font-medium">✓ Teléfono actualizado a {newPhone}</p>
        ) : (
          <>
            <Input
              label="Nuevo número (10 dígitos)"
              type="tel"
              value={newPhone}
              onChange={(e) => { setNewPhone(e.target.value); setPhoneStep("idle"); setPhoneCode(""); }}
              placeholder="Ej: 3001234567"
            />
            {phoneStep === "code_sent" && (
              <Input
                label="Código de verificación"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ""))}
                placeholder="6 dígitos"
              />
            )}
            {phoneError && (
              <p className="text-xs text-red-600">{phoneError}</p>
            )}
            {phoneStep === "idle" && newPhone !== currentPhone && newPhone.length === 10 && (
              <button
                onClick={handleSendPhoneCode}
                disabled={phoneSending}
                className="text-sm bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40 min-h-[44px]"
              >
                {phoneSending ? "Enviando..." : "Enviar código SMS"}
              </button>
            )}
            {phoneStep === "code_sent" && phoneCode.length === 6 && (
              <button
                onClick={handleVerifyPhoneCode}
                disabled={phoneSending}
                className="text-sm bg-green-700 text-white font-semibold px-4 py-2 rounded-lg hover:bg-green-800 transition-colors disabled:opacity-40 min-h-[44px]"
              >
                {phoneSending ? "Verificando..." : "Verificar código"}
              </button>
            )}
          </>
        )}
      </div>

      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {saveError}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={onClose}
          className="flex-1 border border-gray-300 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors min-h-[44px]"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex-1 bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40 min-h-[44px]"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
