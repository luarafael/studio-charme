-- Foto própria de cada profissional, isolada da conta.

ALTER TABLE "professionals"
  ADD COLUMN "photoBytes" BYTEA,
  ADD COLUMN "photoMime" VARCHAR(40),
  ADD COLUMN "photoUpdatedAt" TIMESTAMP(3);
