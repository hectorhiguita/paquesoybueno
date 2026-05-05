import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y Condiciones | Santa Elena",
  description: "Términos y condiciones de uso de la plataforma comunitaria Santa Elena",
};

const LAST_UPDATED = "5 de mayo de 2025";

const SECTIONS = [
  {
    id: "definiciones",
    title: "1. Definiciones",
    content: [
      {
        type: "text",
        body: 'En este documento, los siguientes términos tendrán el significado que se indica a continuación:',
      },
      {
        type: "list",
        items: [
          '"Plataforma": el sitio web Santa Elena y todos sus servicios asociados.',
          '"Usuario": cualquier persona natural que se registre y acceda a la Plataforma.',
          '"Comunidad": el conjunto de vecinos, residentes y personas vinculadas a la vereda Santa Elena, Medellín.',
          '"Publicación": cualquier anuncio de servicio, producto, trueque o herramienta creado por un Usuario.',
          '"Operador": el equipo responsable de administrar y mantener la Plataforma.',
        ],
      },
    ],
  },
  {
    id: "aceptacion",
    title: "2. Aceptación de los Términos",
    content: [
      {
        type: "text",
        body: 'Al registrarse, acceder o utilizar la Plataforma, el Usuario declara haber leído, comprendido y aceptado la totalidad de estos Términos y Condiciones, así como nuestra Política de Privacidad. Si no está de acuerdo con alguna disposición, deberá abstenerse de usar la Plataforma.',
      },
      {
        type: "text",
        body: 'El Operador se reserva el derecho de modificar estos términos en cualquier momento. Los cambios se notificarán a través de la Plataforma y entrarán en vigor inmediatamente tras su publicación. El uso continuado de la Plataforma luego de la notificación implica aceptación de los nuevos términos.',
      },
    ],
  },
  {
    id: "registro",
    title: "3. Registro y Cuenta de Usuario",
    content: [
      {
        type: "text",
        body: 'Para acceder a las funcionalidades de la Plataforma, el Usuario debe:',
      },
      {
        type: "list",
        items: [
          'Ser mayor de 18 años o contar con autorización expresa de su representante legal.',
          'Proporcionar información veraz, completa y actualizada durante el registro.',
          'Mantener la confidencialidad de sus credenciales de acceso.',
          'Notificar de inmediato al Operador ante cualquier uso no autorizado de su cuenta.',
          'Ser residente, vecino o tener un vínculo legítimo con la comunidad de Santa Elena.',
        ],
      },
      {
        type: "text",
        body: 'El Usuario es el único responsable de todas las actividades realizadas bajo su cuenta. El Operador no será responsable por pérdidas o daños derivados del incumplimiento de estas obligaciones.',
      },
    ],
  },
  {
    id: "uso-permitido",
    title: "4. Uso Permitido de la Plataforma",
    content: [
      {
        type: "text",
        body: 'La Plataforma está diseñada exclusivamente para facilitar el intercambio comunitario entre vecinos de Santa Elena. Los Usuarios podrán:',
      },
      {
        type: "list",
        items: [
          'Publicar y contratar servicios locales (jardinería, plomería, electricidad, entre otros).',
          'Comprar, vender e intercambiar bienes de segunda mano.',
          'Ofrecer y solicitar herramientas en préstamo temporal.',
          'Comunicarse con otros miembros de la comunidad a través de los canales disponibles.',
        ],
      },
    ],
  },
  {
    id: "uso-prohibido",
    title: "5. Conductas Prohibidas",
    content: [
      {
        type: "text",
        body: 'Queda expresamente prohibido:',
      },
      {
        type: "list",
        items: [
          'Publicar contenido falso, engañoso, difamatorio, obsceno o que incite al odio.',
          'Ofrecer productos o servicios ilegales según la legislación colombiana vigente.',
          'Usar la Plataforma con fines comerciales a gran escala o para competencia desleal.',
          'Acosar, amenazar o intimidar a otros Usuarios.',
          'Intentar vulnerar la seguridad de la Plataforma o acceder sin autorización a cuentas de terceros.',
          'Suplantar la identidad de otro Usuario o persona.',
          'Publicar información personal de terceros sin su consentimiento.',
          'Realizar transacciones que evadan o simulen operaciones ilegales.',
        ],
      },
      {
        type: "text",
        body: 'El incumplimiento de estas prohibiciones podrá resultar en la suspensión o eliminación permanente de la cuenta, sin perjuicio de las acciones legales que correspondan.',
      },
    ],
  },
  {
    id: "publicaciones",
    title: "6. Publicaciones y Contenido de Usuarios",
    content: [
      {
        type: "text",
        body: 'Al crear una Publicación, el Usuario garantiza que:',
      },
      {
        type: "list",
        items: [
          'La información es veraz, precisa y no induce a error.',
          'Cuenta con los derechos necesarios sobre el contenido (textos, imágenes, etc.) y autoriza al Operador a mostrarlo en la Plataforma.',
          'El servicio o bien ofrecido es lícito y cumple con la normatividad aplicable.',
          'Los precios y condiciones indicados son los reales y vigentes.',
        ],
      },
      {
        type: "text",
        body: 'El Operador se reserva el derecho de eliminar o modificar cualquier Publicación que viole estos Términos, sin necesidad de previo aviso y sin responsabilidad frente al Usuario.',
      },
    ],
  },
  {
    id: "transacciones",
    title: "7. Transacciones entre Usuarios",
    content: [
      {
        type: "text",
        body: 'La Plataforma actúa únicamente como intermediario para facilitar el contacto entre Usuarios. El Operador NO es parte de ningún acuerdo, contrato o transacción entre Usuarios, y por tanto:',
      },
      {
        type: "list",
        items: [
          'No garantiza la calidad, seguridad o legalidad de los bienes o servicios ofrecidos.',
          'No verifica la identidad ni las habilidades profesionales de los Usuarios.',
          'No interviene en disputas entre Usuarios, aunque podrá ofrecer canales de mediación de manera voluntaria.',
          'No es responsable por incumplimientos, fraudes o daños derivados de transacciones entre Usuarios.',
        ],
      },
      {
        type: "text",
        body: 'Se recomienda a los Usuarios verificar la identidad de sus contrapartes, acordar los términos por escrito y, cuando corresponda, exigir comprobantes de las transacciones realizadas.',
      },
    ],
  },
  {
    id: "privacidad",
    title: "8. Privacidad y Protección de Datos",
    content: [
      {
        type: "text",
        body: 'El tratamiento de datos personales se rige por la Ley 1581 de 2012 (Ley de Habeas Data de Colombia) y sus decretos reglamentarios. Al registrarse, el Usuario autoriza al Operador a recopilar, almacenar y usar sus datos con los siguientes fines:',
      },
      {
        type: "list",
        items: [
          'Gestión y funcionamiento de la cuenta.',
          'Comunicaciones relacionadas con el uso de la Plataforma.',
          'Mejora de los servicios ofrecidos.',
          'Cumplimiento de obligaciones legales.',
        ],
      },
      {
        type: "text",
        body: 'El Usuario tiene derecho a conocer, actualizar, rectificar y solicitar la eliminación de sus datos personales en cualquier momento, contactando al Operador. Los datos no serán vendidos ni cedidos a terceros sin consentimiento previo, salvo requerimiento legal.',
      },
    ],
  },
  {
    id: "propiedad-intelectual",
    title: "9. Propiedad Intelectual",
    content: [
      {
        type: "text",
        body: 'Todos los derechos sobre el diseño, código, marca, logotipos y contenidos propios de la Plataforma pertenecen al Operador o a sus licenciantes. Queda prohibida su reproducción, distribución o uso sin autorización expresa.',
      },
      {
        type: "text",
        body: 'El Usuario conserva la titularidad del contenido que publique, pero otorga al Operador una licencia no exclusiva, gratuita y transferible para mostrar dicho contenido en la Plataforma mientras la cuenta esté activa.',
      },
    ],
  },
  {
    id: "limitacion",
    title: "10. Limitación de Responsabilidad",
    content: [
      {
        type: "text",
        body: 'En la máxima medida permitida por la ley colombiana, el Operador no será responsable por:',
      },
      {
        type: "list",
        items: [
          'Daños directos, indirectos, incidentales o consecuentes derivados del uso o imposibilidad de uso de la Plataforma.',
          'Pérdidas de datos, interrupciones del servicio o fallas técnicas fuera del control del Operador.',
          'Conductas fraudulentas o ilegales de terceros Usuarios.',
          'Inexactitud de la información publicada por los Usuarios.',
          'Incumplimiento de acuerdos celebrados entre Usuarios.',
        ],
      },
      {
        type: "text",
        body: 'La Plataforma se ofrece "tal como está" y el Operador no garantiza que su funcionamiento sea ininterrumpido, libre de errores o exento de virus u otros elementos dañinos.',
      },
    ],
  },
  {
    id: "suspension",
    title: "11. Suspensión y Cancelación de Cuentas",
    content: [
      {
        type: "text",
        body: 'El Operador podrá suspender o cancelar la cuenta de un Usuario, de manera temporal o definitiva, en los siguientes casos:',
      },
      {
        type: "list",
        items: [
          'Violación de estos Términos y Condiciones.',
          'Solicitud del propio Usuario.',
          'Inactividad prolongada de la cuenta.',
          'Requerimiento de autoridad competente.',
          'Riesgo para la seguridad de la comunidad o la Plataforma.',
        ],
      },
      {
        type: "text",
        body: 'Ante una suspensión por conducta contraria a los Términos, el Usuario no tendrá derecho a reclamo ni compensación alguna.',
      },
    ],
  },
  {
    id: "ley-aplicable",
    title: "12. Ley Aplicable y Resolución de Conflictos",
    content: [
      {
        type: "text",
        body: 'Estos Términos y Condiciones se rigen por las leyes de la República de Colombia. Cualquier controversia derivada de su interpretación o aplicación será sometida, en primer lugar, a una etapa de conciliación directa entre las partes.',
      },
      {
        type: "text",
        body: 'Si no se logra un acuerdo, el conflicto será resuelto por los jueces competentes de la ciudad de Medellín, Colombia, a quienes las partes se someten expresamente, renunciando a cualquier otro fuero que pudiera corresponderles.',
      },
    ],
  },
  {
    id: "contacto",
    title: "13. Contacto",
    content: [
      {
        type: "text",
        body: 'Para cualquier consulta, reclamo o ejercicio de derechos relacionados con estos Términos, el Usuario puede contactar al Operador a través de los canales disponibles en la Plataforma o en la sección de mensajes internos.',
      },
    ],
  },
];

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-br from-green-700 to-green-900 text-white py-12 px-6 text-center">
        <h1 className="text-3xl font-bold mb-2">Términos y Condiciones</h1>
        <p className="text-green-100 text-sm">Última actualización: {LAST_UPDATED}</p>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-10">
          <h2 className="font-bold text-amber-800 mb-2">Aviso importante</h2>
          <p className="text-amber-700 text-sm leading-relaxed">
            Esta plataforma es un espacio comunitario para vecinos de Santa Elena, Medellín. El Operador facilita
            el contacto entre Usuarios pero <strong>no es parte de las transacciones</strong> que estos realicen
            entre sí. Léa detenidamente estos términos antes de usar los servicios.
          </p>
        </div>

        {/* Índice */}
        <nav className="bg-white border border-gray-200 rounded-xl p-5 mb-10">
          <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Contenido</h2>
          <ol className="space-y-1">
            {SECTIONS.map(({ id, title }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="text-green-700 hover:text-green-900 text-sm hover:underline"
                >
                  {title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Secciones */}
        <div className="space-y-10">
          {SECTIONS.map(({ id, title, content }) => (
            <section key={id} id={id} className="scroll-mt-20">
              <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                {title}
              </h2>
              <div className="space-y-3">
                {content.map((block, i) =>
                  block.type === "text" ? (
                    <p key={i} className="text-gray-600 leading-relaxed text-sm">
                      {block.body}
                    </p>
                  ) : (
                    <ul key={i} className="list-disc list-inside space-y-1 pl-2">
                      {block.items!.map((item, j) => (
                        <li key={j} className="text-gray-600 text-sm leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            </section>
          ))}
        </div>

        {/* Pie */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-gray-400 text-xs mb-4">
            Al usar la Plataforma, confirmas que has leído y aceptas estos Términos y Condiciones.
          </p>
          <Link
            href="/"
            className="text-green-700 font-medium text-sm hover:underline"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
