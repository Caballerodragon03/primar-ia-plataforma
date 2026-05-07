/*
  Warnings:

  - You are about to drop the column `plan` on the `suscripciones` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PlanVendedor" AS ENUM ('COSECHA', 'CAMPO', 'FINCA');

-- CreateEnum
CREATE TYPE "PlanComprador" AS ENUM ('MERCADO', 'LONJA', 'CENTRAL');

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "visible_desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "suscripciones" DROP COLUMN "plan",
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "plan_comprador" "PlanComprador",
ADD COLUMN     "plan_vendedor" "PlanVendedor",
ADD COLUMN     "stripe_price_id" TEXT,
ADD COLUMN     "trial_ends_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "historial_cosechas" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "variedad_id" TEXT,
    "temporada" TEXT NOT NULL,
    "calibres" JSONB NOT NULL,
    "archivo_excel_url" TEXT,
    "estimacion_proxima" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historial_cosechas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historial_cosechas_user_id_producto_id_idx" ON "historial_cosechas"("user_id", "producto_id");

-- AddForeignKey
ALTER TABLE "historial_cosechas" ADD CONSTRAINT "historial_cosechas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_cosechas" ADD CONSTRAINT "historial_cosechas_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_cosechas" ADD CONSTRAINT "historial_cosechas_variedad_id_fkey" FOREIGN KEY ("variedad_id") REFERENCES "variedades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
