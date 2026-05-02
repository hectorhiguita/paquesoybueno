"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";
import type { SelectOption } from "@/types/api";

const STEPS = ["Datos personales", "Tu vereda", "Confirmar"] as const;

type Status = "idle" | "submitting" | "success" | "error";

export function RegisterForm({ veredas }: { veredas: SelectOption[] }) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    veredaId: "",
  });

  const set =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const canNext = [
    form.name.length > 2 && form.phone.length >= 10 && form.email.includes("@"),
    form.veredaId !== "",
    true,
  ];

  const handleSubmit = async () => {
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          communityId: SANTA_ELENA_COMMUNITY_ID,
          veredaId: form.veredaId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
      } else {
        setErrorMsg(data.error?.message ?? "Error al crear la cuenta");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Error de conexión. Intenta de nuevo.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-gray-800">¡Revisa tu correo!</h2>
          <p className="text-gray-500 text-sm mt-3 leading-relaxed">
            Te enviamos un enlace a <strong>{form.email}</strong> para activar tu cuenta y crear tu contraseña.
          </p>
          <p className="text-gray-500 text-xs mt-3">El enlace expira en 24 horas.</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center mt-6 border border-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </main>
    );
  }

  const veredaLabel = veredas.find((v) => v.value === form.veredaId)?.label ?? "—";

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">🌿</span>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">Únete a Santa Elena</h1>
          <p className="text-gray-500 text-sm mt-1">Crea tu cuenta gratis en minutos</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center mb-8">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    i < step ? "bg-green-700 text-white" : i === step ? "bg-green-700 text-white ring-4 ring-green-100" : "bg-gray-100 text-gray-400"
                  }`}>
                    {i < step ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${i === step ? "text-green-700" : "text-gray-500"}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-4 ${i < step ? "bg-green-700" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-gray-800">¿Cómo te llamas?</h2>
              <Input label="Nombre completo" type="text" placeholder="Ej: María López" value={form.name} onChange={set("name")} />
              <Input label="Número de celular" type="tel" placeholder="Ej: 3001234567" value={form.phone} onChange={set("phone")} />
              <Input label="Correo electrónico" type="email" placeholder="Ej: maria@correo.com" value={form.email} onChange={set("email")} />
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-gray-800">¿En qué vereda vives?</h2>
              <p className="text-sm text-gray-500">Esto nos ayuda a mostrarte servicios cerca de ti.</p>
              <Select label="Tu vereda" options={[{ value: "", label: "Selecciona tu vereda…" }, ...veredas]} value={form.veredaId} onChange={set("veredaId")} />
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-gray-800">Confirmar registro</h2>
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 text-sm shadow-sm">
                <div className="grid grid-cols-[96px_1fr] gap-3 items-start">
                  <span className="font-semibold text-gray-700">Nombre</span>
                  <span className="font-medium text-gray-900 break-words">{form.name}</span>
                </div>
                <div className="grid grid-cols-[96px_1fr] gap-3 items-start">
                  <span className="font-semibold text-gray-700">Celular</span>
                  <span className="font-medium text-gray-900 break-words">{form.phone}</span>
                </div>
                <div className="grid grid-cols-[96px_1fr] gap-3 items-start">
                  <span className="font-semibold text-gray-700">Correo</span>
                  <span className="font-medium text-gray-900 break-words">{form.email}</span>
                </div>
                <div className="grid grid-cols-[96px_1fr] gap-3 items-start">
                  <span className="font-semibold text-gray-700">Vereda</span>
                  <span className="font-medium text-gray-900 break-words leading-relaxed">{veredaLabel}</span>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900 leading-relaxed">
                📧 Te enviaremos un enlace a <strong>{form.email}</strong> para crear tu contraseña.
              </div>
              {status === "error" && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 leading-relaxed">{errorMsg}</p>
              )}
            </div>
          )}

          <div className="flex justify-between mt-8 gap-3">
            {step > 0 ? (
              <Button variant="secondary" onClick={() => setStep((s) => s - 1)} className="flex-1">← Atrás</Button>
            ) : <div className="flex-1" />}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext[step]} className="flex-1">Siguiente →</Button>
            ) : (
              <Button disabled={status === "submitting"} onClick={handleSubmit} className="flex-1">
                {status === "submitting" ? "Enviando..." : "✓ Crear cuenta"}
              </Button>
            )}
          </div>
        </div>

        {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" && (
          <div className="mt-4">
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs text-gray-400 bg-gray-50 px-2">
                o regístrate con
              </div>
            </div>
            <button
              onClick={() => signIn("google", { callbackUrl: "/complete-profile" })}
              className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-white transition-colors min-h-[44px] bg-gray-50"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.1C9.5 35.6 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.2 5.2C41.9 35.2 44 30 44 24c0-1.3-.1-2.6-.4-3.9z"/>
              </svg>
              Continuar con Google
            </button>
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-green-700 font-semibold hover:underline">Ingresar</Link>
        </p>
      </div>
    </main>
  );
}
