-- AlterTable
ALTER TABLE "negociaciones" ADD COLUMN     "calibres_json" JSONB,
ADD COLUMN     "logistica" "LogisticaPreferencia",
ADD COLUMN     "termino_pago" "TerminoPago";
