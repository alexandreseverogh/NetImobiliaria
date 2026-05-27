import pool from '@/lib/database/connection'

/**
 * 🛰️ MOTOR DE DISTRIBUIÇÃO UNIFICADO (CRM v2.0)
 * Arquitetura Agnóstica: Funciona para Imóveis, Saúde, Educação, etc.
 * Objetivo: Decidir quem recebe o lead com base em Hierarquia, Área e SLA.
 */

export interface LeadDistributionContext {
  lead_id: string | number; // UUID (Staging) ou ID (Prospect)
  target_id?: string | number; // Ex: ID do Imóvel, ID do Curso, ID do Exame
  source_owner_id?: string; // UUID do Dono do Ativo (se houver)
  estado_fk?: string;
  cidade_fk?: string;
  domain_id?: number; // Para multi-inquilino / multi-垂直 (SaaS)
  tenant_id?: string; // NOVO: Isolamento Multi-Tenant
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
    console.log(`[DistributionEngine] Iniciando busca para lead ${ctx.lead_id}. Domínio: ${ctx.domain_id || 1}`);

    const tenantId = ctx.tenant_id || '00000000-0000-0000-0000-000000000001';

    // 1. Buscar Parâmetros de SLA e Limites (Garantindo Zero Hardcoding)
    const paramsRes = await dbClient.query('SELECT * FROM public.parametros_imoveis WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    const params = paramsRes.rows[0] || {};
    
    const limitExternal = parseInt(params.proximos_corretores_recebem_leads) || 3;
    const limitInternal = parseInt(params.proximos_corretores_recebem_leads_internos) || 3;
    const slaExterno = parseInt(params.sla_minutos_aceite_lead) || 5;
    const slaInterno = parseInt(params.sla_minutos_aceite_lead_interno) || 15;

    // --- NÍVEL 1: DONO DO IMÓVEL (Direct/Owner) ---
    // Regra: Se o imóvel tem um corretor fixo (corretor_fk), ele recebe o lead automaticamente.
    // Esta atribuição é definitiva (expira_em = NULL).
    if (ctx.source_owner_id && !excludeIds.includes(ctx.source_owner_id)) {
      const ownerRes = await dbClient.query(
        `SELECT u.id, u.nome, u.email, u.tipo_corretor, u.is_plantonista 
         FROM users u
         INNER JOIN user_tenant_membership utm ON u.id = utm.user_id
         WHERE u.id = $1 AND u.ativo = true AND utm.tenant_id = $2`,
        [ctx.source_owner_id, tenantId]
      );
      
      if (ownerRes.rows.length > 0) {
        const row = ownerRes.rows[0];
        console.log(`✅ [DistributionEngine] Nível 1: Dono do Imóvel selecionado: ${row.nome}`);
        return {
          id: row.id,
          nome: row.nome,
          email: row.email,
          tipo_corretor: row.tipo_corretor,
          is_plantonista: row.is_plantonista,
          sla_minutos: 0,
          motivo_atribuicao: 'dono_ativo',
          expira_em: null as any // Atribuição definitiva conforme regra do usuário
        };
      }
    }

    // --- NÍVEL 2: ROTEAMENTO GEOGRÁFICO - CORRETORES EXTERNOS ---
    // Regra: Se não houver dono, prioridade para corretores externos da área.
    if (ctx.estado_fk && ctx.cidade_fk) {
      const externalRes = await this.queryBrokersByArea(
        ctx.estado_fk, ctx.cidade_fk, 'Externo', excludeIds, limitExternal, tenantId, dbClient
      );
      if (externalRes) {
        console.log(`✅ [DistributionEngine] Nível 2: Corretor Externo por Área: ${externalRes.nome}`);
        return this.formatResult(externalRes, 'area_match_externo', slaExterno, slaInterno);
      }

      // --- NÍVEL 3: ROTEAMENTO GEOGRÁFICO - CORRETORES INTERNOS ---
      const internalRes = await this.queryBrokersByArea(
        ctx.estado_fk, ctx.cidade_fk, 'Interno', excludeIds, limitInternal, tenantId, dbClient
      );
      if (internalRes) {
        console.log(`✅ [DistributionEngine] Nível 3: Corretor Interno por Área: ${internalRes.nome}`);
        return this.formatResult(internalRes, 'area_match_interno', slaExterno, slaInterno);
      }
    }

    // --- NÍVEL 4: FALLBACK FINAL (Plantonista) ---
    const plantonistaRes = await this.queryPlantonista(excludeIds, tenantId, dbClient, ctx.estado_fk, ctx.cidade_fk);
    if (plantonistaRes) {
      console.log(`✅ [DistributionEngine] Nível 4: Fallback Plantonista: ${plantonistaRes.nome}`);
      return {
        id: plantonistaRes.id,
        nome: plantonistaRes.nome,
        email: plantonistaRes.email,
        tipo_corretor: plantonistaRes.tipo_corretor,
        is_plantonista: true,
        sla_minutos: 0,
        motivo_atribuicao: 'fallback_plantonista',
        expira_em: null as any
      };
    }

    console.warn(`❌ [DistributionEngine] Nenhum candidato disponível para o lead ${ctx.lead_id}`);
    return null;
  }

  /**
   * Consulta centralizada de corretores por área com Round Robin
   * Aplica o limite de 'n' corretores que já receberam leads para rotatividade
   */
  private static async queryBrokersByArea(
    estado: string,
    cidade: string,
    tipo: 'Externo' | 'Interno',
    excludeIds: string[],
    limit: number,
    tenantId: string,
    dbClient: any
  ): Promise<any | null> {
    const q = `
      SELECT
        u.id, u.nome, u.email, u.tipo_corretor, u.is_plantonista,
        COALESCE(cs.nivel, 0) as nivel,
        COUNT(a.corretor_fk) AS total_recebidos,
        MAX(a.created_at) AS ultimo_recebimento
      FROM public.users u
      INNER JOIN public.user_tenant_membership utm ON u.id = utm.user_id
      INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
      INNER JOIN public.user_roles ur ON ura.role_id = ur.id
      INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      LEFT JOIN public.corretor_scores cs ON cs.user_id = u.id
      LEFT JOIN (
        -- Unificamos a contagem para ser agnóstica entre Prospect e Staging
        SELECT corretor_fk, created_at FROM public.imovel_prospect_atribuicoes
        UNION ALL
        SELECT corretor_atribuido_id as corretor_fk, created_at FROM public.leads_staging WHERE corretor_atribuido_id IS NOT NULL
      ) a ON a.corretor_fk = u.id
      WHERE u.ativo = true
        AND utm.tenant_id = $6
        AND ur.name = 'Corretor'
        AND COALESCE(u.is_plantonista, false) = false
        AND u.tipo_corretor = $1
        AND caa.estado_fk = $2
        AND caa.cidade_fk = $3
        AND (CASE WHEN array_length($4::uuid[], 1) > 0 THEN u.id != ALL($4::uuid[]) ELSE true END)
      GROUP BY u.id, u.nome, u.email, u.tipo_corretor, u.is_plantonista, cs.nivel, u.created_at
      HAVING COUNT(a.corretor_fk) < $5 -- Aplica o limite parametrizado
      ORDER BY 
        COUNT(a.corretor_fk) ASC, 
        MAX(a.created_at) ASC NULLS FIRST, 
        COALESCE(cs.nivel, 0) DESC,
        u.created_at ASC
      LIMIT 1
    `;
    const r = await dbClient.query(q, [tipo, estado, cidade, excludeIds, limit, tenantId]);
    return r.rows[0] || null;
  }

  /**
   * Consulta centralizada de Plantonistas
   */
  private static async queryPlantonista(excludeIds: string[], tenantId: string, dbClient: any, estado?: string, cidade?: string): Promise<any | null> {
    // Tenta primeiro plantonista da área, senão global
    const q = `
      SELECT u.id, u.nome, u.email, u.tipo_corretor, u.is_plantonista
      FROM public.users u
      INNER JOIN public.user_tenant_membership utm ON u.id = utm.user_id
      INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
      INNER JOIN public.user_roles ur ON ura.role_id = ur.id
      LEFT JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      LEFT JOIN (
         SELECT corretor_fk, created_at FROM public.imovel_prospect_atribuicoes
         UNION ALL
         SELECT corretor_atribuido_id as corretor_fk, created_at FROM public.leads_staging WHERE corretor_atribuido_id IS NOT NULL
      ) a ON a.corretor_fk = u.id
      WHERE u.ativo = true
        AND utm.tenant_id = $4
        AND ur.name = 'Corretor'
        AND COALESCE(u.is_plantonista, false) = true
        AND (CASE WHEN array_length($1::uuid[], 1) > 0 THEN u.id != ALL($1::uuid[]) ELSE true END)
      GROUP BY u.id, u.nome, u.email, u.tipo_corretor, u.is_plantonista, u.created_at, caa.estado_fk, caa.cidade_fk
      ORDER BY 
        (CASE WHEN caa.estado_fk = $2 AND caa.cidade_fk = $3 THEN 0 ELSE 1 END) ASC, -- Prioriza área se houver match
        COUNT(a.corretor_fk) ASC, 
        MAX(a.created_at) ASC NULLS FIRST,
        u.created_at ASC
      LIMIT 1
    `;
    const r = await dbClient.query(q, [excludeIds, estado || '', cidade || '', tenantId]);
    return r.rows[0] || null;
  }

  /**
   * Helper para formatar o resultado com cálculo de SLA dinâmico
   */
  private static formatResult(row: any, motivo: string, slaExt: number, slaInt: number): RoutedBroker {
    const sla = row.tipo_corretor === 'Externo' ? slaExt : slaInt;
    const expiraEm = new Date();
    expiraEm.setMinutes(expiraEm.getMinutes() + sla);

    return {
      id: row.id,
      nome: row.nome,
      email: row.email,
      tipo_corretor: row.tipo_corretor,
      is_plantonista: row.is_plantonista,
      sla_minutos: sla,
      motivo_atribuicao: motivo,
      expira_em: expiraEm
    };
  }
}
