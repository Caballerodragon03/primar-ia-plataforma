import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidad — Primar-IA',
  description: 'Política de privacidad y protección de datos personales de la plataforma Primar-IA.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Primar<span className="text-primary">-IA</span>
          </Link>
          <Link href="/register" className="text-sm text-secondary hover:text-gray-900 transition-colors">
            Volver al registro
          </Link>
        </div>
      </header>

      <article className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidad</h1>
        <p className="text-sm text-secondary mb-10">Última actualización: 6 de mayo de 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-[15px] leading-relaxed text-gray-700">

          {/* ── 1. RESPONSABLE ─────────────────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-0">1. Responsable del tratamiento</h2>
            <p>
              En cumplimiento del Reglamento (UE) 2016/679 General de Protección de Datos (RGPD) y de la
              Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los
              derechos digitales (LOPDGDD), se informa de que el responsable del tratamiento de sus datos
              personales es:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Denominación social:</strong> Primar-IA Lonja Digital S.L. (en constitución)</li>
              <li><strong>CIF:</strong> Pendiente de asignación</li>
              <li><strong>Domicilio:</strong> Calle Playa de San Juan, 20, España</li>
              <li><strong>Email de contacto:</strong> info@primar-ia.com</li>
            </ul>
            <p>
              Dado el volumen y naturaleza de los datos tratados, la sociedad no está obligada a designar
              un Delegado de Protección de Datos conforme al artículo 37 del RGPD. No obstante, cualquier
              consulta relativa a la protección de datos puede dirigirse a info@primar-ia.com.
            </p>
          </section>

          {/* ── 2. DATOS QUE RECOGEMOS ─────────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Datos personales que recogemos</h2>

            <h3 className="text-base font-medium text-gray-900">2.1. Datos proporcionados por el usuario</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 border-b border-border">Categoría</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 border-b border-border">Datos</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 border-b border-border">Obligatorio</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 border-b border-border">Identificación personal</td>
                    <td className="px-4 py-2 border-b border-border">Nombre, apellidos, correo electrónico, teléfono</td>
                    <td className="px-4 py-2 border-b border-border">Sí (excepto teléfono)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-border">Datos empresariales</td>
                    <td className="px-4 py-2 border-b border-border">Razón social, CIF/NIF, forma jurídica, dirección fiscal, ciudad, código postal, país</td>
                    <td className="px-4 py-2 border-b border-border">Sí</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-border">Datos de contacto legal</td>
                    <td className="px-4 py-2 border-b border-border">Persona de contacto legal, cargo</td>
                    <td className="px-4 py-2 border-b border-border">Sí</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-border">Credenciales de acceso</td>
                    <td className="px-4 py-2 border-b border-border">Contraseña (almacenada en formato hash bcrypt, nunca en texto plano)</td>
                    <td className="px-4 py-2 border-b border-border">Sí</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Certificados y documentos</td>
                    <td className="px-4 py-2">Certificados de calidad, sanitarios u otros documentos subidos por el usuario</td>
                    <td className="px-4 py-2">Según perfil</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-base font-medium text-gray-900">2.2. Datos generados por el uso de la Plataforma</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Historial de Lotes, Pedidos, Matches y Transacciones</li>
              <li>Mensajes intercambiados a través del chat interno</li>
              <li>Valoraciones y disputas</li>
              <li>Registros de auditoría (acciones realizadas, fecha, dirección IP)</li>
              <li>Datos de navegación y preferencias de idioma</li>
            </ul>
          </section>

          {/* ── 3. FINALIDADES Y BASE JURÍDICA ─────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Finalidades y base jurídica del tratamiento</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 border-b border-border">Finalidad</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 border-b border-border">Base jurídica (art. 6 RGPD)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 border-b border-border">Gestión del registro, verificación de identidad y mantenimiento de la cuenta</td>
                    <td className="px-4 py-2 border-b border-border">Ejecución del contrato (art. 6.1.b)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-border">Prestación de los servicios de la Plataforma (matching, transacciones, pagos)</td>
                    <td className="px-4 py-2 border-b border-border">Ejecución del contrato (art. 6.1.b)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-border">Procesamiento de pagos a través de Stripe Connect</td>
                    <td className="px-4 py-2 border-b border-border">Ejecución del contrato (art. 6.1.b)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-border">Prevención de fraude y detección de conductas evasivas (bypass)</td>
                    <td className="px-4 py-2 border-b border-border">Interés legítimo (art. 6.1.f)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-border">Envío de comunicaciones transaccionales (estado de cuenta, transacciones, verificaciones)</td>
                    <td className="px-4 py-2 border-b border-border">Ejecución del contrato (art. 6.1.b)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-border">Cumplimiento de obligaciones legales y fiscales</td>
                    <td className="px-4 py-2 border-b border-border">Obligación legal (art. 6.1.c)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Mejora de los servicios y análisis agregados de uso</td>
                    <td className="px-4 py-2">Interés legítimo (art. 6.1.f)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ── 4. DESTINATARIOS ───────────────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Destinatarios de los datos</h2>
            <p>Sus datos personales podrán ser comunicados a los siguientes destinatarios:</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 border-b border-border">Destinatario</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 border-b border-border">Finalidad</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 border-b border-border">Ubicación</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 border-b border-border"><strong>Stripe, Inc.</strong></td>
                    <td className="px-4 py-2 border-b border-border">Procesamiento de pagos, KYC/AML</td>
                    <td className="px-4 py-2 border-b border-border">EE.UU. (cláusulas contractuales tipo + DPF)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-border"><strong>Resend, Inc.</strong></td>
                    <td className="px-4 py-2 border-b border-border">Envío de correos electrónicos transaccionales</td>
                    <td className="px-4 py-2 border-b border-border">EE.UU. (cláusulas contractuales tipo)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-border"><strong>Railway Corp.</strong></td>
                    <td className="px-4 py-2 border-b border-border">Hosting de infraestructura (servidores, base de datos)</td>
                    <td className="px-4 py-2 border-b border-border">EE.UU. (cláusulas contractuales tipo)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b border-border"><strong>Cloudflare, Inc.</strong></td>
                    <td className="px-4 py-2 border-b border-border">Almacenamiento de archivos (R2) y CDN</td>
                    <td className="px-4 py-2 border-b border-border">UE/EE.UU. (cláusulas contractuales tipo + DPF)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2"><strong>Otros usuarios</strong></td>
                    <td className="px-4 py-2">Datos comerciales visibles (razón social, productos) en el contexto de Matches y Transacciones</td>
                    <td className="px-4 py-2">UE</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Las transferencias internacionales a EE.UU. se amparan en las Cláusulas Contractuales Tipo
              aprobadas por la Comisión Europea (Decisión 2021/914) y, en su caso, en el EU-U.S. Data
              Privacy Framework.
            </p>
          </section>

          {/* ── 5. PLAZOS DE CONSERVACIÓN ──────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Plazos de conservación</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Datos de cuenta:</strong> mientras la cuenta esté activa y hasta 30 días tras la solicitud de baja.</li>
              <li><strong>Datos de transacciones y facturación:</strong> 6 años desde la última operación (art. 30 del Código de Comercio y normativa tributaria).</li>
              <li><strong>Registros de auditoría:</strong> 5 años (art. 17.3.e RGPD en relación con la defensa de reclamaciones).</li>
              <li><strong>Datos de mensajería interna:</strong> 2 años desde el cierre de la Transacción asociada.</li>
              <li><strong>Tokens de sesión y refresh tokens:</strong> eliminados automáticamente a su expiración (15 minutos y 30 días, respectivamente).</li>
            </ul>
          </section>

          {/* ── 6. DERECHOS DEL INTERESADO ─────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Derechos del interesado</h2>
            <p>
              De conformidad con los artículos 15 a 22 del RGPD y los artículos 12 a 18 de la LOPDGDD,
              usted tiene derecho a:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Acceso:</strong> obtener confirmación de si se están tratando sus datos y acceder a los mismos.</li>
              <li><strong>Rectificación:</strong> solicitar la corrección de datos inexactos o incompletos.</li>
              <li><strong>Supresión:</strong> solicitar la eliminación de sus datos cuando ya no sean necesarios para la finalidad para la que fueron recogidos.</li>
              <li><strong>Limitación:</strong> solicitar la limitación del tratamiento en determinadas circunstancias.</li>
              <li><strong>Portabilidad:</strong> recibir sus datos en un formato estructurado y de uso común (JSON o CSV).</li>
              <li><strong>Oposición:</strong> oponerse al tratamiento basado en interés legítimo.</li>
            </ul>
            <p>
              Para ejercer cualquiera de estos derechos, envíe un correo electrónico a{' '}
              <strong>info@primar-ia.com</strong> indicando el derecho que desea ejercer y acompañando
              copia de su documento de identidad. Le responderemos en un plazo máximo de un mes
              (art. 12.3 RGPD).
            </p>
            <p>
              Si considera que el tratamiento de sus datos no se ajusta a la normativa, tiene derecho a
              presentar una reclamación ante la{' '}
              <strong>Agencia Española de Protección de Datos (AEPD)</strong>:{' '}
              <a
                href="https://www.aepd.es"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-gray-900 underline"
              >
                www.aepd.es
              </a>
            </p>
          </section>

          {/* ── 7. MEDIDAS DE SEGURIDAD ────────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">7. Medidas de seguridad</h2>
            <p>
              Primar-IA implementa medidas técnicas y organizativas adecuadas para garantizar la seguridad
              de los datos personales, entre las que se incluyen:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Cifrado de contraseñas mediante bcrypt con factor de coste 12.</li>
              <li>Comunicaciones cifradas mediante HTTPS/TLS en todas las conexiones.</li>
              <li>Tokens de acceso JWT con expiración de 15 minutos y rotación automática de refresh tokens.</li>
              <li>Bloqueo automático de cuenta tras 5 intentos fallidos de inicio de sesión.</li>
              <li>Verificación de integridad criptográfica (HMAC-SHA256) en códigos QR de entrega.</li>
              <li>Cabeceras de seguridad HTTP (HSTS, Permissions-Policy, Content-Security-Policy).</li>
              <li>Aislamiento de datos de pago: Primar-IA no almacena datos de tarjeta (PCI-DSS gestionado por Stripe).</li>
              <li>Control de acceso basado en roles (VENDEDOR, COMPRADOR, ADMIN) con verificación en cada endpoint.</li>
            </ul>
          </section>

          {/* ── 8. COOKIES ─────────────────────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">8. Cookies y tecnologías similares</h2>
            <p>
              La Plataforma utiliza exclusivamente cookies técnicas y funcionales estrictamente necesarias
              para el funcionamiento del servicio:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Refresh token (HttpOnly, Secure):</strong> cookie de sesión para mantener la autenticación del usuario. Duración: 30 días.</li>
              <li><strong>Preferencias de idioma:</strong> almacenadas en localStorage del navegador.</li>
            </ul>
            <p>
              No se utilizan cookies analíticas, publicitarias ni de seguimiento de terceros. Al tratarse
              exclusivamente de cookies técnicas necesarias, no se requiere consentimiento previo conforme
              al artículo 22.2 de la LSSI-CE.
            </p>
          </section>

          {/* ── 9. MENORES ─────────────────────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">9. Menores de edad</h2>
            <p>
              La Plataforma está dirigida exclusivamente a profesionales y empresas del sector agroalimentario.
              No está diseñada ni destinada a menores de 18 años. No recogemos intencionadamente datos de
              menores de edad. Si detectamos que un menor se ha registrado, procederemos a eliminar sus datos
              de inmediato.
            </p>
          </section>

          {/* ── 10. MODIFICACIONES ─────────────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">10. Modificaciones de esta Política</h2>
            <p>
              Nos reservamos el derecho de actualizar esta Política de Privacidad para reflejar cambios en
              nuestras prácticas o en la legislación aplicable. Cualquier modificación sustancial será
              notificada a los usuarios registrados por correo electrónico con un preaviso razonable. La
              fecha de última actualización se indica al inicio de este documento.
            </p>
          </section>

          {/* ── 11. CONTACTO ───────────────────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">11. Contacto</h2>
            <p>
              Para cualquier consulta relacionada con el tratamiento de sus datos personales o para ejercer
              sus derechos, puede contactarnos a través de:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Email:</strong> info@primar-ia.com</li>
              <li><strong>Dirección:</strong> Calle Playa de San Juan, 20, España</li>
            </ul>
          </section>

        </div>
      </article>

      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap gap-4 justify-between text-sm text-secondary">
          <span>&copy; {new Date().getFullYear()} Primar-IA Lonja Digital S.L.</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Términos y Condiciones</Link>
            <Link href="/privacy" className="hover:text-gray-900 transition-colors font-medium">Política de Privacidad</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
