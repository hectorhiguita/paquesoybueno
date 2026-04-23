// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Provider {
  id: string;
  name: string;
  avatar: string;
  vereda: string;
  category: string;
  categorySlug: string;
  rating: number;
  reviews: number;
  jobs: number;
  verified: boolean;
  phone: string;
  description: string;
  tags: string[];
  memberSince: string;
  responseTime: string;
  reviews_list: Review[];
}

export interface Review {
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export interface MarketItem {
  id: string;
  title: string;
  price: number | null;
  type: "sale" | "trade";
  vereda: string;
  condition: string;
  description: string;
  emoji: string;
  seller: string;
  sellerRating: number;
  date: string;
  tradeFor?: string;
}

export interface Tool {
  id: string;
  name: string;
  condition: "Bueno" | "Regular" | "Necesita reparación";
  owner: string;
  ownerRating: number;
  vereda: string;
  description: string;
  emoji: string;
  available: boolean;
  blockedDates: string[];
}

export interface Message {
  id: string;
  from: string;
  avatar: string;
  preview: string;
  time: string;
  unread: boolean;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  sender: "me" | "them";
  text: string;
  time: string;
}

export interface Notification {
  id: string;
  type: "message" | "rating" | "reservation" | "system";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

// ─── Proveedores ──────────────────────────────────────────────────────────────

export const PROVIDERS: Provider[] = [
  {
    id: "p1",
    name: "Carlos Restrepo",
    avatar: "👨‍🌾",
    vereda: "El Placer",
    category: "Jardinería",
    categorySlug: "jardineria",
    rating: 4.8,
    reviews: 34,
    jobs: 47,
    verified: true,
    phone: "3001234567",
    description:
      "Más de 10 años cuidando jardines en Santa Elena. Especializado en jardines nativos, poda de árboles frutales y diseño de huertas caseras. Trabajo con amor por la tierra.",
    tags: ["Poda", "Huerta", "Jardín nativo", "Árboles frutales"],
    memberSince: "Enero 2023",
    responseTime: "Menos de 1 hora",
    reviews_list: [
      { author: "María G.", rating: 5, comment: "Excelente trabajo, dejó el jardín hermoso. Muy puntual y profesional.", date: "Hace 2 semanas" },
      { author: "Pedro A.", rating: 5, comment: "Muy buen servicio, conoce mucho de plantas nativas. Lo recomiendo.", date: "Hace 1 mes" },
      { author: "Lucía M.", rating: 4, comment: "Buen trabajo aunque tardó un poco más de lo acordado.", date: "Hace 2 meses" },
    ],
  },
  {
    id: "p2",
    name: "Luis Martínez",
    avatar: "👨‍🔧",
    vereda: "Piedras Blancas",
    category: "Electricidad",
    categorySlug: "electricidad",
    rating: 4.9,
    reviews: 52,
    jobs: 78,
    verified: true,
    phone: "3109876543",
    description:
      "Electricista certificado con 15 años de experiencia. Instalaciones residenciales, reparaciones, tableros eléctricos y sistemas de iluminación LED. Trabajo garantizado.",
    tags: ["Instalaciones", "Tableros", "LED", "Reparaciones"],
    memberSince: "Marzo 2022",
    responseTime: "Menos de 2 horas",
    reviews_list: [
      { author: "Ana R.", rating: 5, comment: "Resolvió el problema en menos de una hora. Muy profesional.", date: "Hace 1 semana" },
      { author: "Jorge L.", rating: 5, comment: "Instaló todo el sistema eléctrico de mi casa. Trabajo impecable.", date: "Hace 3 semanas" },
      { author: "Carmen V.", rating: 5, comment: "Muy responsable y honesto con los precios.", date: "Hace 1 mes" },
    ],
  },
  {
    id: "p3",
    name: "Juan Pérez",
    avatar: "🔧",
    vereda: "Santa Elena Centro",
    category: "Plomería",
    categorySlug: "plomeria",
    rating: 4.7,
    reviews: 28,
    jobs: 41,
    verified: true,
    phone: "3154567890",
    description:
      "Plomero con experiencia en reparación de tuberías, instalación de sanitarios, grifería y sistemas de agua caliente. Atención de emergencias 24/7.",
    tags: ["Tuberías", "Sanitarios", "Grifería", "Emergencias"],
    memberSince: "Junio 2022",
    responseTime: "Menos de 30 min",
    reviews_list: [
      { author: "Rosa M.", rating: 5, comment: "Llegó rápido a la emergencia. Muy eficiente.", date: "Hace 3 días" },
      { author: "Andrés C.", rating: 4, comment: "Buen trabajo, precios justos.", date: "Hace 2 semanas" },
      { author: "Patricia H.", rating: 5, comment: "Resolvió una filtración que otros no pudieron. Excelente.", date: "Hace 1 mes" },
    ],
  },
  {
    id: "p4",
    name: "Ana Gómez",
    avatar: "👩‍🌾",
    vereda: "Barro Blanco",
    category: "Jardinería",
    categorySlug: "jardineria",
    rating: 4.5,
    reviews: 19,
    jobs: 24,
    verified: false,
    phone: "3187654321",
    description:
      "Apasionada por las plantas y el campo. Ofrezco servicios de siembra, mantenimiento de jardines y asesoría en cultivos orgánicos para el hogar.",
    tags: ["Siembra", "Orgánico", "Mantenimiento", "Asesoría"],
    memberSince: "Agosto 2023",
    responseTime: "Menos de 3 horas",
    reviews_list: [
      { author: "Felipe T.", rating: 5, comment: "Muy amable y conocedora. Mi jardín quedó precioso.", date: "Hace 1 semana" },
      { author: "Sandra B.", rating: 4, comment: "Buen servicio, plantas muy saludables.", date: "Hace 1 mes" },
    ],
  },
  {
    id: "p5",
    name: "Pedro Álvarez",
    avatar: "⚡",
    vereda: "El Llano",
    category: "Electricidad",
    categorySlug: "electricidad",
    rating: 4.3,
    reviews: 12,
    jobs: 18,
    verified: false,
    phone: "3201112233",
    description:
      "Técnico electricista con experiencia en instalaciones domiciliarias y reparaciones menores. Precios accesibles para la comunidad.",
    tags: ["Instalaciones", "Reparaciones", "Domiciliario"],
    memberSince: "Noviembre 2023",
    responseTime: "Menos de 4 horas",
    reviews_list: [
      { author: "Camilo R.", rating: 4, comment: "Buen trabajo, cumplió con lo acordado.", date: "Hace 2 semanas" },
      { author: "Diana P.", rating: 5, comment: "Muy puntual y ordenado.", date: "Hace 1 mes" },
    ],
  },
  {
    id: "p6",
    name: "Roberto Sánchez",
    avatar: "🏗️",
    vereda: "Media Luna",
    category: "Construcción",
    categorySlug: "construccion",
    rating: 4.6,
    reviews: 22,
    jobs: 31,
    verified: true,
    phone: "3223344556",
    description:
      "Maestro de obra con 20 años de experiencia. Remodelaciones, ampliaciones, pisos, enchapes y pintura. Presupuesto sin costo.",
    tags: ["Remodelación", "Pisos", "Enchapes", "Pintura"],
    memberSince: "Febrero 2022",
    responseTime: "Mismo día",
    reviews_list: [
      { author: "Hernán V.", rating: 5, comment: "Remodeló mi cocina perfectamente. Muy profesional.", date: "Hace 2 semanas" },
      { author: "Gloria M.", rating: 4, comment: "Buen trabajo, aunque el tiempo se extendió un poco.", date: "Hace 1 mes" },
    ],
  },
  {
    id: "p7",
    name: "Sofía Torres",
    avatar: "📱",
    vereda: "El Cerro",
    category: "Tecnología",
    categorySlug: "tecnologia",
    rating: 4.7,
    reviews: 31,
    jobs: 45,
    verified: true,
    phone: "3334455667",
    description:
      "Técnica en sistemas. Reparación de computadores, celulares, instalación de redes WiFi y soporte técnico a domicilio. Atención rápida y garantía en reparaciones.",
    tags: ["Computadores", "Celulares", "WiFi", "Soporte"],
    memberSince: "Mayo 2022",
    responseTime: "Menos de 2 horas",
    reviews_list: [
      { author: "Tomás A.", rating: 5, comment: "Reparó mi celular en el día. Excelente servicio.", date: "Hace 4 días" },
      { author: "Valentina C.", rating: 5, comment: "Instaló el WiFi en toda la casa. Muy eficiente.", date: "Hace 2 semanas" },
    ],
  },
  {
    id: "p8",
    name: "Miguel Ángel Ruiz",
    avatar: "🚗",
    vereda: "Pantanillo",
    category: "Transporte",
    categorySlug: "transporte",
    rating: 4.4,
    reviews: 16,
    jobs: 29,
    verified: false,
    phone: "3445566778",
    description:
      "Servicio de transporte de carga y pasajeros en Santa Elena y Medellín. Camioneta disponible para trasteos, domicilios y diligencias.",
    tags: ["Trasteos", "Carga", "Domicilios", "Diligencias"],
    memberSince: "Septiembre 2023",
    responseTime: "Menos de 1 hora",
    reviews_list: [
      { author: "Isabel F.", rating: 4, comment: "Puntual y cuidadoso con los muebles.", date: "Hace 1 semana" },
      { author: "Nicolás B.", rating: 5, comment: "Excelente servicio de trasteo. Muy recomendado.", date: "Hace 3 semanas" },
    ],
  },
  {
    id: "p9",
    name: "Claudia Herrera",
    avatar: "🔌",
    vereda: "El Placer",
    category: "Electrodomésticos",
    categorySlug: "electrodomesticos",
    rating: 4.8,
    reviews: 41,
    jobs: 63,
    verified: true,
    phone: "3556677889",
    description:
      "Técnica especializada en reparación de electrodomésticos: neveras, lavadoras, estufas, microondas y más. Servicio a domicilio con repuestos originales.",
    tags: ["Neveras", "Lavadoras", "Estufas", "Microondas"],
    memberSince: "Enero 2022",
    responseTime: "Mismo día",
    reviews_list: [
      { author: "Beatriz L.", rating: 5, comment: "Reparó mi nevera en 2 horas. Muy profesional.", date: "Hace 3 días" },
      { author: "Ernesto M.", rating: 5, comment: "Arregló la lavadora que otros dijeron que no tenía solución.", date: "Hace 2 semanas" },
      { author: "Pilar G.", rating: 4, comment: "Buen servicio, precio justo.", date: "Hace 1 mes" },
    ],
  },
  {
    id: "p10",
    name: "Fermín Ospina",
    avatar: "🌾",
    vereda: "Barro Blanco",
    category: "Agricultura",
    categorySlug: "agricultura",
    rating: 4.9,
    reviews: 27,
    jobs: 38,
    verified: true,
    phone: "3667788990",
    description:
      "Agricultor con 25 años de experiencia en cultivos de papa, maíz y hortalizas. Asesoría en técnicas agroecológicas y manejo de suelos.",
    tags: ["Papa", "Maíz", "Hortalizas", "Agroecología"],
    memberSince: "Octubre 2021",
    responseTime: "Mismo día",
    reviews_list: [
      { author: "Consuelo R.", rating: 5, comment: "Excelente asesoría para mi huerta. Muy conocedor.", date: "Hace 1 semana" },
      { author: "Álvaro T.", rating: 5, comment: "Gracias a sus consejos mi cosecha mejoró mucho.", date: "Hace 1 mes" },
    ],
  },
];

// ─── Marketplace ──────────────────────────────────────────────────────────────

export const MARKET_ITEMS: MarketItem[] = [
  { id: "m1", title: "Nevera Samsung 300L", price: 450000, type: "sale", vereda: "El Placer", condition: "Buen estado", description: "Nevera Samsung de 300 litros, 5 años de uso, funciona perfectamente. Se vende por cambio de modelo.", emoji: "🧊", seller: "Carlos R.", sellerRating: 4.8, date: "Hace 2 días" },
  { id: "m2", title: "Bicicleta de montaña Trek", price: 280000, type: "sale", vereda: "Barro Blanco", condition: "Usado", description: "Bicicleta Trek 21 velocidades, rin 26. Necesita ajuste de frenos. Ideal para los caminos de Santa Elena.", emoji: "🚲", seller: "Ana G.", sellerRating: 4.5, date: "Hace 3 días" },
  { id: "m3", title: "Silla de oficina ergonómica", price: 120000, type: "sale", vereda: "El Llano", condition: "Como nuevo", description: "Silla ergonómica con soporte lumbar, apenas 6 meses de uso. Se vende por mudanza.", emoji: "🪑", seller: "Luis M.", sellerRating: 4.9, date: "Hace 1 semana" },
  { id: "m4", title: "Televisor LG 42 pulgadas", price: 350000, type: "sale", vereda: "Piedras Blancas", condition: "Buen estado", description: "TV LG Smart 42 pulgadas, Full HD. Control remoto original incluido. Funciona perfectamente.", emoji: "📺", seller: "Juan P.", sellerRating: 4.7, date: "Hace 4 días" },
  { id: "m5", title: "Estufa de 4 puestos", price: 180000, type: "sale", vereda: "Media Luna", condition: "Buen estado", description: "Estufa a gas de 4 puestos, marca Haceb. Incluye manguera y regulador. Funciona bien.", emoji: "🍳", seller: "Roberto S.", sellerRating: 4.6, date: "Hace 5 días" },
  { id: "m6", title: "Colchón doble Americana", price: 200000, type: "sale", vereda: "Santa Elena Centro", condition: "Buen estado", description: "Colchón doble Americana, 2 años de uso. Se vende por cambio de cama.", emoji: "🛏️", seller: "Sofía T.", sellerRating: 4.7, date: "Hace 1 semana" },
  { id: "m7", title: "Cambio herramientas por plantas", price: null, type: "trade", vereda: "Santa Elena Centro", condition: "Herramientas en buen estado", description: "Tengo pala, azadón y tijeras de podar en buen estado. Busco plantas ornamentales o semillas de hortalizas.", emoji: "🌱", seller: "Fermín O.", sellerRating: 4.9, date: "Hace 1 día", tradeFor: "Plantas ornamentales o semillas" },
  { id: "m8", title: "Intercambio libros por ropa", price: null, type: "trade", vereda: "Media Luna", condition: "Libros en buen estado", description: "Tengo colección de 20 libros de literatura colombiana. Busco ropa talla M o L en buen estado.", emoji: "📚", seller: "Claudia H.", sellerRating: 4.8, date: "Hace 2 días", tradeFor: "Ropa talla M o L" },
  { id: "m9", title: "Gallinas ponedoras por semillas", price: null, type: "trade", vereda: "El Cerro", condition: "Gallinas sanas", description: "Tengo 5 gallinas ponedoras criollas. Busco semillas de hortalizas o árboles frutales.", emoji: "🐔", seller: "Miguel R.", sellerRating: 4.4, date: "Hace 3 días", tradeFor: "Semillas de hortalizas o frutales" },
  { id: "m10", title: "Miel de abejas por café", price: null, type: "trade", vereda: "Barro Blanco", condition: "Miel pura artesanal", description: "Produzco miel de abejas nativas. Busco café de la región o panela.", emoji: "🍯", seller: "Ana G.", sellerRating: 4.5, date: "Hace 4 días", tradeFor: "Café o panela de la región" },
];

// ─── Herramientas ─────────────────────────────────────────────────────────────

export const TOOLS: Tool[] = [
  { id: "t1", name: "Taladro eléctrico Bosch", condition: "Bueno", owner: "Carlos R.", ownerRating: 4.8, vereda: "El Placer", description: "Taladro percutor Bosch 500W con maletín y set de brocas. Ideal para trabajos en concreto y madera.", emoji: "🔩", available: true, blockedDates: [] },
  { id: "t2", name: "Motosierra Stihl", condition: "Bueno", owner: "Fermín O.", ownerRating: 4.9, vereda: "Barro Blanco", description: "Motosierra Stihl MS 170 para poda de árboles y corte de madera. Incluye cadena de repuesto.", emoji: "🪚", available: true, blockedDates: ["2025-07-10", "2025-07-11"] },
  { id: "t3", name: "Escalera de aluminio 6m", condition: "Bueno", owner: "Roberto S.", ownerRating: 4.6, vereda: "Media Luna", description: "Escalera extensible de aluminio de 6 metros. Perfecta para trabajos en altura.", emoji: "🪜", available: false, blockedDates: ["2025-07-08", "2025-07-09", "2025-07-10"] },
  { id: "t4", name: "Compresor de aire", condition: "Regular", owner: "Luis M.", ownerRating: 4.9, vereda: "Piedras Blancas", description: "Compresor de 50 litros, 2HP. Funciona bien aunque hace algo de ruido. Incluye manguera y pistola.", emoji: "💨", available: true, blockedDates: [] },
  { id: "t5", name: "Rotomartillo Dewalt", condition: "Bueno", owner: "Pedro Á.", ownerRating: 4.3, vereda: "El Llano", description: "Rotomartillo Dewalt para trabajos pesados en concreto. Incluye set de cinceles.", emoji: "⚒️", available: true, blockedDates: [] },
  { id: "t6", name: "Cortadora de césped", condition: "Bueno", owner: "Ana G.", ownerRating: 4.5, vereda: "Barro Blanco", description: "Cortadora de césped a gasolina, 4HP. Ideal para jardines grandes.", emoji: "🌿", available: true, blockedDates: [] },
  { id: "t7", name: "Soldadora eléctrica", condition: "Necesita reparación", owner: "Miguel R.", ownerRating: 4.4, vereda: "Pantanillo", description: "Soldadora 200A. Necesita cambio de pinza de masa pero funciona. Precio de préstamo reducido.", emoji: "🔥", available: true, blockedDates: [] },
  { id: "t8", name: "Mezcladora de concreto", condition: "Bueno", owner: "Roberto S.", ownerRating: 4.6, vereda: "Media Luna", description: "Mezcladora eléctrica de 140 litros. Perfecta para obras pequeñas y medianas.", emoji: "🏗️", available: true, blockedDates: [] },
];

// ─── Mensajes ─────────────────────────────────────────────────────────────────

export const MESSAGES: Message[] = [
  {
    id: "msg1",
    from: "Carlos Restrepo",
    avatar: "👨‍🌾",
    preview: "Claro, puedo ir el martes a las 9am. ¿Le parece bien?",
    time: "10:32 am",
    unread: true,
    messages: [
      { id: "1", sender: "them", text: "Hola, vi su anuncio de jardinería. ¿Está disponible esta semana?", time: "Ayer 3:15 pm" },
      { id: "2", sender: "me", text: "Hola Carlos, sí estoy disponible. ¿Qué trabajo necesita?", time: "Ayer 3:45 pm" },
      { id: "3", sender: "them", text: "Necesito poda de árboles y mantenimiento del jardín. Son como 4 árboles grandes.", time: "Ayer 4:00 pm" },
      { id: "4", sender: "me", text: "Perfecto, eso lo puedo hacer. ¿Cuándo le queda bien?", time: "Ayer 4:10 pm" },
      { id: "5", sender: "them", text: "Claro, puedo ir el martes a las 9am. ¿Le parece bien?", time: "10:32 am" },
    ],
  },
  {
    id: "msg2",
    from: "Ana Gómez",
    avatar: "👩‍🌾",
    preview: "Muchas gracias por la calificación 🙏",
    time: "Ayer",
    unread: false,
    messages: [
      { id: "1", sender: "them", text: "Buenos días, ¿ya recibió las plantas que le dejé?", time: "Ayer 8:00 am" },
      { id: "2", sender: "me", text: "Sí, llegaron perfectas. Muchas gracias Ana.", time: "Ayer 9:30 am" },
      { id: "3", sender: "them", text: "Muchas gracias por la calificación 🙏", time: "Ayer 10:00 am" },
    ],
  },
  {
    id: "msg3",
    from: "Juan Pérez",
    avatar: "🔧",
    preview: "La filtración quedó reparada. Cualquier cosa me avisa.",
    time: "Lun",
    unread: false,
    messages: [
      { id: "1", sender: "me", text: "Juan, tengo una filtración urgente en el baño.", time: "Lun 7:00 am" },
      { id: "2", sender: "them", text: "Voy en 30 minutos.", time: "Lun 7:05 am" },
      { id: "3", sender: "them", text: "La filtración quedó reparada. Cualquier cosa me avisa.", time: "Lun 9:30 am" },
    ],
  },
];

// ─── Notificaciones ───────────────────────────────────────────────────────────

export const NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "message", title: "Nuevo mensaje de Carlos Restrepo", body: "Claro, puedo ir el martes a las 9am. ¿Le parece bien?", time: "Hace 5 min", read: false },
  { id: "n2", type: "rating", title: "Nueva calificación recibida", body: "Ana Gómez te calificó con 5 estrellas: 'Excelente servicio'", time: "Hace 2 horas", read: false },
  { id: "n3", type: "reservation", title: "Solicitud de reserva de herramienta", body: "Pedro Álvarez quiere reservar tu taladro del 10 al 12 de julio", time: "Hace 3 horas", read: false },
  { id: "n4", type: "system", title: "Nuevo servicio en tu vereda", body: "Claudia Herrera publicó un servicio de reparación de electrodomésticos en El Placer", time: "Ayer", read: true },
  { id: "n5", type: "rating", title: "Tu perfil fue calificado", body: "Luis Martínez te calificó con 4 estrellas", time: "Hace 2 días", read: true },
  { id: "n6", type: "reservation", title: "Reserva confirmada", body: "Tu reserva del taladro de Carlos R. fue confirmada para el 15 de julio", time: "Hace 3 días", read: true },
];
