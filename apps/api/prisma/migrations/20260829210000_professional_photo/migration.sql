-- Foto própria de cada profissional, isolada da conta.

ALTER TABLE "professionals" ADD COLUMN IF NOT EXISTS "photoBytes" BYTEA;
ALTER TABLE "professionals" ADD COLUMN IF NOT EXISTS "photoMime" VARCHAR(40);
ALTER TABLE "professionals" ADD COLUMN IF NOT EXISTS "photoUpdatedAt" TIMESTAMP(3);
