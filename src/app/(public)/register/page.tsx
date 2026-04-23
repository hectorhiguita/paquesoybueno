"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const STEPS = ["Datos personales", "Tu vereda", "Contraseña"] as const;

const VEREDAS = [
  { value: "", label: "Selecciona tu vereda…" },
  { value: "barro-blanco", label: "Barro Blanco" },
  { value: "el-placer", label: "El Placer" },
  { value: "el-llano", label: "El Llano" },
  { value: "piedras-blancas", label: "Piedras Blancas" },
  { value: "media-luna", label: "Media Luna" },
  { value: "el-cerro", label: "El Cerro" },
  { value: "santa-elena-centro", label: "Santa Elena Centro" },
  { value: "pantanillo", label: "Pantanillo" },
];

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    vereda: "",
    password: "",
    confirmPassword: "",
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const canNext = [
    form.name.length > 2 && form.phone.length >= 10 && form.email.includes("@"),
    form.vereda !== "",
    form.password.length >= 8 && form.password === form.confirmPassword,
  ];

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-4xl">🌿</span>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">Únete a Santa Elena</h1>
          <p className="text-gray-500 text-sm mt-1">Crea tu cuenta gratis en minutos</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Stepper */}
          <div className="flex items-center mb-8">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      i < step
                        ? "bg-green-700 text-white"
                        : i === step
                        ? "bg-green-700 text-white ring-4 ring-green-100"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {i < step ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${i === step ? "text-green-700" : "text-gray-400"}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-4 ${i < step ? "bg-green-700" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 0 */}
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-gray-800">¿Cómo te llamas?</h2>
              <Input
                label="Nombre completo"
                type="text"
                placeholder="Ej: María López"
                value={form.name}
                onChange={set("name")}
              />
              <Input
                label="Número de celular"
                type="tel"
                placeholder="Ej: 3001234567"
                value={form.phone}
                onChange={set("phone")}
              />
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="Ej: maria@correo.com"
                value={form.email}
                onChange={set("email")}
              />
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-gray-800">¿En qué vereda vives?</h2>
              <p className="text-sm text-gray-500">
                Esto nos ayuda a mostrarte servicios y vecinos cerca de ti.
              </p>
              <Select
                label="Tu vereda"
                options={VEREDAS}
                value={form.vereda}
                onChange={set("vereda")}
              />
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                📍 También puedes activar el GPS para que detectemos tu vereda automáticamente.
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-gray-800">Crea tu contraseña</h2>
              <Input
                label="Contraseña"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={set("password")}
              />
              <Input
                label="Confirmar contraseña"
                type="password"
                placeholder="Repite tu contraseña"
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                error={
                  form.confirmPassword.length > 0 && form.password !== form.confirmPassword
                    ? "Las contraseñas no coinciden"
                    : undefined
                }
              />
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500">
                Al registrarte aceptas los términos de uso de la plataforma Santa Elena.
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 gap-3">
            {step > 0 ? (
              <Button variant="secondary" onClick={() => setStep((s) => s - 1)} className="flex-1">
                ← Atrás
              </Button>
            ) : (
              <div className="flex-1" />
            )}
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext[step]}
                className="flex-1"
              >
                Siguiente →
              </Button>
            ) : (
              <Button disabled={!canNext[step]} className="flex-1">
                ✓ Crear cuenta
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-green-700 font-semibold hover:underline">
            Ingresar
          </Link>
        </p>
      </div>
    </main>
  );
}
