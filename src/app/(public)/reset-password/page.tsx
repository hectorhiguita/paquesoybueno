"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type State = "idle" | "submitting" | "success" | "error";

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (!token) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-gray-800">Enlace inválido</h2>
          <p className="text-gray-500 text-sm mt-2">
            Este enlace no contiene un token de restablecimiento válido.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center mt-6 bg-green-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-800 transition-colors min-h-[44px]"
          >
            Solicitar nuevo enlace
          </Link>
        </div>
      </main>
    );
  }

  if (state === "success") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800">Contraseña actualizada</h2>
          <p className="text-gray-500 text-sm mt-2">
            Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="inline-flex items-center justify-center mt-6 bg-green-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-800 transition-colors min-h-[44px]"
          >
            Iniciar sesión
          </button>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setErrorMsg("Mínimo 8 caracteres"); return; }
    if (password !== confirm) { setErrorMsg("Las contraseñas no coinciden"); return; }
    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        setState("success");
      } else {
        const data = await res.json();
        const msg = data.error?.message ?? "Error al restablecer la contraseña.";
        setErrorMsg(
          data.error?.code === "INVALID_TOKEN"
            ? "Este enlace ya fue utilizado o ha expirado. Solicita uno nuevo."
            : msg
        );
        setState("error");
      }
    } catch {
      setErrorMsg("No se pudo conectar. Verifica tu conexión e intenta de nuevo.");
      setState("error");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🔐</span>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">Nueva contraseña</h1>
          <p className="text-gray-500 text-sm mt-1">Elige una contraseña segura.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nueva contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              placeholder="Repite tu contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={confirm.length > 0 && password !== confirm ? "No coinciden" : undefined}
              required
            />

            {(state === "error") && errorMsg && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {errorMsg}
                {state === "error" && (
                  <>
                    {" "}
                    <Link href="/forgot-password" className="underline font-medium">
                      Solicitar nuevo enlace
                    </Link>
                  </>
                )}
              </p>
            )}

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={state === "submitting" || password.length < 8 || password !== confirm}
            >
              {state === "submitting" ? "Guardando..." : "Guardar contraseña"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-500">Cargando...</p>
          </div>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
