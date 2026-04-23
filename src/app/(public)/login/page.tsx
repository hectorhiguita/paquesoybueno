"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🌿</span>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">Bienvenido de nuevo</h1>
          <p className="text-gray-500 text-sm mt-1">Ingresa a tu cuenta de Santa Elena</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex flex-col gap-4">
            <Input label="Correo electrónico" type="email" placeholder="correo@ejemplo.com" />
            <Input label="Contraseña" type="password" placeholder="Tu contraseña" />
            <div className="text-right">
              <Link href="/forgot-password" className="text-sm text-green-700 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Button className="w-full mt-2">Ingresar</Button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs text-gray-400 bg-white px-2">
              o continúa con
            </div>
          </div>

          {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" && (
            <button className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]">
              <span className="text-lg">G</span>
              Ingresar con Google
            </button>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="text-green-700 font-semibold hover:underline">
            Regístrate gratis
          </Link>
        </p>
      </div>
    </main>
  );
}
