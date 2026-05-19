-- CreateTable
CREATE TABLE "pending_refunds" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "stripe_charge_id" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "comprador_email" TEXT NOT NULL,
    "comprador_nombre" TEXT NOT NULL,
    "importe_eur" DECIMAL(10,2) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_refunds_stripe_charge_id_key" ON "pending_refunds"("stripe_charge_id");

-- CreateIndex
CREATE INDEX "pending_refunds_resolved_at_created_at_idx" ON "pending_refunds"("resolved_at", "created_at");
