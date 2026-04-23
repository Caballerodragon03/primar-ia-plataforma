-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('VENDEDOR', 'COMPRADOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserEstado" AS ENUM ('EMAIL_NO_VERIFICADO', 'EMAIL_VERIFICADO', 'PENDIENTE_VERIFICACION', 'VERIFICADO_ACTIVO', 'RECHAZADO', 'PENDIENTE_ACLARACION', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "CertificadoEstado" AS ENUM ('PENDIENTE', 'VERIFICADO', 'RECHAZADO', 'CADUCADO');

-- CreateEnum
CREATE TYPE "LoteTipo" AS ENUM ('VENTA_DIRECTA', 'SUBASTA');

-- CreateEnum
CREATE TYPE "LoteEstado" AS ENUM ('BORRADOR', 'ACTIVO', 'PARCIALMENTE_VENDIDO', 'VENDIDO', 'EXPIRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PedidoEstado" AS ENUM ('BORRADOR', 'ACTIVO', 'PARCIALMENTE_CUBIERTO', 'TOTALMENTE_CUBIERTO', 'CERRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "MatchEstado" AS ENUM ('PROPUESTO', 'ENVIADO_VENDEDOR', 'ACEPTADO_VENDEDOR', 'RECHAZADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "Incoterm" AS ENUM ('EXW', 'FCA', 'FOB', 'CIF', 'DAP', 'DDP', 'FAS', 'CFR', 'CPT', 'CIP', 'DAT', 'DPU');

-- CreateEnum
CREATE TYPE "TransaccionEstado" AS ENUM ('PENDIENTE_PAGO', 'PAGO_CAPTURADO', 'EN_TRANSITO', 'ENTREGADO', 'EN_DISPUTA', 'COMPLETADO', 'CANCELADO', 'REEMBOLSADO');

-- CreateEnum
CREATE TYPE "MensajeTipo" AS ENUM ('TEXTO', 'IMAGEN', 'DOCUMENTO');

-- CreateEnum
CREATE TYPE "ValoracionEstado" AS ENUM ('PUBLICADA', 'PENDIENTE_REVISION', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "ValoracionTipo" AS ENUM ('VENDEDOR_A_COMPRADOR', 'COMPRADOR_A_VENDEDOR');

-- CreateEnum
CREATE TYPE "DisputaTipo" AS ENUM ('CALIDAD', 'CANTIDAD', 'EMPAQUETADO', 'CALIBRES', 'PRODUCTO_DIFERENTE', 'OTRO');

-- CreateEnum
CREATE TYPE "DisputaEstado" AS ENUM ('ABIERTA', 'RESPUESTA_VENDEDOR', 'EN_REVISION', 'RESUELTA');

-- CreateEnum
CREATE TYPE "DisputaResolucion" AS ENUM ('FAVOR_COMPRADOR', 'FAVOR_VENDEDOR', 'PARCIAL', 'ACUERDO_PARTES');

-- CreateEnum
CREATE TYPE "Tendencia" AS ENUM ('UP', 'DOWN', 'STABLE');

-- CreateEnum
CREATE TYPE "SuscripcionEstado" AS ENUM ('ACTIVA', 'CANCELADA', 'PAUSADA', 'TRIAL');

-- CreateEnum
CREATE TYPE "Idioma" AS ENUM ('ES', 'EN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "estado" "UserEstado" NOT NULL DEFAULT 'EMAIL_NO_VERIFICADO',
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "telefono" TEXT,
    "foto_perfil_url" TEXT,
    "idioma" "Idioma" NOT NULL DEFAULT 'ES',
    "preferencias_notificaciones" JSONB,
    "login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "razon_social" TEXT NOT NULL,
    "cif_nif" TEXT NOT NULL,
    "forma_juridica" TEXT,
    "direccion_fiscal" TEXT NOT NULL,
    "ciudad" TEXT,
    "codigo_postal" TEXT,
    "pais" TEXT NOT NULL DEFAULT 'ES',
    "persona_contacto_legal" TEXT NOT NULL,
    "cargo_contacto_legal" TEXT NOT NULL,
    "stripe_account_id" TEXT,
    "stripe_onboarding_done" BOOLEAN NOT NULL DEFAULT false,
    "stripe_customer_id" TEXT,
    "descripcion" TEXT,
    "fotos_urls" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificados" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "numero_certificado" TEXT NOT NULL,
    "fecha_emision" TIMESTAMP(3) NOT NULL,
    "fecha_caducidad" TIMESTAMP(3) NOT NULL,
    "archivo_url" TEXT NOT NULL,
    "archivo_hash_sha256" TEXT NOT NULL,
    "estado" "CertificadoEstado" NOT NULL DEFAULT 'PENDIENTE',
    "admin_verificador_id" TEXT,
    "fecha_verificacion" TIMESTAMP(3),
    "notas_verificacion" TEXT,
    "alerta_60_enviada" BOOLEAN NOT NULL DEFAULT false,
    "alerta_30_enviada" BOOLEAN NOT NULL DEFAULT false,
    "alerta_15_enviada" BOOLEAN NOT NULL DEFAULT false,
    "alerta_7_enviada" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "imagen" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variedades" (
    "id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variedades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes" (
    "id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "variedad_id" TEXT,
    "tipo" "LoteTipo" NOT NULL,
    "calibres" JSONB NOT NULL,
    "datos_historicos" JSONB,
    "direccion_recogida" TEXT NOT NULL,
    "coordenadas_lat" DOUBLE PRECISION,
    "coordenadas_lng" DOUBLE PRECISION,
    "fecha_disponibilidad" TIMESTAMP(3) NOT NULL,
    "certificaciones" JSONB,
    "fotos_urls" JSONB,
    "comentarios_adicionales" TEXT,
    "estado" "LoteEstado" NOT NULL DEFAULT 'BORRADOR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "comprador_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "variedad_id" TEXT,
    "calibres_solicitados" JSONB NOT NULL,
    "incoterm" "Incoterm" NOT NULL,
    "destino_final" TEXT,
    "frecuencia" TEXT,
    "transporte" TEXT,
    "costo_logistica_estimado" DECIMAL(10,2),
    "fecha_entrega_deseada" TIMESTAMP(3) NOT NULL,
    "notas_adicionales" TEXT,
    "estado" "PedidoEstado" NOT NULL DEFAULT 'BORRADOR',
    "stripe_payment_intent_id" TEXT,
    "contrato_pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "lote_id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "cantidad_kg" DECIMAL(10,2) NOT NULL,
    "precio_kg" DECIMAL(10,4) NOT NULL,
    "calibres_json" JSONB NOT NULL,
    "estado" "MatchEstado" NOT NULL DEFAULT 'PROPUESTO',
    "score_matching" DOUBLE PRECISION,
    "score_detalle" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacciones" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "comprador_id" TEXT NOT NULL,
    "cantidad_kg" DECIMAL(10,2) NOT NULL,
    "precio_total" DECIMAL(12,2) NOT NULL,
    "comision_plataforma" DECIMAL(10,2) NOT NULL,
    "comision_porcentaje" DECIMAL(5,4) NOT NULL,
    "metodo_pago" TEXT,
    "stripe_payment_intent_id" TEXT,
    "stripe_transfer_id" TEXT,
    "estado" "TransaccionEstado" NOT NULL DEFAULT 'PENDIENTE_PAGO',
    "qr_token" TEXT,
    "qr_usado" BOOLEAN NOT NULL DEFAULT false,
    "qr_fecha_uso" TIMESTAMP(3),
    "contrato_pdf_url" TEXT,
    "factura_plataforma_url" TEXT,
    "factura_vendedor_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transacciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" TEXT NOT NULL,
    "transaccion_id" TEXT NOT NULL,
    "remitente_id" TEXT NOT NULL,
    "contenido" VARCHAR(2000) NOT NULL,
    "tipo" "MensajeTipo" NOT NULL DEFAULT 'TEXTO',
    "archivo_url" TEXT,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "intento_bypass" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valoraciones" (
    "id" TEXT NOT NULL,
    "transaccion_id" TEXT NOT NULL,
    "autor_id" TEXT NOT NULL,
    "destinatario_id" TEXT NOT NULL,
    "tipo" "ValoracionTipo" NOT NULL,
    "calidad" SMALLINT NOT NULL,
    "puntualidad" SMALLINT NOT NULL,
    "comunicacion" SMALLINT NOT NULL,
    "empaquetado" SMALLINT,
    "profesionalidad" SMALLINT,
    "comentario" VARCHAR(500),
    "estado" "ValoracionEstado" NOT NULL DEFAULT 'PUBLICADA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "valoraciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputas" (
    "id" TEXT NOT NULL,
    "transaccion_id" TEXT NOT NULL,
    "abierta_por_id" TEXT NOT NULL,
    "tipo_problema" "DisputaTipo" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "evidencias_urls" JSONB NOT NULL,
    "respuesta_vendedor" TEXT,
    "evidencias_vendedor_urls" JSONB,
    "resolucion" "DisputaResolucion",
    "porcentaje_comprador" DECIMAL(5,2),
    "porcentaje_vendedor" DECIMAL(5,2),
    "admin_id" TEXT,
    "notas_admin" TEXT,
    "estado" "DisputaEstado" NOT NULL DEFAULT 'ABIERTA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datos_mercado" (
    "id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "variedad_id" TEXT,
    "precio_medio_mes" DECIMAL(10,4) NOT NULL,
    "volumen_total_mes" DECIMAL(12,2) NOT NULL,
    "tendencia" "Tendencia" NOT NULL,
    "variedad_mas_vendida" TEXT,
    "fecha_calculo" DATE NOT NULL,
    "num_transacciones_base" INTEGER NOT NULL,

    CONSTRAINT "datos_mercado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suscripciones" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "stripe_subscription_id" TEXT,
    "stripe_customer_id" TEXT,
    "estado" "SuscripcionEstado" NOT NULL DEFAULT 'ACTIVA',
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "device_info" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT,
    "datos" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_role_estado_idx" ON "users"("role", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_user_id_key" ON "empresas"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cif_nif_key" ON "empresas"("cif_nif");

-- CreateIndex
CREATE INDEX "empresas_cif_nif_idx" ON "empresas"("cif_nif");

-- CreateIndex
CREATE INDEX "empresas_stripe_account_id_idx" ON "empresas"("stripe_account_id");

-- CreateIndex
CREATE INDEX "certificados_user_id_estado_idx" ON "certificados"("user_id", "estado");

-- CreateIndex
CREATE INDEX "certificados_fecha_caducidad_estado_idx" ON "certificados"("fecha_caducidad", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "productos_nombre_key" ON "productos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "variedades_producto_id_nombre_key" ON "variedades"("producto_id", "nombre");

-- CreateIndex
CREATE INDEX "lotes_vendedor_id_estado_idx" ON "lotes"("vendedor_id", "estado");

-- CreateIndex
CREATE INDEX "lotes_producto_id_estado_idx" ON "lotes"("producto_id", "estado");

-- CreateIndex
CREATE INDEX "lotes_fecha_disponibilidad_idx" ON "lotes"("fecha_disponibilidad");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_stripe_payment_intent_id_key" ON "pedidos"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "pedidos_comprador_id_estado_idx" ON "pedidos"("comprador_id", "estado");

-- CreateIndex
CREATE INDEX "pedidos_producto_id_estado_idx" ON "pedidos"("producto_id", "estado");

-- CreateIndex
CREATE INDEX "matches_lote_id_estado_idx" ON "matches"("lote_id", "estado");

-- CreateIndex
CREATE INDEX "matches_pedido_id_estado_idx" ON "matches"("pedido_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "matches_lote_id_pedido_id_key" ON "matches"("lote_id", "pedido_id");

-- CreateIndex
CREATE UNIQUE INDEX "transacciones_match_id_key" ON "transacciones"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "transacciones_stripe_payment_intent_id_key" ON "transacciones"("stripe_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "transacciones_qr_token_key" ON "transacciones"("qr_token");

-- CreateIndex
CREATE INDEX "transacciones_vendedor_id_estado_idx" ON "transacciones"("vendedor_id", "estado");

-- CreateIndex
CREATE INDEX "transacciones_comprador_id_estado_idx" ON "transacciones"("comprador_id", "estado");

-- CreateIndex
CREATE INDEX "transacciones_estado_idx" ON "transacciones"("estado");

-- CreateIndex
CREATE INDEX "mensajes_transaccion_id_created_at_idx" ON "mensajes"("transaccion_id", "created_at");

-- CreateIndex
CREATE INDEX "mensajes_remitente_id_leido_idx" ON "mensajes"("remitente_id", "leido");

-- CreateIndex
CREATE INDEX "valoraciones_destinatario_id_estado_idx" ON "valoraciones"("destinatario_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "valoraciones_transaccion_id_autor_id_key" ON "valoraciones"("transaccion_id", "autor_id");

-- CreateIndex
CREATE INDEX "disputas_transaccion_id_idx" ON "disputas"("transaccion_id");

-- CreateIndex
CREATE INDEX "disputas_estado_idx" ON "disputas"("estado");

-- CreateIndex
CREATE INDEX "datos_mercado_fecha_calculo_idx" ON "datos_mercado"("fecha_calculo");

-- CreateIndex
CREATE UNIQUE INDEX "datos_mercado_producto_id_variedad_id_fecha_calculo_key" ON "datos_mercado"("producto_id", "variedad_id", "fecha_calculo");

-- CreateIndex
CREATE UNIQUE INDEX "suscripciones_user_id_key" ON "suscripciones"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "suscripciones_stripe_subscription_id_key" ON "suscripciones"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_tokens_token_key" ON "email_tokens"("token");

-- CreateIndex
CREATE INDEX "email_tokens_user_id_idx" ON "email_tokens"("user_id");

-- CreateIndex
CREATE INDEX "email_tokens_expires_at_idx" ON "email_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "auditoria_user_id_idx" ON "auditoria"("user_id");

-- CreateIndex
CREATE INDEX "auditoria_entidad_entidad_id_idx" ON "auditoria"("entidad", "entidad_id");

-- CreateIndex
CREATE INDEX "auditoria_created_at_idx" ON "auditoria"("created_at");

-- AddForeignKey
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_admin_verificador_id_fkey" FOREIGN KEY ("admin_verificador_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variedades" ADD CONSTRAINT "variedades_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_variedad_id_fkey" FOREIGN KEY ("variedad_id") REFERENCES "variedades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_variedad_id_fkey" FOREIGN KEY ("variedad_id") REFERENCES "variedades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_transaccion_id_fkey" FOREIGN KEY ("transaccion_id") REFERENCES "transacciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_remitente_id_fkey" FOREIGN KEY ("remitente_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valoraciones" ADD CONSTRAINT "valoraciones_transaccion_id_fkey" FOREIGN KEY ("transaccion_id") REFERENCES "transacciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valoraciones" ADD CONSTRAINT "valoraciones_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valoraciones" ADD CONSTRAINT "valoraciones_destinatario_id_fkey" FOREIGN KEY ("destinatario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputas" ADD CONSTRAINT "disputas_transaccion_id_fkey" FOREIGN KEY ("transaccion_id") REFERENCES "transacciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputas" ADD CONSTRAINT "disputas_abierta_por_id_fkey" FOREIGN KEY ("abierta_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputas" ADD CONSTRAINT "disputas_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datos_mercado" ADD CONSTRAINT "datos_mercado_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datos_mercado" ADD CONSTRAINT "datos_mercado_variedad_id_fkey" FOREIGN KEY ("variedad_id") REFERENCES "variedades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
