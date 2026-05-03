"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";

type State = "idle" | "submitting" | "sent" | "error";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), communityId: SANTA_ELENA_COMMUNITY_ID }),
      });

      if (res.ok) {
        setState("sent");
      } else {
        const data = await res.json();
        setErrorMsg(data.error?.message ?? "Error al enviar el correo. Intenta de nuevo.");
        setState("error");
      }
    } catch {
      setErrorMsg("No se pudo conectar. Verifica tu conexión e intenta de nuevo.");
      setState("error");
    }
  };

  if (state === "sent") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-xl font-bold text-gray-800">Revisa tu correo</h2>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            Si <strong>{email}</strong> está registrado, recibirás un enlace para
            restablecer tu contraseña. El enlace es válido por 30 minutos.
          </p>
          <p className="text-gray-400 text-xs mt-4">
            Si no llega, revisa la carpeta de spam.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center mt-6 text-green-700 font-semibold hover:underline text-sm"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🔑</span>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">Olvidé mi contraseña</h1>
          <p className="text-gray-500 text-sm mt-1">
            Ingresa tu correo y te enviamos un enlace para restablecerla.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {state === "error" && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {errorMsg}
              </p>
            )}

            <Button type="submit" className="w-full mt-2" disabled={state === "submitting" || !email}>
              {state === "submitting" ? "Enviando..." : "Enviar enlace"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/login" className="text-green-700 font-semibold hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
