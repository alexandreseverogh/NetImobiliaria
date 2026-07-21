import type { DistributionStrategy } from './types'
import { ownerOfAssetStrategy } from './ownerOfAssetStrategy'
import { geoAreaStrategy } from './geoAreaStrategy'
import { roundRobinStrategy } from './roundRobinStrategy'
import { plantonistaFallbackStrategy } from './plantonistaFallbackStrategy'

export * from './types'

/**
 * Catálogo de estratégias disponíveis — o vocabulário é código (implementar um algoritmo novo
 * sempre exige um arquivo novo aqui), mas QUAIS se aplicam a cada segmento, em que ordem e com
 * que parâmetros é 100% dirigido por dado (segment_distribution_strategies, configurado pelo
 * Master). Mesmo espírito do catálogo de redes de anúncio/provedores de LLM já usados na
 * plataforma. Adicionar uma estratégia nova = registrar aqui; nenhum segmento existente muda
 * de comportamento até que o Master escolha usá-la.
 */
export const DISTRIBUTION_STRATEGIES: Record<string, DistributionStrategy> = {
  [ownerOfAssetStrategy.key]: ownerOfAssetStrategy,
  [geoAreaStrategy.key]: geoAreaStrategy,
  [roundRobinStrategy.key]: roundRobinStrategy,
  [plantonistaFallbackStrategy.key]: plantonistaFallbackStrategy,
}

export const DISTRIBUTION_STRATEGY_CATALOG = [
  { key: ownerOfAssetStrategy.key, label: 'Dono do Ativo', description: 'Atribui direto pra quem já é o responsável fixo (ex.: corretor do imóvel). Precisa de tabela/coluna configuradas.' },
  { key: geoAreaStrategy.key, label: 'Área Geográfica', description: 'Round-robin entre quem atua no estado/cidade do lead — externos primeiro, depois internos.' },
  { key: roundRobinStrategy.key, label: 'Fila (Round-Robin)', description: 'Sem geografia nem dono — só quem recebeu menos leads recentemente.' },
  { key: plantonistaFallbackStrategy.key, label: 'Plantonista (Fallback)', description: 'Última etapa — garante que sempre haja alguém responsável, mesmo sem match nas anteriores.' },
] as const
