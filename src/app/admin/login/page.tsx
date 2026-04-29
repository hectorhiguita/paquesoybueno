"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/v1/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (res.ok) {
      router.push("/admin");
    } else {
      const data = await res.json();
      setError(data.error?.message ?? "Credenciales incorrectas");
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">⚙️</span>
          <h1 className="text-2xl font-bold text-white mt-2">Panel de Administración</h1>
          <p className="text-gray-400 text-sm mt-1">Santa Elena Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-2xl border border-gray-700 p-8 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1">Usuario</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="admin"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-1">Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg p-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !form.username || !form.password}
            className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-500 transition-colors min-h-[44px] disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Ingresar"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          Acceso restringido — solo administradores autorizados
        </p>
      </div>
    </main>
  );
}
