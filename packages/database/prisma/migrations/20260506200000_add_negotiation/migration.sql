-- CreateEnum
CREATE TYPE "NegociacionEstado" AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'SUPERADA');

-- AlterEnum
ALTER TYPE "MensajeTipo" ADD VALUE 'OFERTA';

-- AlterTable
ALTER TABLE "mensajes" ADD COLUMN     "negociacion_id" TEXT;

-- CreateTable
CREATE TABLE "negociaciones" (
    "id" TEXT NOT NULL,
    "transaccion_id" TEXT NOT NULL,
    "iniciador_id" TEXT NOT NULL,
    "precio_kg" DECIMAL(10,4),
    "incoterm" "Incoterm",
    "estado" "NegociacionEstado" NOT NULL DEFAULT 'PENDIENTE',
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "negociaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "negociaciones_transaccion_id_idx" ON "negociaciones"("transaccion_id");

-- CreateIndex
CREATE UNIQUE INDEX "mensajes_negociacion_id_key" ON "mensajes"("negociacion_id");

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_negociacion_id_fkey" FOREIGN KEY ("negociacion_id") REFERENCES "negociaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negociaciones" ADD CONSTRAINT "negociaciones_transaccion_id_fkey" FOREIGN KEY ("transaccion_id") REFERENCES "transacciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negociaciones" ADD CONSTRAINT "negociaciones_iniciador_id_fkey" FOREIGN KEY ("iniciador_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negociaciones" ADD CONSTRAINT "negociaciones_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "negociaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
