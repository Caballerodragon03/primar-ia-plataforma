-- CreateTable
CREATE TABLE "invoice_counters" (
    "id" TEXT NOT NULL,
    "emisor_cif" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "next_numero" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_counters_emisor_cif_kind_year_key" ON "invoice_counters"("emisor_cif", "kind", "year");
