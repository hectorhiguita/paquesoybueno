"use client";

import { useEffect, useState } from "react";

interface CategoryRow {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  active: boolean;
  listingsCount: number;
}

interface CategoriesResponse {
  data?: { categories?: CategoryRow[] };
  error?: { message?: string };
}

export function AdminCategoriesPanel() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    icon: "",
    description: "",
  });

  const loadCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/admin/categories", { cache: "no-store" });
      const json = (await res.json()) as CategoriesResponse;
      if (!res.ok) {
        setError(json.error?.message ?? "No fue posible cargar las categorías.");
        return;
      }
      setCategories(json.data?.categories ?? []);
    } catch {
      setError("Error de conexión cargando categorías.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/v1/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          icon: form.icon.trim() || undefined,
          description: form.description.trim() || undefined,
        }),
      });

      const json = (await res.json()) as CategoriesResponse;
      if (!res.ok) {
        setError(json.error?.message ?? "No fue posible crear la categoría.");
        return;
      }

      setForm({ name: "", icon: "", description: "" });
      await loadCategories();
    } catch {
      setError("Error de conexión creando la categoría.");
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = async (category: CategoryRow) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/admin/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !category.active }),
      });
      const json = (await res.json()) as CategoriesResponse;
      if (!res.ok) {
        setError(json.error?.message ?? "No fue posible actualizar la categoría.");
        return;
      }
      await loadCategories();
    } catch {
      setError("Error de conexión actualizando la categoría.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">📂 Categorías</h2>
      </div>

      <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Nombre"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px]"
        />
        <input
          value={form.icon}
          onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
          placeholder="Icono (opcional)"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px]"
        />
        <button
          type="submit"
          disabled={saving || !form.name.trim()}
          className="text-sm bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-800 transition-colors min-h-[44px] disabled:opacity-50"
        >
          {saving ? "Guardando..." : "+ Nueva categoría"}
        </button>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Descripción opcional"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[88px] sm:col-span-3"
        />
      </form>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Cargando categorías...</p>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 gap-3">
              <div>
                <p className="font-semibold text-sm text-gray-800">
                  {cat.icon ? `${cat.icon} ` : ""}
                  {cat.name}
                </p>
                <p className="text-xs text-gray-500">
                  {cat.listingsCount} anuncios
                  {cat.description ? ` · ${cat.description}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    cat.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {cat.active ? "Activa" : "Inactiva"}
                </span>
                <button
                  onClick={() => void toggleCategory(cat)}
                  disabled={saving}
                  className="text-xs text-gray-500 hover:text-gray-700 min-h-[44px] px-2 disabled:opacity-50"
                >
                  {cat.active ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
