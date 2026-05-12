-- CreateTable
CREATE TABLE "market_reports" (
    "id" TEXT NOT NULL,
    "semana" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "highlights" JSONB,
    "fuente_url" TEXT NOT NULL,
    "pdf_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "market_reports_semana_key" ON "market_reports"("semana");
