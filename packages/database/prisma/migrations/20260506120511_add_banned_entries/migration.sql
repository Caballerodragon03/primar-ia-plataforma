-- CreateTable
CREATE TABLE "banned_entries" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "cif_nif" TEXT,
    "reason" TEXT,
    "banned_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banned_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banned_entries_email_key" ON "banned_entries"("email");

-- CreateIndex
CREATE UNIQUE INDEX "banned_entries_cif_nif_key" ON "banned_entries"("cif_nif");
