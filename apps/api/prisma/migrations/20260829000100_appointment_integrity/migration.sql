-- Garantias de integridade da agenda e do financeiro aplicadas no banco.
--
-- O Prisma não expressa restrições de exclusão nem CHECK, mas estas regras não
-- podem viver só na aplicação: duas requisições simultâneas passariam pela
-- verificação de conflito antes de qualquer uma gravar, e a agenda terminaria com
-- dois atendimentos no mesmo horário. Aqui o próprio Postgres recusa a segunda
-- gravação, independentemente de quantos processos da API estejam rodando.

-- Necessária para combinar igualdade de UUID com sobreposição de intervalo no
-- mesmo índice GiST.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------------
-- Coerência dos horários
-- ---------------------------------------------------------------------------

-- Um atendimento precisa terminar depois de começar.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_ends_after_starts"
  CHECK ("endsAt" > "startsAt");

-- O bloqueio da agenda cobre o atendimento inteiro mais o tempo de preparo,
-- então nunca pode acabar antes do fim do atendimento.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_block_covers_service"
  CHECK ("blockedUntil" >= "endsAt");

-- ---------------------------------------------------------------------------
-- Impedimento de horário duplo
-- ---------------------------------------------------------------------------

-- Dois atendimentos da MESMA profissional não podem ocupar o mesmo intervalo.
--
-- O intervalo é fechado no início e aberto no fim ('[)'): um atendimento que
-- termina às 15:00 e outro que começa às 15:00 não se sobrepõem.
--
-- A cláusula WHERE reproduz BLOCKING_APPOINTMENT_STATUSES do pacote de
-- contratos: um horário cancelado ou com falta libera a vaga e deixa de
-- conflitar, permitindo remarcar em cima dele.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist (
    "professionalId" WITH =,
    tsrange("startsAt", "blockedUntil", '[)') WITH &&
  )
  WHERE (
    "status" IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED')
  );

-- ---------------------------------------------------------------------------
-- Coerência dos valores monetários
-- ---------------------------------------------------------------------------

-- Valores são inteiros em centavos e não podem ser negativos. Um estorno é
-- registrado com status REFUNDED, não com valor negativo.
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_not_negative"
  CHECK ("amountCents" >= 0);

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_discount_not_negative"
  CHECK ("discountCents" >= 0);

-- O desconto não pode ser maior que o valor: o líquido nunca fica negativo.
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_discount_within_amount"
  CHECK ("discountCents" <= "amountCents");

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_amount_not_negative"
  CHECK ("amountCents" >= 0);

ALTER TABLE "services"
  ADD CONSTRAINT "services_price_not_negative"
  CHECK ("priceCents" >= 0);

-- Um serviço sem duração não poderia ser agendado, e a duração é usada no
-- cálculo do fim do atendimento.
ALTER TABLE "services"
  ADD CONSTRAINT "services_duration_positive"
  CHECK ("durationMinutes" > 0);

ALTER TABLE "services"
  ADD CONSTRAINT "services_buffer_not_negative"
  CHECK ("bufferAfterMinutes" >= 0);

ALTER TABLE "appointment_services"
  ADD CONSTRAINT "appointment_services_price_not_negative"
  CHECK ("priceCents" >= 0);

ALTER TABLE "appointment_services"
  ADD CONSTRAINT "appointment_services_duration_positive"
  CHECK ("durationMinutes" > 0);

-- Comissão entre 0% e 100%, em base 10000.
ALTER TABLE "professionals"
  ADD CONSTRAINT "professionals_commission_range"
  CHECK ("commissionBasisPoints" BETWEEN 0 AND 10000);

-- ---------------------------------------------------------------------------
-- Coerência da disponibilidade
-- ---------------------------------------------------------------------------

-- Minutos desde a meia-noite: 0 até 1440, com o fim depois do início.
ALTER TABLE "business_hours"
  ADD CONSTRAINT "business_hours_valid_range"
  CHECK (
    "startMinute" >= 0
    AND "endMinute" <= 1440
    AND "endMinute" > "startMinute"
  );

ALTER TABLE "business_hours"
  ADD CONSTRAINT "business_hours_valid_weekday"
  CHECK ("weekday" BETWEEN 0 AND 6);

-- Na exceção de disponibilidade, os minutos são opcionais (dia inteiro), mas
-- se um for informado o outro também precisa ser, formando uma faixa válida.
ALTER TABLE "availability_overrides"
  ADD CONSTRAINT "availability_overrides_valid_range"
  CHECK (
    ("startMinute" IS NULL AND "endMinute" IS NULL)
    OR (
      "startMinute" IS NOT NULL
      AND "endMinute" IS NOT NULL
      AND "startMinute" >= 0
      AND "endMinute" <= 1440
      AND "endMinute" > "startMinute"
    )
  );

-- ---------------------------------------------------------------------------
-- Índices adicionais
-- ---------------------------------------------------------------------------

-- A limpeza de sessões expiradas e de tokens usados varre por data.
CREATE INDEX "sessions_revoked_at_idx" ON "sessions" ("revokedAt")
  WHERE "revokedAt" IS NULL;

CREATE INDEX "access_tokens_unused_idx" ON "access_tokens" ("expiresAt")
  WHERE "usedAt" IS NULL;
