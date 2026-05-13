-- CreateIndex
CREATE INDEX "matches_estado_created_at_idx" ON "matches"("estado", "created_at");

-- CreateIndex
CREATE INDEX "suscripciones_stripe_customer_id_idx" ON "suscripciones"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "users_proxima_regeneracion_credito_idx" ON "users"("proxima_regeneracion_credito");
