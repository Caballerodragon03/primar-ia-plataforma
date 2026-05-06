import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Primar-IA',
  description: 'Términos y condiciones generales de uso de la plataforma Primar-IA.',
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Términos y Condiciones Generales de Uso</h1>
        <p className="text-sm text-secondary mb-10">Última actualización: 6 de mayo de 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-[15px] leading-relaxed text-gray-700">

          {/* ── 1. IDENTIFICACIÓN ─────────────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-0">1. Identificación del prestador</h2>
            <p>
              En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad
              de la Información y de Comercio Electrónico (LSSI-CE), se informa al usuario de los siguientes
              datos del titular de la plataforma:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Denominación social:</strong> Primar-IA Lonja Digital S.L. (en constitución)</li>
              <li><strong>CIF:</strong> Pendiente de asignación</li>
              <li><strong>Domicilio social:</strong> Calle Playa de San Juan, 20, España</li>
              <li><strong>Correo electrónico:</strong> info@primar-ia.com</li>
              <li><strong>Sitio web:</strong> https://app.primar-ia.com</li>
            </ul>
            <p>
              Una vez completada la inscripción en el Registro Mercantil, se actualizarán los datos de
              identificación en el presente documento.
            </p>
          </section>

          {/* ── 2. OBJETO ─────────────────────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Objeto y ámbito de aplicación</h2>
            <p>
              Los presentes Términos y Condiciones Generales (en adelante, «Condiciones») regulan el acceso
              y uso de la plataforma digital <strong>Primar-IA</strong> (en adelante, «la Plataforma»),
              un marketplace B2B que conecta a productores del sector primario (vendedores) con compradores
              y distribuidores dentro del territorio español y, en su caso, de la Unión Europea.
            </p>
            <p>
              El registro en la Plataforma y el uso de cualquiera de sus servicios implica la aceptación
              íntegra e incondicional de estas Condiciones, así como de la{' '}
              <Link href="/privacy" className="font-semibold text-gray-900 underline">Política de Privacidad</Link>.
            </p>
          </section>

          {/* ── 3. DEFINICIONES ────────────────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Definiciones</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Vendedor:</strong> persona jurídica o empresario individual del sector agroalimentario que publica lotes de producto en la Plataforma.</li>
              <li><strong>Comprador:</strong> persona jurídica o empresario individual que publica pedidos de compra y adquiere producto a través de la Plataforma.</li>
              <li><strong>Lote:</strong> oferta de venta de un producto publicada por un Vendedor, con especificaciones de variedad, calibre, cantidad, precio y disponibilidad.</li>
              <li><strong>Pedido:</strong> solicitud de compra publicada por un Comprador con los requisitos del producto que necesita.</li>
              <li><strong>Match:</strong> vinculación propuesta por el algoritmo de la Plataforma entre un Lote y un Pedido compatibles.</li>
              <li><strong>Transacción:</strong> operación comercial resultante de un Match aceptado por ambas partes, gestionada a través de Stripe Connect.</li>
            </ul>
          </section>

          {/* ── 4. REGISTRO Y VERIFICACIÓN ──────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Registro, verificación y cuenta de usuario</h2>
            <h3 className="text-base font-medium text-gray-900">4.1. Requisitos de registro</h3>
            <p>
              Solo pueden registrarse en la Plataforma personas jurídicas y empresarios individuales dados de
              alta en el Censo de Actividades Económicas. El usuario debe proporcionar datos veraces y
              actualizados, incluyendo razón social, CIF/NIF, domicilio fiscal y datos de contacto.
            </p>
            <h3 className="text-base font-medium text-gray-900">4.2. Proceso de verificación</h3>
            <p>
              Tras el registro, los Compradores quedarán activos tras verificar su correo electrónico. Los
              Vendedores serán sometidos a una verificación manual adicional que incluye la revisión de la
              documentación aportada. Primar-IA se reserva el derecho de rechazar o suspender cualquier cuenta
              que no supere la verificación o que incumpla estas Condiciones.
            </p>
            <h3 className="text-base font-medium text-gray-900">4.3. Responsabilidad del usuario</h3>
            <p>
              El usuario es responsable de la custodia de sus credenciales de acceso y de toda actividad
              realizada bajo su cuenta. Deberá notificar de inmediato a info@primar-ia.com cualquier uso no
              autorizado o brecha de seguridad.
            </p>
          </section>

          {/* ── 5. FUNCIONAMIENTO DE LA PLATAFORMA ────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Funcionamiento de la Plataforma</h2>
            <h3 className="text-base font-medium text-gray-900">5.1. Publicación de Lotes y Pedidos</h3>
            <p>
              Los Vendedores pueden publicar Lotes con información detallada del producto (tipo, variedad,
              calibre, peso, precio por kilogramo, fecha de disponibilidad). Los Compradores pueden publicar
              Pedidos con los requisitos del producto que necesitan. Ambas partes se comprometen a que la
              información publicada sea veraz, completa y actualizada.
            </p>
            <h3 className="text-base font-medium text-gray-900">5.2. Sistema de Matching</h3>
            <p>
              La Plataforma utiliza un algoritmo de matching que propone vinculaciones entre Lotes y Pedidos
              compatibles basándose en criterios de producto, variedad, calibre, precio, disponibilidad,
              proximidad geográfica e historial de usuario. Las propuestas de Match no son vinculantes hasta
              que ambas partes las acepten expresamente.
            </p>
            <h3 className="text-base font-medium text-gray-900">5.3. Confirmación de entrega (código QR)</h3>
            <p>
              Una vez acordada una Transacción, se genera un código QR único y de un solo uso, protegido
              criptográficamente (HMAC-SHA256), con validez de 48 horas. La lectura del código QR por el
              Comprador en el momento de la entrega confirma la recepción del producto y autoriza la
              captura del pago preautorizado.
            </p>
          </section>

          {/* ── 6. PAGOS Y COMISIONES ─────────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Pagos, comisiones y facturación</h2>
            <h3 className="text-base font-medium text-gray-900">6.1. Procesamiento de pagos</h3>
            <p>
              Todos los pagos se procesan a través de <strong>Stripe Connect</strong> mediante cuentas Express.
              Primar-IA no almacena ni tiene acceso directo a datos de tarjetas de crédito ni a fondos de los
              usuarios. Stripe es responsable del cumplimiento PCI-DSS y de los procedimientos KYC/AML
              aplicables.
            </p>
            <h3 className="text-base font-medium text-gray-900">6.2. Comisión de la Plataforma</h3>
            <p>
              Primar-IA aplica una comisión sobre el importe de cada Transacción, que es abonada exclusivamente
              por el <strong>Comprador</strong>, según la siguiente escala progresiva:
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 border-b border-border">Importe de la operación</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 border-b border-border">Comisión tarjeta</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600 border-b border-border">Comisión SEPA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="px-4 py-2 border-b border-border">Hasta 2.000 €</td><td className="px-4 py-2 border-b border-border">4,0 %</td><td className="px-4 py-2 border-b border-border">3,6 %</td></tr>
                  <tr><td className="px-4 py-2 border-b border-border">De 2.001 € a 10.000 €</td><td className="px-4 py-2 border-b border-border">3,0 %</td><td className="px-4 py-2 border-b border-border">2,6 %</td></tr>
                  <tr><td className="px-4 py-2 border-b border-border">De 10.001 € a 50.000 €</td><td className="px-4 py-2 border-b border-border">2,2 % (mín. 49 € / máx. 2.500 €)</td><td className="px-4 py-2 border-b border-border">1,8 % (mín. 49 € / máx. 2.500 €)</td></tr>
                  <tr><td className="px-4 py-2">Más de 50.000 €</td><td className="px-4 py-2">2,0 %</td><td className="px-4 py-2">1,6 %</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-secondary mt-2">
              El pago mediante domiciliación bancaria SEPA tiene un descuento de 0,4 puntos porcentuales
              respecto al pago con tarjeta.
            </p>
            <h3 className="text-base font-medium text-gray-900">6.3. Preautorización y captura</h3>
            <p>
              El importe de la Transacción (precio del producto + comisión) se preautoriza en el método de
              pago del Comprador en el momento de la confirmación del Match. La captura efectiva del pago
              solo se produce tras la confirmación de entrega mediante el código QR. Si la entrega no se
              confirma en el plazo establecido, la preautorización se cancela automáticamente.
            </p>
          </section>

          {/* ── 7. COMUNICACIONES Y BYPASS ────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">7. Comunicaciones entre usuarios</h2>
            <p>
              La Plataforma pone a disposición de los usuarios un sistema de mensajería interna para
              facilitar la comunicación relativa a Transacciones en curso. Queda expresamente prohibido:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Compartir datos de contacto directo (teléfono, email, direcciones de mensajería externa) con el fin de eludir el uso de la Plataforma.</li>
              <li>Proponer o cerrar operaciones comerciales fuera de la Plataforma para evitar el pago de comisiones.</li>
              <li>Enviar contenido publicitario, difamatorio, ilegal o que vulnere derechos de terceros.</li>
            </ul>
            <p>
              Primar-IA dispone de un sistema automatizado de detección de intentos de bypass que puede
              restringir mensajes que contengan patrones sospechosos. La reiteración en conductas evasivas
              podrá dar lugar a la suspensión o cancelación de la cuenta.
            </p>
          </section>

          {/* ── 8. DISPUTAS Y RESOLUCIÓN ──────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">8. Disputas y resolución de conflictos</h2>
            <p>
              En caso de disconformidad con el producto recibido, el Comprador podrá abrir una disputa a
              través de la Plataforma en un plazo máximo de 48 horas tras la confirmación de entrega. El
              equipo de Primar-IA mediará entre las partes y, si no se alcanza un acuerdo, podrá proceder al
              reembolso total o parcial del importe al Comprador.
            </p>
            <p>
              Las partes se comprometen a actuar de buena fe en la resolución de controversias. La
              Plataforma actúa como intermediaria y no es parte en los contratos de compraventa entre
              Vendedor y Comprador.
            </p>
          </section>

          {/* ── 9. PROPIEDAD INTELECTUAL ──────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">9. Propiedad intelectual e industrial</h2>
            <p>
              Todos los contenidos de la Plataforma (textos, diseños, logotipos, software, algoritmos, bases
              de datos) son propiedad de Primar-IA Lonja Digital S.L. o de sus licenciantes, y están protegidos
              por la legislación española e internacional sobre propiedad intelectual e industrial (Real Decreto
              Legislativo 1/1996, Ley 17/2001).
            </p>
            <p>
              El usuario conserva la titularidad de los contenidos que publique (descripciones de producto,
              fotografías, certificados) y otorga a Primar-IA una licencia no exclusiva, mundial y por la
              duración de su cuenta, para mostrar dichos contenidos en la Plataforma y en comunicaciones
              comerciales relacionadas.
            </p>
          </section>

          {/* ── 10. LIMITACIÓN DE RESPONSABILIDAD ─────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">10. Limitación de responsabilidad</h2>
            <p>Primar-IA no será responsable de:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>La calidad, seguridad alimentaria, estado fitosanitario o conformidad del producto comercializado entre usuarios. Cada Vendedor es único responsable del cumplimiento de la normativa aplicable a sus productos.</li>
              <li>La veracidad de la información proporcionada por los usuarios en sus perfiles, Lotes o Pedidos.</li>
              <li>Los daños derivados de interrupciones, errores técnicos o fallos de seguridad ajenos al control razonable de la Plataforma.</li>
              <li>Las consecuencias fiscales o tributarias derivadas de las operaciones realizadas entre usuarios.</li>
            </ul>
            <p>
              La responsabilidad total acumulada de Primar-IA frente a cualquier usuario en un período de
              12 meses no excederá el importe total de las comisiones abonadas por dicho usuario durante
              el mismo período.
            </p>
          </section>

          {/* ── 11. PROTECCIÓN DE DATOS ────────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">11. Protección de datos personales</h2>
            <p>
              El tratamiento de datos personales se rige por el Reglamento (UE) 2016/679 (RGPD) y la
              Ley Orgánica 3/2018 (LOPDGDD). Para más información, consulte nuestra{' '}
              <Link href="/privacy" className="font-semibold text-gray-900 underline">Política de Privacidad</Link>.
            </p>
          </section>

          {/* ── 12. MODIFICACIONES ─────────────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">12. Modificación de las Condiciones</h2>
            <p>
              Primar-IA se reserva el derecho de modificar las presentes Condiciones en cualquier momento.
              Las modificaciones sustanciales se comunicarán a los usuarios registrados con un preaviso mínimo
              de 30 días naturales a través del correo electrónico asociado a su cuenta, conforme al artículo
              3 del Reglamento (UE) 2019/1150 (P2B).
            </p>
            <p>
              El uso continuado de la Plataforma tras la entrada en vigor de las modificaciones implica la
              aceptación de las nuevas Condiciones.
            </p>
          </section>

          {/* ── 13. SUSPENSIÓN Y BAJA ──────────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">13. Suspensión y baja de la cuenta</h2>
            <p>
              Primar-IA podrá suspender o cancelar la cuenta de un usuario que incumpla estas Condiciones,
              realice actividades fraudulentas o perjudique el funcionamiento de la Plataforma. En caso de
              suspensión, se informará al usuario por escrito de los motivos, salvo obligación legal en
              contrario.
            </p>
            <p>
              El usuario podrá solicitar la baja de su cuenta en cualquier momento enviando un correo a
              info@primar-ia.com. Las Transacciones en curso deberán completarse o cancelarse de mutuo
              acuerdo antes de la baja efectiva.
            </p>
          </section>

          {/* ── 14. LEGISLACIÓN Y JURISDICCIÓN ─────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">14. Legislación aplicable y jurisdicción</h2>
            <p>
              Las presentes Condiciones se rigen por la legislación española. Para la resolución de cualquier
              controversia derivada del uso de la Plataforma, las partes se someten a la jurisdicción de los
              Juzgados y Tribunales de la ciudad de Alicante, con renuncia expresa a cualquier otro fuero
              que pudiera corresponderles.
            </p>
            <p>
              No obstante, conforme al Reglamento (UE) 524/2013, se informa de la existencia de la
              plataforma de resolución de litigios en línea de la Comisión Europea:{' '}
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-gray-900 underline"
              >
                https://ec.europa.eu/consumers/odr
              </a>
            </p>
          </section>

          {/* ── 15. CONTACTO ───────────────────────────────────────────────── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">15. Contacto</h2>
            <p>
              Para cualquier consulta relacionada con estas Condiciones, puede dirigirse a:
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
            <Link href="/terms" className="hover:text-gray-900 transition-colors font-medium">Términos y Condiciones</Link>
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Política de Privacidad</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
