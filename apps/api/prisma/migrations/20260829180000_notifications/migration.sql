-- Alertas internos por profissional e inscrições de push no celular.

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID NOT NULL,
    "professionalId" UUID NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "href" VARCHAR(300) NOT NULL,
    "appointmentId" UUID,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_professionalId_createdAt_idx" ON "notifications"("professionalId", "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_professionalId_readAt_idx" ON "notifications"("professionalId", "readAt");

DO $$ BEGIN
  ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "professionals"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
    "id" UUID NOT NULL,
    "professionalId" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" VARCHAR(255) NOT NULL,
    "auth" VARCHAR(255) NOT NULL,
    "userAgent" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX IF NOT EXISTS "push_subscriptions_professionalId_idx" ON "push_subscriptions"("professionalId");

DO $$ BEGIN
  ALTER TABLE "push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "professionals"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
