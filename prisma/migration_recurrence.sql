SET search_path TO campanhasmarketingdigital;

CREATE TABLE IF NOT EXISTS "OrganicRecurrenceSchedule" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  client_id       UUID,
  platform        VARCHAR(20) NOT NULL,
  format          VARCHAR(20) NOT NULL,
  caption         TEXT,
  media_urls      JSONB NOT NULL DEFAULT '[]',
  media_kind      VARCHAR(10),
  start_date      DATE NOT NULL,
  end_date        DATE,
  days_of_week    JSONB NOT NULL DEFAULT '[]',
  timeslots       JSONB NOT NULL DEFAULT '[]',
  status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  generated_until TIMESTAMPTZ,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "OrganicPost"
  ADD COLUMN IF NOT EXISTS recurrence_id UUID REFERENCES "OrganicRecurrenceSchedule"(id);

CREATE INDEX IF NOT EXISTS idx_recurrence_tenant_status
  ON "OrganicRecurrenceSchedule"(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_organicpost_recurrence
  ON "OrganicPost"(recurrence_id);
