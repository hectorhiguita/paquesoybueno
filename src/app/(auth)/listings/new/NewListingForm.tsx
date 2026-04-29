"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/types/api";

const LISTING_TYPES = [
  { value: "service", label: "🛠️ Servicio" },
  { value: "sale", label: "🛒 Venta" },
  { value: "trade", label: "🔄 Trueque" },
  { value: "tool", label: "🔨 Alquiler de herramienta" },
];

type FormState = {
  type: string;
  title: string;
  description: string;
  categoryId: string;
  veredaId: string;
  priceCop: string;
  pricePerHourCop: string;
  pricePerDayCop: string;
  tradeDescription: string;
};

export function NewListingForm({
  categories,
  veredas,
  initialType,
}: {
  categories: SelectOption[];
  veredas: SelectOption[];
  initialType: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [form, setForm] = useState<FormState>({
    type: initialType,
    title: "",
    description: "",
    categoryId: "",
    veredaId: "",
    priceCop: "",
    pricePerHourCop: "",
    pricePerDayCop: "",
    tradeDescription: "",
  });

  const set =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleTypeChange = (type: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("type", type);
    router.replace(`/listings/new?${next.toString()}`);
    setForm((f) => ({ ...f, type, pricePerHourCop: "", pricePerDayCop: "" }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Array.from(e.target.files ?? []).slice(0, 5);
    setImages(next);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    const payload = {
      title: form.title,
      description: form.description,
      type: form.type,
      categoryId: form.categoryId,
      veredaId: form.veredaId,
      ...(form.priceCop ? { priceCop: Number(form.priceCop) } : {}),
      ...(form.pricePerHourCop ? { pricePerHourCop: Number(form.pricePerHourCop) } : {}),
      ...(form.pricePerDayCop ? { pricePerDayCop: Number(form.pricePerDayCop) } : {}),
      ...(form.tradeDescription ? { tradeDescription: form.tradeDescription } : {}),
    };

    try {
      const res = await fetch("/api/v1/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "No fue posible crear la publicación.");
        return;
      }

      const listingId = data.data?.listing?.id as string | undefined;
      if (listingId && images.length > 0) {
        const imageFormData = new FormData();
        images.forEach((image) => imageFormData.append("images", image));

        const imageRes = await fetch(`/api/v1/listings/${listingId}/images`, {
          method: "POST",
          body: imageFormData,
        });

        if (!imageRes.ok) {
          const imageData = await imageRes.json().catch(() => null);
          setError(
            imageData?.error?.message ??
              "La publicación se creó, pero no fue posible subir las fotos."
          );
          return;
        }
      }

      setSubmitted(true);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center">
          <p className="text-5xl mb-4">✅</p>
          <h2 className="text-2xl font-bold text-gray-800">¡Publicado con éxito!</h2>
          <p className="text-gray-500 text-sm mt-2">Tu anuncio ya está visible para la comunidad.</p>
          <div className="flex gap-3 mt-6">
            <Link href="/dashboard" className="flex-1 border border-gray-300 text-gray-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors min-h-[44px] flex items-center justify-center">
              Mi panel
            </Link>
            <button
              onClick={() => {
                setSubmitted(false);
                setForm({
                  type: initialType,
                  title: "",
                  description: "",
                  categoryId: "",
                  veredaId: "",
                  priceCop: "",
                  pricePerHourCop: "",
                  pricePerDayCop: "",
                  tradeDescription: "",
                });
                setImages([]);
              }}
              className="flex-1 bg-green-700 text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-green-800 transition-colors min-h-[44px]"
            >
              Publicar otro
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-green-700 hover:underline">← Mi panel</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500">Nuevo anuncio</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Publicar anuncio</h1>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">¿Qué quieres publicar?</p>
            <div className="grid grid-cols-2 gap-2">
              {LISTING_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleTypeChange(value)}
                  className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all min-h-[44px] ${
                    form.type === value
                      ? "bg-green-700 text-white border-green-700"
                      : "bg-white text-gray-700 border-gray-200 hover:border-green-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Input label="Título del anuncio" placeholder="Ej: Servicio de poda de árboles" value={form.title} onChange={set("title")} />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Descripción</label>
            <textarea
              rows={4}
              placeholder="Describe tu servicio, artículo o herramienta con detalle..."
              value={form.description}
              onChange={set("description")}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-700 resize-none"
            />
          </div>

          <Select label="Categoría" options={[{ value: "", label: "Selecciona una categoría…" }, ...categories]} value={form.categoryId} onChange={set("categoryId")} />
          <Select label="Vereda" options={[{ value: "", label: "Selecciona tu vereda…" }, ...veredas]} value={form.veredaId} onChange={set("veredaId")} />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Fotos de la publicación</label>
            <input
              type="file"
              accept="image/png,image/jpeg"
              multiple
              onChange={handleImageChange}
              className="block w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 file:mr-3 file:border-0 file:bg-green-50 file:text-green-700 file:font-medium file:px-3 file:py-2 file:rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Hasta 5 fotos JPG o PNG de máximo 5 MB cada una.</p>
            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((image, index) => (
                  <div key={`${image.name}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-2">
                    <p className="text-xs font-medium text-gray-700 truncate">{image.name}</p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      {(image.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {form.type === "sale" && (
            <Input label="Precio (COP)" type="number" placeholder="Ej: 150000" value={form.priceCop} onChange={set("priceCop")} />
          )}

          {form.type === "trade" && (
            <Input label="¿Qué buscas a cambio?" placeholder="Ej: Herramientas de jardín, semillas..." value={form.tradeDescription} onChange={set("tradeDescription")} />
          )}

          {form.type === "tool" && (
            <div className="space-y-4">
              <Input label="Condición de la herramienta" placeholder="Ej: Bueno, Regular, Necesita reparación" value={form.tradeDescription} onChange={set("tradeDescription")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Precio por hora (COP)"
                  type="number"
                  placeholder="Ej: 12000"
                  value={form.pricePerHourCop}
                  onChange={set("pricePerHourCop")}
                />
                <Input
                  label="Precio por día (COP)"
                  type="number"
                  placeholder="Ej: 60000"
                  value={form.pricePerDayCop}
                  onChange={set("pricePerDayCop")}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Publicando..." : "Publicar anuncio"}
          </Button>
        </div>
      </div>
    </main>
  );
}
