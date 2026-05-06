-- CreateEnum
CREATE TYPE "ScoreStatus" AS ENUM ('NEW_USER', 'ACTIVE', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "ScoreEventTipo" AS ENUM ('PRIMERA_TRANSACCION', 'TRANSACCION_OK', 'INCIDENCIA_ABIERTA', 'DISPUTA_RESUELTA_CONTRA', 'DISPUTA_RESUELTA_FAVOR', 'RATING_RECIBIDO', 'ADMIN_PENALIZACION', 'ADMIN_INCENTIVO');

-- AlterTable
ALTER TABLE "disputas" ADD COLUMN     "incentivo_comprador" DECIMAL(5,2),
ADD COLUMN     "incentivo_vendedor" DECIMAL(5,2),
ADD COLUMN     "penalizacion_comprador" DECIMAL(5,2),
ADD COLUMN     "penalizacion_vendedor" DECIMAL(5,2),
ADD COLUMN     "suscripcion_gratis_user_id" TEXT;

-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "destino_lat" DOUBLE PRECISION,
ADD COLUMN     "destino_lng" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "suscripciones" ADD COLUMN     "como_compensacion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "compensacion_meses" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "num_valoraciones" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rating_medio" DECIMAL(3,2),
ADD COLUMN     "score_fiabilidad" DECIMAL(5,2),
ADD COLUMN     "score_status" "ScoreStatus" NOT NULL DEFAULT 'NEW_USER',
ADD COLUMN     "transacciones_incid" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "transacciones_ok" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "score_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tipo" "ScoreEventTipo" NOT NULL,
    "delta" DECIMAL(6,2) NOT NULL,
    "score_antes" DECIMAL(5,2),
    "score_despues" DECIMAL(5,2) NOT NULL,
    "motivo" TEXT,
    "referencia_tipo" TEXT,
    "referencia_id" TEXT,
    "admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputa_mensajes" (
    "id" TEXT NOT NULL,
    "disputa_id" TEXT NOT NULL,
    "autor_id" TEXT NOT NULL,
    "contenido" VARCHAR(2000) NOT NULL,
    "archivo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disputa_mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "score_events_user_id_idx" ON "score_events"("user_id");

-- CreateIndex
CREATE INDEX "score_events_created_at_idx" ON "score_events"("created_at");

-- CreateIndex
CREATE INDEX "disputa_mensajes_disputa_id_created_at_idx" ON "disputa_mensajes"("disputa_id", "created_at");

-- AddForeignKey
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputa_mensajes" ADD CONSTRAINT "disputa_mensajes_disputa_id_fkey" FOREIGN KEY ("disputa_id") REFERENCES "disputas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputa_mensajes" ADD CONSTRAINT "disputa_mensajes_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
