"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type State = "loading" | "valid" | "invalid" | "submitting" | "success" | "error";

function ActivateForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequired, setOtpRequired] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    fetch(`/api/v1/auth/activate?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) { setEmail(data.email); setState("valid"); }
        else setState("invalid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const handleSubmit = async () => {
    if (password.length < 8) { setErrorMsg("Mínimo 8 caracteres"); return; }
    if (password !== confirm) { setErrorMsg("Las contraseñas no coinciden"); return; }
    setErrorMsg("");
    setState("submitting");

    const res = await fetch("/api/v1/auth/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, confirmPassword: confirm }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.data?.requiresOtp) {
        setMaskedPhone(data.data.maskedPhone ?? "");
        setOtpRequired(true);
        setState("valid");
      } else {
        setState("success");
        setTimeout(() => router.push("/login"), 2500);
      }
    } else {
      const data = await res.json();
      setErrorMsg(data.error?.message ?? "Error al activar la cuenta");
      setState("valid");
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setErrorMsg("Ingresa el código OTP de 6 dígitos");
      return;
    }

    setErrorMsg("");
    setState("submitting");

    const res = await fetch("/api/v1/auth/activate/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, code: otp }),
    });

    if (res.ok) {
      setState("success");
      setTimeout(() => router.push("/login"), 2500);
    } else {
      const data = await res.json();
      setErrorMsg(data.error?.message ?? "Código OTP inválido");
      setState("valid");
    }
  };

  if (state === "loading") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-500">Verificando enlace...</p>
        </div>
      </main>
    );
  }

  if (state === "invalid") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-gray-800">Enlace inválido</h2>
          <p className="text-gray-500 text-sm mt-2">
            Este enlace de activación ya fue utilizado o ha expirado.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center mt-6 bg-green-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-800 transition-colors min-h-[44px]"
          >
            Registrarme de nuevo
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
          <h2 className="text-xl font-bold text-gray-800">¡Cuenta activada!</h2>
          <p className="text-gray-500 text-sm mt-2">
            Tu contraseña fue creada. Redirigiendo al inicio de sesión...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">🌿</span>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">
            {otpRequired ? "Verifica tu celular" : "Crea tu contraseña"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{email}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          {!otpRequired ? (
            <>
              <Input
                label="Contraseña"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Input
                label="Confirmar contraseña"
                type="password"
                placeholder="Repite tu contraseña"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                error={confirm.length > 0 && password !== confirm ? "No coinciden" : undefined}
              />
            </>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                Te enviamos un código OTP por SMS al número terminado en <strong>{maskedPhone}</strong>.
              </div>
              <Input
                label="Código OTP"
                type="text"
                placeholder="6 dígitos"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </>
          )}

          {errorMsg && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {errorMsg}
            </p>
          )}

          <Button
            className="w-full"
            disabled={
              state === "submitting" ||
              (!otpRequired && (password.length < 8 || password !== confirm)) ||
              (otpRequired && otp.length !== 6)
            }
            onClick={otpRequired ? handleVerifyOtp : handleSubmit}
          >
            {state === "submitting"
              ? otpRequired
                ? "Verificando..."
                : "Enviando OTP..."
              : otpRequired
                ? "Verificar código"
                : "Continuar"}
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function ActivatePage() {
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
      <ActivateForm />
    </Suspense>
  );
}
