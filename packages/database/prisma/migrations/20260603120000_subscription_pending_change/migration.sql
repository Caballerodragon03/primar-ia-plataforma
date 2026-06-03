-- Phase 17 — Suscripcion: track pending plan changes deferred to the
-- end of the current paid period (downgrades) and the Stripe
-- Subscription Schedule used to enforce them on Stripe side.

ALTER TABLE "suscripciones"
  ADD COLUMN "pending_plan_change" TEXT,
  ADD COLUMN "pending_change_effective_at" TIMESTAMP(3),
  ADD COLUMN "stripe_schedule_id" TEXT;

CREATE UNIQUE INDEX "suscripciones_stripe_schedule_id_key"
  ON "suscripciones"("stripe_schedule_id");
