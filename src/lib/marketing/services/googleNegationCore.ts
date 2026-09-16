import prisma from '../prisma';
import { getNetworkServiceForTenant } from '../networks/factory';

/**
 * FASE 1 (Google Ads) A6/A7 — mecânica real de negativar um termo (chamada Google Ads API +
 * memória em GoogleNegativeKeyword + marca o GoogleSearchTerm como tratado).
 *
 * Módulo isolado (sem depender de agentDecisor.ts nem de googleNegationService.ts) pra evitar
 * import circular — é consumido pelos DOIS caminhos que podem negativar um termo:
 *   1. agentDecisor.ts (executeAction, ação ADD_NEGATIVE_KEYWORD, automática)
 *   2. api/admin/campanhas/google/search-terms/negate (manual, via UI de revisão)
 */
export async function applyNegation(
  tenantId: string,
  campaignId: string,
  externalId: string | null | undefined,
  term: string,
  matchType: string,
  addedBy: 'agent' | 'human',
): Promise<void> {
  if (externalId) {
    const networkService = await getNetworkServiceForTenant(tenantId, 'google') as any;
    if (typeof networkService.addNegativeKeyword === 'function') {
      await networkService.addNegativeKeyword(externalId, term, matchType);
    }
  }

  await prisma.googleNegativeKeyword.upsert({
    where: { tenantId_campaignId_term: { tenantId, campaignId, term } },
    update: { matchType, addedBy },
    create: { tenantId, campaignId, term, matchType, addedBy },
  });
  await prisma.googleSearchTerm.updateMany({
    where: { tenantId, campaignId, searchTerm: term },
    data: { status: 'negated' },
  });
}
