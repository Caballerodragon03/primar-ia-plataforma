-- CreateEnum
CREATE TYPE "BugReportEstado" AS ENUM ('NUEVO', 'EN_PROGRESO', 'RESUELTO', 'DESCARTADO');

-- CreateTable
CREATE TABLE "bug_reports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "url" TEXT,
    "descripcion" TEXT NOT NULL,
    "captura_url" TEXT,
    "user_agent" TEXT,
    "estado" "BugReportEstado" NOT NULL DEFAULT 'NUEVO',
    "admin_notas" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bug_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bug_reports_estado_idx" ON "bug_reports"("estado");

-- CreateIndex
CREATE INDEX "bug_reports_created_at_idx" ON "bug_reports"("created_at");
