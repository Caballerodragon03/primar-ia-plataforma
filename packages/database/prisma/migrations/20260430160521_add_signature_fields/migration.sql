-- AlterTable
ALTER TABLE "transacciones" ADD COLUMN     "firma_comprador" TEXT,
ADD COLUMN     "firma_comprador_fecha" TIMESTAMP(3),
ADD COLUMN     "firma_vendedor" TEXT,
ADD COLUMN     "firma_vendedor_fecha" TIMESTAMP(3),
ADD COLUMN     "fotos_lote_urls" JSONB;
