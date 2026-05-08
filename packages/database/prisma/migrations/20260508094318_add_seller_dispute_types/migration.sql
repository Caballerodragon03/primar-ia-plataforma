-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DisputaTipo" ADD VALUE 'RETRASO_ENTREGA';
ALTER TYPE "DisputaTipo" ADD VALUE 'PAGO_NO_RECIBIDO';
ALTER TYPE "DisputaTipo" ADD VALUE 'COMPRADOR_NO_RESPONDE';
ALTER TYPE "DisputaTipo" ADD VALUE 'RECHAZO_INJUSTIFICADO';
ALTER TYPE "DisputaTipo" ADD VALUE 'LOGISTICA';
ALTER TYPE "DisputaTipo" ADD VALUE 'DATOS_INCORRECTOS';
ALTER TYPE "DisputaTipo" ADD VALUE 'CANCELACION_COMPRADOR';
