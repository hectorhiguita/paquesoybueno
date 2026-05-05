"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";

type Step = "form" | "done";
type Status = "idle" | "loading" | "error";

interface Vereda { id: string; name: string }

export function CompleteProfileForm({ veredas }: { veredas: Vereda[] }) {
  const { data: session, status: sessionStatus, update } = useSession();
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [veredaId, setVeredaId] = useState("");

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (sessionStatus === "authenticated") {
      // Only redirect if the session explicitly says verification is NOT required.
      // Avoid redirecting when requiresPhoneVerification is undefined (session still loading).
      if (session?.requiresPhoneVerification === false) {
        window.location.href = "/dashboard";
        return;
      }
      const googleName = (session as unknown as Record<string, unknown>).googleName as string | undefined;
      if (googleName && !name) setName(googleName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, sessionStatus]);

  const handleSubmit = async () => {
    setError("");
    setStatus("loading");

    const googleEmail = (session as unknown as Record<string, unknown>)?.googleEmail as string | undefined;
    const email = googleEmail ?? session?.user?.email ?? "";

    try {
      const res = await fetch("/api/v1/auth/register/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          communityId: SANTA_ELENA_COMMUNITY_ID,
          veredaId: veredaId || undefined,
        }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setError(json.error?.message ?? "Error creando cuenta");
        setStatus("error");
        return;
      }

      await update();
      setStep("done");
      // Hard redirect ensures the server reads the fresh JWT cookie with phoneVerified=true.
      // router.push() (SPA navigation) can arrive before the updated cookie propagates.
      setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
    } catch {
      setError("Error de conexión");
      setStatus("error");
    }
  };

  if (sessionStatus === "loading") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando...</p>
      </main>
    );
  }

  if (step === "done") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800">¡Cuenta creada!</h2>
          <p className="text-gray-500 text-sm mt-2">Redirigiendo a tu panel...</p>
        </div>
      </main>
    );
  }

  const veredaOptions = [
    { value: "", label: "Selecciona tu vereda (opcional)" },
    ...veredas.map((v) => ({ value: v.id, label: v.name })),
  ];

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">🌿</span>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">Completa tu perfil</h1>
          <p className="text-gray-500 text-sm mt-1">
            Solo necesitamos un par de datos para activar tu cuenta.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <Input
            label="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: María López"
          />
          <Input
            label="Número de celular (10 dígitos)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="Ej: 3001234567"
          />
          <Select
            label="Tu vereda"
            options={veredaOptions}
            value={veredaId}
            onChange={(e) => setVeredaId(e.target.value)}
          />
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={status === "loading" || name.length < 2 || phone.length !== 10}
            className="w-full bg-green-700 text-white font-semibold text-sm py-3 rounded-xl hover:bg-green-800 transition-colors disabled:opacity-40 min-h-[44px]"
          >
            {status === "loading" ? "Creando cuenta..." : "✓ Activar cuenta"}
          </button>
        </div>
      </div>
    </main>
  );
}
