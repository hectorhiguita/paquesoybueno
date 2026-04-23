"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const CATEGORIES = [
  { value: "", label: "Selecciona una categoría…" },
  { value: "jardineria", label: "🌿 Jardinería" },
  { value: "electricidad", label: "⚡ Electricidad" },
  { value: "plomeria", label: "🔧 Plomería" },
  { value: "construccion", label: "🏠 Construcción" },
  { value: "tecnologia", label: "📱 Tecnología" },
  { value: "transporte", label: "🚗 Transporte" },
  { value: "cocina", label: "🍳 Cocina" },
  { value: "electrodomesticos", label: "🔌 Electrodomésticos" },
  { value: "agricultura", label: "🌾 Agricultura" },
  { value: "cuidado", label: "👶 Cuidado de personas" },
  { value: "educacion", label: "📚 Educación" },
  { value: "belleza", label: "💇 Belleza y salud" },
];

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

const LISTING_TYPES = [
  { value: "service", label: "🛠️ Servicio" },
  { value: "sale", label: "🛒 Venta" },
  { value: "trade", label: "🔄 Trueque" },
  { value: "tool", label: "🔨 Herramienta para préstamo" },
];

export default function NewListingPage() {
  const [type, setType] = useState("service");
  const [submitted, setSubmitted] = useState(false);

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
              onClick={() => setSubmitted(false)}
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
          {/* Tipo */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">¿Qué quieres publicar?</p>
            <div className="grid grid-cols-2 gap-2">
              {LISTING_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all min-h-[44px] ${
                    type === value
                      ? "bg-green-700 text-white border-green-700"
                      : "bg-white text-gray-700 border-gray-200 hover:border-green-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Input label="Título del anuncio" placeholder="Ej: Servicio de poda de árboles" />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Descripción</label>
            <textarea
              rows={4}
              placeholder="Describe tu servicio, artículo o herramienta con detalle..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 resize-none"
            />
          </div>

          <Select label="Categoría" options={CATEGORIES} />
          <Select label="Vereda" options={VEREDAS} />

          {(type === "sale") && (
            <Input label="Precio (COP)" type="number" placeholder="Ej: 150000" />
          )}

          {type === "trade" && (
            <Input label="¿Qué buscas a cambio?" placeholder="Ej: Herramientas de jardín, semillas..." />
          )}

          {type === "tool" && (
            <Select
              label="Condición de la herramienta"
              options={[
                { value: "", label: "Selecciona la condición…" },
                { value: "Bueno", label: "Bueno" },
                { value: "Regular", label: "Regular" },
                { value: "Necesita reparación", label: "Necesita reparación" },
              ]}
            />
          )}

          <Button className="w-full" onClick={() => setSubmitted(true)}>
            Publicar anuncio
          </Button>
        </div>
      </div>
    </main>
  );
}
