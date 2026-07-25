/**
 * FASE 14b — Calibração de Ângulo
 * Agrega métricas de performance (CPL, CTR, spend) por ângulo EFETIVO de comunicação.
 *
 * Ângulo efetivo = Campaign.declared_angle ?? ângulo inferido pelo Vision (CreativeAnalysis.angle)
 * Fonte única de taxonomia: src/lib/marketing/angles.ts
 */

import pool from '@/lib/database/connection';
import { angleLabel } from '../angles';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface AngleStat {
  angle: string;        // CommunicationAngle | 'unknown'
  label: string;
  campaigns: number;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  cpl: number | null;   // spend / conversions (null se sem conversões)
  ctr: number;          // clicks / impressions * 100 (%)
}

export interface AngleInsightsResult {
  periodDays: number;
  angleStats: AngleStat[];
  topAngle: AngleStat | null;    // melhor CPL (menor)
  worstAngle: AngleStat | null;  // pior CPL (maior), presente apenas se >=2 ângulos com dados
  textSummary: string;           // bloco de texto para injeção em variável LLM
}

// ─── Constante de schema ─────────────────────────────────────────────────────

const S = 'campanhasmarketingdigital';

// ─── Serviço principal ───────────────────────────────────────────────────────

export async function getAngleInsights(
  periodDays: number,
  tenantId?: string,
  clientId?: string,
  segmentId?: string,   // FASE 18.2 — filtra por segmento (campanhas do segmento)
): Promise<AngleInsightsResult> {
  const empty: AngleInsightsResult = {
    periodDays,
    angleStats:  [],
    topAngle:    null,
    worstAngle:  null,
    textSummary: 'Dados de ângulo indisponíveis.',
  };

  if (!tenantId) return empty;

  try {
    const params: (string | number)[] = [tenantId, periodDays];
    let clientFilter = '';
    if (clientId === 'own') {
      clientFilter = ' AND c.client_id IS NULL';
    } else if (clientId) {
      params.push(clientId);
      clientFilter = ` AND c.client_id = $${params.length}::uuid`;
    }

    // FASE 18.2 — filtro por segmento (campanha de cliente do segmento, ou própria do tenant cujo segmento bate)
    let segmentFilter = '';
    if (segmentId) {
      params.push(segmentId);
      const p = params.length;
      segmentFilter = ` AND ( cl.segment_id = $${p}::uuid OR (c.client_id IS NULL AND t.segment_id = $${p}::uuid) )`;
    }

    // Junta Campaign → (CreativeAsset → CreativeAnalysis) para obter ângulo Vision,
    // e Campaign → Insight para agregar métricas do período.
    // Ângulo efetivo = declared_angle ?? Vision angle ?? 'unknown'
    const sql = `
      SELECT
        COALESCE(c.declared_angle, latest_vision.angle, 'unknown') AS effective_angle,
        COUNT(DISTINCT c.id)              AS campaigns,
        COALESCE(SUM(i.spend),       0)   AS total_spend,
        COALESCE(SUM(i.clicks),      0)   AS total_clicks,
        COALESCE(SUM(i.impressions), 0)   AS total_impressions,
        COALESCE(SUM(i.conversions), 0)   AS total_conversions
      FROM ${S}."Campaign" c
      LEFT JOIN public.clientes cl ON cl.uuid = c.client_id
      LEFT JOIN public.tenants  t  ON t.id    = c.tenant_id
      -- ângulo Vision mais recente por campanha (fallback quando declared_angle é null)
      LEFT JOIN (
        SELECT DISTINCT ON (ca.campaign_id)
          ca.campaign_id,
          cra.angle
        FROM ${S}."CreativeAsset" ca
        JOIN ${S}."CreativeAnalysis" cra ON cra.asset_id = ca.id
        WHERE cra.angle IS NOT NULL
          AND ca.tenant_id = $1::uuid
        ORDER BY ca.campaign_id, cra.analyzed_at DESC
      ) latest_vision ON latest_vision.campaign_id = c.id
      -- métricas do período
      LEFT JOIN ${S}."Insight" i
        ON i."campaignId" = c.id
        AND i.date >= NOW() - ($2 * INTERVAL '1 day')
      WHERE c.tenant_id = $1::uuid${clientFilter}${segmentFilter}
      GROUP BY effective_angle
      ORDER BY total_spend DESC
    `;

    const { rows } = await pool.query(sql, params);

    const angleStats: AngleStat[] = rows.map(row => {
      const spend       = parseFloat(row.total_spend);
      const clicks      = parseInt(row.total_clicks, 10);
      const impressions = parseInt(row.total_impressions, 10);
      const conversions = parseInt(row.total_conversions, 10);
      const cpl         = conversions > 0 ? spend / conversions : null;
      const ctr         = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const angle       = String(row.effective_angle);

      return {
        angle,
        label:       angleLabel(angle),
        campaigns:   parseInt(row.campaigns, 10),
        spend,
        clicks,
        impressions,
        conversions,
        cpl,
        ctr,
      };
    });

    // Vencedor / perdedor por CPL (apenas entre ângulos com conversões registradas)
    const withCpl = angleStats.filter(a => a.cpl !== null);
    const topAngle   = withCpl.length >= 1
      ? withCpl.reduce((best, a) => a.cpl! < best.cpl! ? a : best)
      : null;
    const worstAngle = withCpl.length >= 2
      ? withCpl.reduce((worst, a) => a.cpl! > worst.cpl! ? a : worst)
      : null;

    const textSummary = buildAngleTextSummary(angleStats, topAngle, worstAngle, periodDays);

    return { periodDays, angleStats, topAngle, worstAngle, textSummary };
  } catch (err: any) {
    console.error('[angleInsights] Erro ao agregar dados de ângulo:', err?.message);
    return { ...empty, textSummary: `Erro ao calcular ângulos: ${err?.message}` };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildAngleTextSummary(
  stats: AngleStat[],
  top: AngleStat | null,
  worst: AngleStat | null,
  periodDays: number,
): string {
  if (stats.length === 0) return `Nenhum dado de ângulo disponível nos últimos ${periodDays} dias.`;

  const lines: string[] = [`ÂNGULOS DE COMUNICAÇÃO — últimos ${periodDays} dias:`];
  for (const s of stats) {
    const cplText = s.cpl !== null ? `CPL R$${s.cpl.toFixed(2)}` : 'sem conversões';
    lines.push(
      `• ${s.label}: ${s.campaigns} camp. | R$${s.spend.toFixed(2)} investido | ` +
      `CTR ${s.ctr.toFixed(2)}% | ${cplText}`
    );
  }

  if (top) {
    lines.push(
      `\n✅ ÂNGULO VENCEDOR: "${top.label}" — CPL R$${top.cpl!.toFixed(2)}, ` +
      `${top.campaigns} campanha(s). Priorizar criativos com este ângulo.`
    );
  }
  if (worst) {
    lines.push(
      `⚠️ ÂNGULO FRACO: "${worst.label}" — CPL R$${worst.cpl!.toFixed(2)}, ` +
      `${worst.campaigns} campanha(s). Revisar ou pausar criativos com este ângulo.`
    );
  }
  if (!top) {
    lines.push('\nDados insuficientes para identificar ângulo vencedor (sem conversões registradas).');
  }

  return lines.join('\n');
}
