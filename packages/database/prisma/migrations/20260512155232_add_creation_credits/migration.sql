-- AlterTable
ALTER TABLE "users" ADD COLUMN     "creditos_creacion" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "proxima_regeneracion_credito" TIMESTAMP(3);
