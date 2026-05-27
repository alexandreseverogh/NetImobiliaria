/**
 * MIGRATION: Google Calendar Integration
 * Adiciona campos ao tenants, users e cria tabela agendamentos
 * SAFE: usa IF NOT EXISTS e ADD COLUMN IF NOT EXISTS
 */

const { Pool } = require('pg')
const path = require('path')

// Carregar .env.local (padrão do Next.js)
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const pool = new Pool({
  user:     process.env.DB_USER     || 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     parseInt(process.env.DB_PORT || '15432'),
  ssl: false,
})

async function migrate() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    console.log('🗓️ [Migration] Iniciando: Google Calendar Integration...')

    // ── 1. tenants: 3 novos campos ─────────────────────────────
    await client.query(`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS calendario BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS google_email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS duracao_visita INTEGER DEFAULT 60
    `)
    console.log('✅ tenants: campos calendario, google_email, duracao_visita criados')

    // ── 2. users: 2 novos campos ───────────────────────────────
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
        ADD COLUMN IF NOT EXISTS google_calendar_authorized BOOLEAN DEFAULT false
    `)
    console.log('✅ users: campos google_refresh_token, google_calendar_authorized criados')

    // ── 3. tabela agendamentos ─────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS agendamentos (
        id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id                UUID,
        lead_uuid                UUID NOT NULL,
        usuario_id               VARCHAR(255) NOT NULL,
        imovel_id                INTEGER,
        data_hora_inicio         TIMESTAMPTZ NOT NULL,
        data_hora_fim            TIMESTAMPTZ NOT NULL,
        google_event_id_usuario  VARCHAR(255),
        google_event_id_empresa  VARCHAR(255),
        status                   VARCHAR(20) NOT NULL DEFAULT 'agendado'
                                   CHECK (status IN ('agendado','confirmado','cancelado','realizado')),
        observacoes              TEXT,
        email_corretor_enviado   BOOLEAN DEFAULT false,
        email_lead_enviado       BOOLEAN DEFAULT false,
        created_at               TIMESTAMPTZ DEFAULT NOW(),
        updated_at               TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agendamentos_lead_uuid   ON agendamentos(lead_uuid);
      CREATE INDEX IF NOT EXISTS idx_agendamentos_usuario_id  ON agendamentos(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_agendamentos_tenant_id   ON agendamentos(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_agendamentos_status      ON agendamentos(status);
    `)
    console.log('✅ tabela agendamentos criada com índices')

    await client.query('COMMIT')
    console.log('🎉 Migration concluída com sucesso!')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Migration falhou — ROLLBACK executado:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
