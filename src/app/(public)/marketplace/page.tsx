import Link from "next/link";
import { MARKET_ITEMS } from "@/lib/mock-data";

const MARKETPLACE_TYPES = [
  {
    slug: "sale",
    icon: "🛒",
    label: "Compra y Venta",
    description: "Artículos de segunda mano, ropa, muebles, electrodomésticos y más",
    color: "bg-blue-700",
    lightColor: "bg-blue-50 border-blue-200",
    activeColor: "bg-blue-700 text-white border-blue-700",
  },
  {
    slug: "trade",
    icon: "🔄",
    label: "Trueque",
    description: "Intercambia lo que tienes por lo que necesitas, sin dinero de por medio",
    color: "bg-amber-600",
    lightColor: "bg-amber-50 border-amber-200",
    activeColor: "bg-amber-600 text-white border-amber-600",
  },
];

// Mock listings
const MOCK_ITEMS = {
  sale: [
    { title: "Nevera Samsung 300L", price: "450.000", vereda: "El Placer", img: "🧊", condition: "Buen estado" },
    { title: "Bicicleta de montaña", price: "280.000", vereda: "Barro Blanco", img: "🚲", condition: "Usado" },
    { title: "Silla de oficina", price: "120.000", vereda: "El Llano", img: "🪑", condition: "Como nuevo" },
    { title: "Televisor 42 pulgadas", price: "350.000", vereda: "Piedras Blancas", img: "📺", condition: "Buen estado" },
  ],
  trade: [
    { title: "Cambio herramientas por plantas", price: null, vereda: "Santa Elena Centro", img: "🌱", condition: "Busco: plantas ornamentales" },
    { title: "Intercambio libros por ropa", price: null, vereda: "Media Luna", img: "📚", condition: "Busco: ropa talla M" },
    { title: "Trueque: gallinas por semillas", price: null, vereda: "El Cerro", img: "🐔", condition: "Busco: semillas de hortalizas" },
  ],
};

export default function MarketplacePage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const activeType = searchParams.type ?? null;
  const items = activeType
    ? MARKET_ITEMS.filter((i) => i.type === activeType)
    : [];
  const activeTypeDef = MARKETPLACE_TYPES.find((t) => t.slug === activeType);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">Marketplace Comunitario</h1>
          <p className="text-gray-500 text-sm mt-1">Compra, vende e intercambia con tus vecinos de Santa Elena</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Categorías principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {MARKETPLACE_TYPES.map(({ slug, icon, label, description, lightColor, activeColor }) => (
            <Link
              key={slug}
              href={`/marketplace?type=${slug}`}
              className={`flex items-start gap-4 border rounded-xl p-6 transition-all min-h-[44px] ${
                activeType === slug ? activeColor : `${lightColor} hover:shadow-md`
              }`}
            >
              <span className="text-4xl">{icon}</span>
              <div>
                <h2 className={`font-bold text-lg ${activeType === slug ? "text-white" : "text-gray-800"}`}>
                  {label}
                </h2>
                <p className={`text-sm mt-1 ${activeType === slug ? "text-white/80" : "text-gray-500"}`}>
                  {description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Publicar botón */}
        <div className="flex justify-end mb-6">
          <Link
            href="/register"
            className="bg-green-700 text-white font-semibold text-sm px-6 py-2 rounded-lg hover:bg-green-800 transition-colors min-h-[44px] flex items-center gap-2"
          >
            <span>+</span> Publicar anuncio
          </Link>
        </div>

        {/* Resultados */}
        {activeTypeDef ? (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {activeTypeDef.icon} {activeTypeDef.label}
            </h2>

            {items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/marketplace/${item.id}`}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-green-300 transition-all block"
                  >
                    <div className="bg-gray-100 h-36 flex items-center justify-center text-6xl">
                      {item.emoji}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-800 text-sm leading-snug">{item.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">📍 {item.vereda}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.condition}</p>
                      {item.price ? (
                        <p className="text-green-700 font-bold mt-2">$ {item.price.toLocaleString("es-CO")} COP</p>
                      ) : (
                        <p className="text-amber-600 font-semibold text-sm mt-2">🔄 Trueque</p>
                      )}
                      <div className="w-full mt-3 bg-green-700 text-white text-sm font-medium py-2 rounded-lg min-h-[44px] flex items-center justify-center">
                        Ver detalles →
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-4xl mb-3">{activeTypeDef.icon}</p>
                <p className="text-gray-500 font-medium">No hay publicaciones en esta categoría aún</p>
                <Link
                  href="/register"
                  className="inline-block mt-4 bg-green-700 text-white text-sm font-semibold px-6 py-2 rounded-lg hover:bg-green-800 transition-colors min-h-[44px] leading-[44px]"
                >
                  Publicar el primero
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium">Selecciona una categoría para explorar</p>
          </div>
        )}
      </div>
    </main>
  );
}
