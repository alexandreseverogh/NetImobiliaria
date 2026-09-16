/**
 * Motor de distribuição — estratégias plugáveis por segmento.
 *
 * Cada segmento declara uma lista ORDENADA de estratégias (tabela
 * public.segment_distribution_strategies, configurada pelo Master em
 * /admin/master/segments) — o DistributionEngine (src/lib/routing/distributionEngine.ts)
 * itera essa lista e para na primeira que encontrar um candidato. Isso substitui a cascata
 * fixa "dono do ativo → geográfico → plantonista" que só fazia sentido pro Imobiliário —
 * outros segmentos (Saúde, B2B nacional, etc.) podem montar sua própria combinação sem
 * código novo, desde que reusem as estratégias já implementadas aqui.
 *
 * Mesmo padrão adapter já usado na plataforma pra redes de anúncio (AdNetworkService) e
 * provedores de LLM (getLlmClient): o VOCABULÁRIO de estratégias é código (alguém precisa
 * implementar o algoritmo), mas QUAIS se aplicam a um segmento, em que ordem e com que
 * parâmetros é 100% dado.
 */

export interface DistributionStrategyContext {
  tenantId: string
  targetId?: string | number
  /** Dono já resolvido pelo chamador (compat com callers legados que resolvem antes de
   *  chamar o engine) — quando presente, ownerOfAssetStrategy usa direto, sem consultar
   *  targetTable/targetIdColumn/ownerColumn do config. */
  sourceOwnerId?: string
  estadoFk?: string
  cidadeFk?: string
  /** Nome do role de vendedor pra este segmento (system_segments.distribution_role_name) */
  sellerRoleName: string
  excludeIds: string[]
  dbClient: any
  /** Parâmetros específicos desta estratégia (segment_distribution_strategies.config) */
  config: Record<string, any>
}

export interface DistributionStrategyResult {
  id: string
  nome: string
  email: string
  tipo_corretor: 'Externo' | 'Interno'
  is_plantonista: boolean
  motivo_atribuicao: string
  sla_minutos: number
  expira_em: Date | null
}

export interface DistributionStrategy {
  key: string
  findCandidate(ctx: DistributionStrategyContext): Promise<DistributionStrategyResult | null>
}
