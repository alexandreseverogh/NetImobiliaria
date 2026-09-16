import pool from '@/lib/database/connection'
import { DISTRIBUTION_STRATEGIES } from './strategies'
import type { DistributionStrategyContext, DistributionStrategyResult } from './strategies/types'

/**
 * 🛰️ MOTOR DE DISTRIBUIÇÃO UNIFICADO (CRM v2.0)
 *
 * Orquestrador de estratégias plugáveis por segmento (public.segment_distribution_strategies,
 * configurado pelo Master em /admin/master/segments) — cada segmento declara sua própria lista
 * ORDENADA de estratégias (dono do ativo, área geográfica, fila, plantonista...), o engine
 * itera essa lista e para na primeira que encontrar um candidato. Ver src/lib/routing/
 * strategies/ pras implementações e docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md §6 (F7) pro
 * histórico da extração do acoplamento a "imóvel" que este desenho substitui.
 */

export interface LeadDistributionContext {
  lead_id: string | number; // UUID (Staging) ou ID (Prospect)
  target_id?: string | number; // Ex: ID do Imóvel, ID do Curso, ID do Exame
  /** Dono já resolvido pelo chamador (opcional — quando ausente, a estratégia owner_of_asset
   *  resolve sozinha via config.targetTable/targetIdColumn/ownerColumn do segmento). */
  source_owner_id?: string;
  estado_fk?: string;
  cidade_fk?: string;
  domain_id?: number; // Legado — não influencia mais o roteamento, mantido só pra log/telemetria
  tenant_id?: string;
}

export interface RoutedBroker {
  id: string;
  nome: string;
  email: string;
  tipo_corretor: 'Externo' | 'Interno';
  is_plantonista: boolean;
  sla_minutos: number;
  motivo_atribuicao: string;
  expira_em: Date;
}

export class DistributionEngine {
  /**
   * 🎯 Função Mestra: Encontrar o melhor destinatário para o lead
   */
  static async findBestCandidate(
    ctx: LeadDistributionContext,
    excludeIds: string[] = [],
    dbClient: any = pool
  ): Promise<RoutedBroker | null> {
    const tenantId = ctx.tenant_id || '00000000-0000-0000-0000-000000000001';
    console.log(`[DistributionEngine] Iniciando busca para lead ${ctx.lead_id}. Tenant: ${tenantId}`);

    // 1. Resolve o segmento do tenant (fallback: slug='geral' quando o tenant não tem
    // segmento próprio) — usa o MESMO dbClient do chamador (pode ser um client de transação
    // de cron), não um pool separado.
    const segmentRes = await dbClient.query(
      `SELECT ss.id, ss.distribution_role_name
         FROM public.system_segments ss
         JOIN public.tenants t ON t.segment_id = ss.id
        WHERE t.id = $1 AND ss.is_active = true
        LIMIT 1`,
      [tenantId],
    );
    let segment = segmentRes.rows[0];
    if (!segment) {
      const fallbackRes = await dbClient.query(
        `SELECT id, distribution_role_name FROM public.system_segments WHERE slug = 'geral' AND is_active = true LIMIT 1`,
      );
      segment = fallbackRes.rows[0];
    }
    if (!segment) {
      console.warn(`[DistributionEngine] Nenhum segmento resolvido (tenant ${tenantId}, sem fallback 'geral') — abortando roteamento.`);
      return null;
    }

    const sellerRoleName = segment.distribution_role_name || 'Corretor';

    // 2. Buscar Parâmetros de SLA e Limites (Garantindo Zero Hardcoding) — tenant-wide,
    // reaproveitados por qualquer estratégia que precise (geo_area, round_robin).
    const paramsRes = await dbClient.query('SELECT * FROM public.parametros_imoveis WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    const params = paramsRes.rows[0] || {};
    const slaDefaults = {
      limitExternal: parseInt(params.proximos_corretores_recebem_leads) || 3,
      limitInternal: parseInt(params.proximos_corretores_recebem_leads_internos) || 3,
      slaExterno: parseInt(params.sla_minutos_aceite_lead) || 5,
      slaInterno: parseInt(params.sla_minutos_aceite_lead_interno) || 15,
    };

    // 3. Buscar a lista ordenada de estratégias ativas deste segmento
    const strategiesRes = await dbClient.query(
      `SELECT strategy_key, config
         FROM public.segment_distribution_strategies
        WHERE segment_id = $1 AND is_active = true
        ORDER BY priority ASC`,
      [segment.id],
    );

    if (strategiesRes.rows.length === 0) {
      console.warn(`[DistributionEngine] Segmento ${segment.id} sem nenhuma estratégia de distribuição configurada.`);
      return null;
    }

    const baseCtx: Omit<DistributionStrategyContext, 'config'> = {
      tenantId,
      targetId: ctx.target_id,
      sourceOwnerId: ctx.source_owner_id,
      estadoFk: ctx.estado_fk,
      cidadeFk: ctx.cidade_fk,
      sellerRoleName,
      excludeIds,
      dbClient,
    };

    for (const row of strategiesRes.rows) {
      const strategy = DISTRIBUTION_STRATEGIES[row.strategy_key];
      if (!strategy) {
        console.warn(`[DistributionEngine] strategy_key desconhecida: "${row.strategy_key}" (segmento ${segment.id}) — pulando.`);
        continue;
      }

      const result: DistributionStrategyResult | null = await strategy.findCandidate({
        ...baseCtx,
        config: { ...slaDefaults, ...(row.config || {}) },
      });

      if (result) {
        console.log(`✅ [DistributionEngine] "${row.strategy_key}" selecionou: ${result.nome} (${result.motivo_atribuicao})`);
        return {
          id: result.id,
          nome: result.nome,
          email: result.email,
          tipo_corretor: result.tipo_corretor,
          is_plantonista: result.is_plantonista,
          sla_minutos: result.sla_minutos,
          motivo_atribuicao: result.motivo_atribuicao,
          expira_em: result.expira_em as any,
        };
      }
    }

    console.warn(`❌ [DistributionEngine] Nenhum candidato disponível para o lead ${ctx.lead_id} (segmento ${segment.id}).`);
    return null;
  }
}
