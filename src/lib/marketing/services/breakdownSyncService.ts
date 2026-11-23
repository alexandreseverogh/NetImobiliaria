/**
 * Coleta das quebras de desempenho (idade+gênero, região, horário) por tenant.
 * Plano: docs/PLANO_SEGMENTACAO_E_WIZARD.md — Fase 2.
 *
 * Regras:
 *  - Cada quebra é uma chamada separada à Meta (o horário não combina com idade/gênero).
 *  - Falha em uma quebra (ex.: horário não habilitado na conta) NÃO interrompe as outras:
 *    é registrada como "indisponível" e segue.
 *  - Só grava campanhas que existem no nosso banco (mapeadas pelo external_id).
 *  - Idempotente: ON CONFLICT atualiza a linha do mesmo dia/quebra.
 */
import pool from '@/lib/database/connection';
import { getNetworkServiceForTenant } from '@/lib/marketing/networks/factory';
import { MetaAdsAdapter } from '@/lib/marketing/networks/meta/metaAdsAdapter';

export type BreakdownType = 'age_gender' | 'region' | 'hour';
const BREAKDOWNS: BreakdownType[] = ['age_gender', 'region', 'hour'];

export interface BreakdownSyncResult {
  tenantId: string;
  skipped?: string;                       // motivo, quando o tenant não tem Meta conectada
  rowsSaved: number;
  unavailable: Array<{ breakdown: BreakdownType; reason: string }>;
}

/** Janela de coleta: os últimos `days` dias, até ontem (o dia de hoje ainda não está fechado). */
function window(days: number): { since: string; until: string } {
  const until = new Date();
  until.setDate(until.getDate() - 1);
  const since = new Date(until);
  since.setDate(since.getDate() - (days - 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { since: iso(since), until: iso(until) };
}

export async function syncBreakdownsForTenant(tenantId: string, days = 30): Promise<BreakdownSyncResult> {
  const result: BreakdownSyncResult = { tenantId, rowsSaved: 0, unavailable: [] };

  let adapter: any;
  try {
    adapter = await getNetworkServiceForTenant(tenantId, 'meta', null);
  } catch (err: any) {
    result.skipped = `Meta não conectada: ${err?.message || 'credencial ausente'}`;
    return result;
  }
  if (!(adapter instanceof MetaAdsAdapter)) {
    result.skipped = 'Adaptador Meta indisponível (rede não é Meta ou modo simulado)';
    return result;
  }

  // Campanhas do tenant com id externo → nosso id interno.
  const { rows: camps } = await pool.query<{ id: string; external_id: string }>(
    `SELECT id, external_id FROM campanhasmarketingdigital."Campaign"
      WHERE tenant_id = $1::uuid AND external_id IS NOT NULL AND external_id <> ''`,
    [tenantId],
  );
  if (camps.length === 0) {
    result.skipped = 'Nenhuma campanha com id externo';
    return result;
  }
  const idByExternal = new Map(camps.map(c => [c.external_id, c.id]));

  const { since, until } = window(days);

  for (const breakdown of BREAKDOWNS) {
    let rows: Awaited<ReturnType<MetaAdsAdapter['fetchBreakdownInsights']>>;
    try {
      rows = await adapter.fetchBreakdownInsights(since, until, breakdown);
    } catch (err: any) {
      result.unavailable.push({ breakdown, reason: err?.message || 'erro desconhecido' });
      continue;
    }

    for (const r of rows) {
      const campaignId = idByExternal.get(r.campaignExternalId);
      if (!campaignId) continue; // campanha que não é nossa: ignora
      await pool.query(
        `INSERT INTO campanhasmarketingdigital."InsightBreakdown"
           (tenant_id, campaign_id, date, breakdown_type, breakdown_key,
            impressions, clicks, reach, leads, spend)
         VALUES ($1::uuid, $2, $3::date, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (campaign_id, date, breakdown_type, breakdown_key) DO UPDATE SET
           impressions = EXCLUDED.impressions,
           clicks      = EXCLUDED.clicks,
           reach       = EXCLUDED.reach,
           leads       = EXCLUDED.leads,
           spend       = EXCLUDED.spend`,
        [tenantId, campaignId, r.date, r.breakdownType, r.breakdownKey,
         r.impressions, r.clicks, r.reach, r.leads, r.spend],
      );
      result.rowsSaved++;
    }
  }

  return result;
}
