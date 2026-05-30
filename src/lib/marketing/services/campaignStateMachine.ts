/**
 * FASE 4 — Campaign State Machine
 *
 * 8 estados de ciclo de vida:
 *   DRAFT → READY → LEARNING → STABLE → SCALING / FATIGUED / PAUSED → KILLED
 *
 * Regras de inferência automática (chamadas pelo agentMonitor após sync):
 *   - frequency > 3.5  AND  CTR médio caiu > 30%  →  FATIGUED
 *   - campanha ativa, < 7 dias e < 50 conversões   →  LEARNING
 *   - campanha ativa, passou LEARNING               →  STABLE
 *   - status = PAUSED (meta)                        →  PAUSED
 */

import pool from '@/lib/database/connection';
import prisma from '../prisma';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type LifecycleStatus =
  | 'DRAFT'
  | 'READY'
  | 'LEARNING'
  | 'STABLE'
  | 'SCALING'
  | 'FATIGUED'
  | 'PAUSED'
  | 'KILLED';

export type TriggerSource = 'AGENT' | 'MANUAL' | 'SYNC' | 'CRON';

export const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  DRAFT:    'Rascunho',
  READY:    'Pronto',
  LEARNING: 'Aprendendo',
  STABLE:   'Estável',
  SCALING:  'Escalando',
  FATIGUED: 'Fatigado',
  PAUSED:   'Pausado',
  KILLED:   'Encerrado',
};

export const LIFECYCLE_COLORS: Record<LifecycleStatus, string> = {
  DRAFT:    'bg-gray-100 text-gray-600',
  READY:    'bg-blue-100 text-blue-700',
  LEARNING: 'bg-yellow-100 text-yellow-700',
  STABLE:   'bg-green-100 text-green-700',
  SCALING:  'bg-emerald-100 text-emerald-700',
  FATIGUED: 'bg-red-100 text-red-700',
  PAUSED:   'bg-orange-100 text-orange-700',
  KILLED:   'bg-gray-200 text-gray-500',
};

export const LIFECYCLE_EMOJI: Record<LifecycleStatus, string> = {
  DRAFT:    '📝',
  READY:    '🚀',
  LEARNING: '📚',
  STABLE:   '✅',
  SCALING:  '📈',
  FATIGUED: '🔴',
  PAUSED:   '⏸️',
  KILLED:   '💀',
};

// ─── Transições válidas ───────────────────────────────────────────────────────

export const VALID_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  DRAFT:    ['READY', 'KILLED'],
  READY:    ['LEARNING', 'PAUSED', 'KILLED'],
  LEARNING: ['STABLE', 'PAUSED', 'KILLED'],
  STABLE:   ['SCALING', 'FATIGUED', 'PAUSED', 'KILLED'],
  SCALING:  ['STABLE', 'FATIGUED', 'PAUSED', 'KILLED'],
  FATIGUED: ['PAUSED', 'KILLED', 'READY'],   // READY = criativos renovados
  PAUSED:   ['READY', 'KILLED'],
  KILLED:   [],
};

// ─── transitionCampaign ───────────────────────────────────────────────────────

export async function transitionCampaign(
  campaignId: string,
  toStatus: LifecycleStatus,
  source: TriggerSource,
  reason?: string,
  metricsSnapshot?: Record<string, unknown>,
): Promise<void> {
  // Busca status atual
  const row = await pool.query<{ lifecycle_status: string; tenant_id: string | null }>(
    `SELECT lifecycle_status, tenant_id
       FROM campanhasmarketingdigital."Campaign"
      WHERE id = $1 LIMIT 1`,
    [campaignId],
  );

  if (!row.rows[0]) return;

  const fromStatus = row.rows[0].lifecycle_status as LifecycleStatus;
  const tenantId   = row.rows[0].tenant_id;

  // Valida transição
  if (!VALID_TRANSITIONS[fromStatus]?.includes(toStatus)) {
    console.warn(
      `[StateMachine] Transição inválida: ${fromStatus} → ${toStatus} (campaign ${campaignId})`,
    );
    return;
  }

  if (fromStatus === toStatus) return; // sem mudança

  // Atualiza lifecycle_status
  const now = new Date();
  await pool.query(
    `UPDATE campanhasmarketingdigital."Campaign"
        SET lifecycle_status     = $1,
            lifecycle_changed_at = $2,
            learning_started_at  = CASE WHEN $1 = 'LEARNING' THEN $2 ELSE learning_started_at END,
            stable_since         = CASE WHEN $1 = 'STABLE'   THEN $2 ELSE stable_since END
      WHERE id = $3`,
    [toStatus, now, campaignId],
  );

  // Registra no histórico
  await pool.query(
    `INSERT INTO campanhasmarketingdigital."CampaignLifecycleEvent"
       (campaign_id, tenant_id, from_status, to_status, trigger_source, reason, metrics_snapshot)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      campaignId,
      tenantId,
      fromStatus,
      toStatus,
      source,
      reason ?? null,
      metricsSnapshot ? JSON.stringify(metricsSnapshot) : null,
    ],
  );

  console.log(`[StateMachine] ${campaignId}: ${fromStatus} → ${toStatus} (${source})`);
}

// ─── inferLifecycleStatus ─────────────────────────────────────────────────────

/**
 * Analisa os insights dos últimos 7 dias e determina o lifecycle_status correto.
 * Chamado pelo agentMonitor após cada sync de métricas.
 */
export async function inferLifecycleStatus(campaignId: string): Promise<void> {
  const campaignRow = await pool.query<{
    lifecycle_status: string;
    status: string;
    created_at: Date;
    tenant_id: string | null;
  }>(
    `SELECT lifecycle_status, status, created_at, tenant_id
       FROM campanhasmarketingdigital."Campaign"
      WHERE id = $1 LIMIT 1`,
    [campaignId],
  );

  if (!campaignRow.rows[0]) return;

  const { lifecycle_status, status, created_at } = campaignRow.rows[0];
  const current = lifecycle_status as LifecycleStatus;

  // Campanhas KILLED nunca mudam
  if (current === 'KILLED' || current === 'DRAFT') return;

  // Sincroniza pausa externa (Meta pausou → reflete aqui)
  if (status === 'PAUSED' && !['PAUSED', 'KILLED'].includes(current)) {
    await transitionCampaign(campaignId, 'PAUSED', 'SYNC', 'Campanha pausada externamente');
    return;
  }

  // Sem métricas = não infere
  if (status !== 'ACTIVE') return;

  // Busca insights últimos 7 dias
  const insightsRow = await pool.query<{
    avg_frequency: number;
    avg_ctr: number;
    first_ctr: number;
    last_ctr: number;
    total_conversions: number;
    day_count: number;
  }>(
    `SELECT
       AVG(frequency::float)                          AS avg_frequency,
       AVG(ctr::float)                                AS avg_ctr,
       (ARRAY_AGG(ctr::float ORDER BY date ASC))[1]   AS first_ctr,
       (ARRAY_AGG(ctr::float ORDER BY date DESC))[1]  AS last_ctr,
       COALESCE(SUM((breakdowns->>'conversions')::float), 0) AS total_conversions,
       COUNT(*)                                        AS day_count
     FROM campanhasmarketingdigital."Insight"
    WHERE campaign_id = $1
      AND date >= NOW() - INTERVAL '7 days'`,
    [campaignId],
  );

  const m = insightsRow.rows[0];
  if (!m || Number(m.day_count) === 0) return; // sem dados recentes

  const ageInDays = (Date.now() - new Date(created_at).getTime()) / (1000 * 60 * 60 * 24);
  const ctrDrop   = m.first_ctr > 0 ? (m.first_ctr - m.last_ctr) / m.first_ctr : 0;

  // Regra: FATIGUED
  if (
    Number(m.avg_frequency) > 3.5 &&
    ctrDrop > 0.30 &&
    ['STABLE', 'SCALING', 'LEARNING'].includes(current)
  ) {
    await transitionCampaign(
      campaignId, 'FATIGUED', 'SYNC',
      `Frequência ${Number(m.avg_frequency).toFixed(1)}x · CTR caiu ${(ctrDrop * 100).toFixed(0)}%`,
      { avg_frequency: m.avg_frequency, ctr_drop_pct: ctrDrop, avg_ctr: m.avg_ctr },
    );
    return;
  }

  // Regra: LEARNING → STABLE (≥7 dias ativo ou ≥50 conversões)
  if (current === 'LEARNING' && (ageInDays >= 7 || Number(m.total_conversions) >= 50)) {
    await transitionCampaign(
      campaignId, 'STABLE', 'SYNC',
      `${ageInDays.toFixed(0)} dias ativo · ${Number(m.total_conversions).toFixed(0)} conversões`,
    );
    return;
  }

  // Regra: READY → LEARNING (campanha ativa com primeiros dados)
  if (current === 'READY' && Number(m.day_count) >= 1) {
    await transitionCampaign(campaignId, 'LEARNING', 'SYNC', 'Primeiros dados de veiculação');
    return;
  }
}

// ─── getLifecycleHistory ──────────────────────────────────────────────────────

export async function getLifecycleHistory(campaignId: string, limit = 20) {
  const res = await pool.query(
    `SELECT from_status, to_status, trigger_source, reason, metrics_snapshot, created_at
       FROM campanhasmarketingdigital."CampaignLifecycleEvent"
      WHERE campaign_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [campaignId, limit],
  );
  return res.rows;
}
