-- CreateEnum
CREATE TYPE "LogisticaPreferencia" AS ENUM ('YO_ENVIO', 'OTRO_RECOGE', 'INDIFERENTE');

-- CreateEnum
CREATE TYPE "TerminoPago" AS ENUM ('INMEDIATO', 'DIAS_30', 'DIAS_60');

-- CreateEnum
CREATE TYPE "RegimenFiscal" AS ENUM ('GENERAL', 'AGRARIO', 'RECARGO_EQUIVALENCIA', 'EXENTO');

-- CreateEnum
CREATE TYPE "ContratoEstado" AS ENUM ('BORRADOR', 'PENDIENTE_FIRMA_VENDEDOR', 'PENDIENTE_PAGO_COMPRADOR', 'FIRMADO', 'CADUCADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "BypassAlertEstado" AS ENUM ('PENDIENTE', 'AVISADO', 'BANEADO', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "CancelacionEstado" AS ENUM ('PENDIENTE', 'INVESTIGADA', 'AVISADO', 'SUSPENDIDO');

-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "iban" TEXT,
ADD COLUMN     "regimen_fiscal" "RegimenFiscal" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "swift_bic" TEXT;

-- AlterTable
ALTER TABLE "lotes" ADD COLUMN     "incoterms_aceptados" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "logistica" "LogisticaPreferencia" NOT NULL DEFAULT 'INDIFERENTE',
ADD COLUMN     "terminos_pago_aceptados" JSONB NOT NULL DEFAULT '["INMEDIATO"]';

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "cancelado_en" TIMESTAMP(3),
ADD COLUMN     "cancelado_por" TEXT,
ADD COLUMN     "comision_estimada" DECIMAL(10,2),
ADD COLUMN     "comision_porcentaje" DECIMAL(6,5),
ADD COLUMN     "contrato_borrador_url" TEXT,
ADD COLUMN     "contrato_estado" "ContratoEstado" NOT NULL DEFAULT 'BORRADOR',
ADD COLUMN     "firma_vendedor_deadline" TIMESTAMP(3),
ADD COLUMN     "incoterm_final" "Incoterm",
ADD COLUMN     "logistica_final" "LogisticaPreferencia",
ADD COLUMN     "motivo_cancelacion" VARCHAR(500),
ADD COLUMN     "precio_kg_final" DECIMAL(10,4),
ADD COLUMN     "termino_pago_final" "TerminoPago";

-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "incoterms_aceptados" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "logistica" "LogisticaPreferencia" NOT NULL DEFAULT 'INDIFERENTE',
ADD COLUMN     "terminos_pago_aceptados" JSONB NOT NULL DEFAULT '["INMEDIATO"]';

-- AlterTable
ALTER TABLE "transacciones" ADD COLUMN     "comision_pagada_en" TIMESTAMP(3),
ADD COLUMN     "comision_stripe_charge_id" TEXT,
ADD COLUMN     "enviado_en" TIMESTAMP(3),
ADD COLUMN     "recibido_en" TIMESTAMP(3),
ADD COLUMN     "resguardo_pago_url" TEXT,
ADD COLUMN     "vencimiento_pago_vendedor" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "bypass_alerts" (
    "id" TEXT NOT NULL,
    "mensaje_id" TEXT NOT NULL,
    "remitente_id" TEXT NOT NULL,
    "receptor_id" TEXT,
    "score" INTEGER NOT NULL,
    "patrones" JSONB NOT NULL,
    "extracto" VARCHAR(500),
    "estado" "BypassAlertEstado" NOT NULL DEFAULT 'PENDIENTE',
    "accion_tomada" TEXT,
    "admin_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bypass_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancelaciones_sospechosas" (
    "id" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "comprador_id" TEXT NOT NULL,
    "total_cancelaciones" INTEGER NOT NULL DEFAULT 1,
    "ultima_cancelacion_at" TIMESTAMP(3) NOT NULL,
    "estado" "CancelacionEstado" NOT NULL DEFAULT 'PENDIENTE',
    "accion_tomada" TEXT,
    "admin_id" TEXT,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cancelaciones_sospechosas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bypass_alerts_mensaje_id_key" ON "bypass_alerts"("mensaje_id");

-- CreateIndex
CREATE INDEX "bypass_alerts_estado_created_at_idx" ON "bypass_alerts"("estado", "created_at");

-- CreateIndex
CREATE INDEX "bypass_alerts_remitente_id_idx" ON "bypass_alerts"("remitente_id");

-- CreateIndex
CREATE INDEX "cancelaciones_sospechosas_estado_ultima_cancelacion_at_idx" ON "cancelaciones_sospechosas"("estado", "ultima_cancelacion_at");

-- CreateIndex
CREATE UNIQUE INDEX "cancelaciones_sospechosas_vendedor_id_comprador_id_key" ON "cancelaciones_sospechosas"("vendedor_id", "comprador_id");

-- CreateIndex
CREATE INDEX "matches_contrato_estado_firma_vendedor_deadline_idx" ON "matches"("contrato_estado", "firma_vendedor_deadline");
