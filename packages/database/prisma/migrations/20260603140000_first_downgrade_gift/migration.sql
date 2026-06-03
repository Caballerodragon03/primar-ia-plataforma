-- Phase 17.2 — retention gift: track whether a user has used their
-- first-downgrade free month offer. Default false → next downgrade
-- attempt triggers the gift modal; once they accept the gift or push
-- through the downgrade, this flips to true and the offer never shows
-- again for that account.

ALTER TABLE "suscripciones"
  ADD COLUMN "used_first_downgrade_gift" BOOLEAN NOT NULL DEFAULT false;
