import { getRevenueAttribution, hasCrmModule, type CampaignRevenueRow } from './revenueAttributionService';
import { getAngleInsights, type AngleStat } from './angleInsightsService';

/**
 * Resumo semanal por campanha — 1 a 3 ações concretas por campanha, em linguagem de negócio.
 *
 * Decisão deliberada: as REGRAS são determinísticas (código decide o que recomendar, auditável),
 * e nenhum LLM decide a ação. Um LLM pode redigir o texto depois (fora desta camada), mas nunca
 * escolhe a alavanca. Sem CRM contratado, as regras que dependem de qualidade de lead (fit,
 * fechamento) ficam desligadas e o resumo declara explicitamente `qualityAvailable: false` —
 * nunca preenche com número inventado.
 */

export type SummaryActionKind =
  | 'ADJUST_AUDIENCE'     // lead barato sem perfil de compra
  | 'PRODUCE_ANGLE'       // ângulo com lead qualificado, pouco explorado
  | 'SWAP_ANGLE'          // ângulo sem lead qualificado, campanha consumindo verba
  | 'REVIEW_QUALIFICATION'// leads gerados, nenhum fechamento
  | 'SCALE_BUDGET';       // lead qualificado + verba limitando alcance

export interface SummaryAction {
  kind: SummaryActionKind;
  text: string;            // ação em linguagem de negócio
  reason: string;          // motivo, uma frase, com os números que a justificam
}

export interface CampaignSummary {
  campaignId: string;
  campaignName: string;
  clientId: string | null;
  spend: number;
  leads: number;
  avgFit: number | null;
  dealsWon: number;
  actions: SummaryAction[];
}

export interface WeeklySummaryResult {
  periodDays: number;
  qualityAvailable: boolean;  // false = sem CRM contratado: resumo só de custo, declarado
  qualityUnavailableReason: string | null;
  campaigns: CampaignSummary[];
}

const FIT_LOW = 45;            // abaixo disso o lead é considerado de perfil fraco
const FIT_HIGH = 65;           // acima disso o lead é considerado qualificado
const MIN_LEADS_FOR_RULE = 5;  // amostra mínima antes de qualquer recomendação
const WEAK_SHARE_ALERT = 0.4;  // fração de leads fracos (fit < FIT_LOW) que dispara ajuste de público
const MIN_DAYS_NO_DEAL = 14;   // janela sem fechamento antes de questionar a qualificação

function formatBRL(v: number): string {
  return `R$ ${v.toFixed(2).replace('.', ',')}`;
}

function evaluateCampaign(
  row: CampaignRevenueRow,
  periodDays: number,
  qualityAvailable: boolean,
  bestAngle: AngleStat | null,
  weakAngle: AngleStat | null,
): SummaryAction[] {
  const actions: SummaryAction[] = [];
  if (row.leadsIdentified < MIN_LEADS_FOR_RULE) return actions;

  const cpl = row.leadsIdentified > 0 ? row.spend / row.leadsIdentified : null;

  if (qualityAvailable && row.avgFit !== null) {
    const weakShare = row.leadsWithFit > 0 ? row.weakLeads / row.leadsWithFit : 0;
    if (weakShare >= WEAK_SHARE_ALERT) {
      actions.push({
        kind: 'ADJUST_AUDIENCE',
        text: 'Revise o público: uma parte relevante dos leads tem pouco perfil de compra.',
        reason: `${row.weakLeads} de ${row.leadsWithFit} leads com fit abaixo de ${FIT_LOW} (${Math.round(weakShare * 100)}%).`,
      });
    }
    if (row.avgFit >= FIT_HIGH && row.leadsIdentified >= MIN_LEADS_FOR_RULE && cpl !== null) {
      actions.push({
        kind: 'SCALE_BUDGET',
        text: 'Aumente a verba desta campanha: ela gera leads qualificados.',
        reason: `Fit médio ${row.avgFit.toFixed(0)}/100 e CPL ${formatBRL(cpl)}.`,
      });
    }
    if (
      row.dealsWon === 0 &&
      periodDays >= MIN_DAYS_NO_DEAL &&
      row.leadsIdentified >= MIN_LEADS_FOR_RULE
    ) {
      actions.push({
        kind: 'REVIEW_QUALIFICATION',
        text: 'Revise a oferta e o funil: há leads, mas nenhum negócio fechou no período.',
        reason: `${row.leadsIdentified} leads e 0 negócios fechados em ${periodDays} dias.`,
      });
    }
  }

  if (bestAngle && bestAngle.avgFit !== null && bestAngle.avgFit >= FIT_HIGH && bestAngle.campaigns === 1) {
    actions.push({
      kind: 'PRODUCE_ANGLE',
      text: `Produza mais criativos com o ângulo "${bestAngle.label}": ele traz leads qualificados e tem pouca exploração.`,
      reason: `Fit médio ${bestAngle.avgFit.toFixed(0)}/100 em ${bestAngle.leadsWithFit} leads, usado em só 1 campanha.`,
    });
  }

  if (weakAngle && weakAngle.avgFit !== null && weakAngle.avgFit < FIT_LOW && weakAngle.spend > 0) {
    actions.push({
      kind: 'SWAP_ANGLE',
      text: `Troque o ângulo "${weakAngle.label}" nos criativos: ele consome verba sem trazer perfil de compra.`,
      reason: `Fit médio ${weakAngle.avgFit.toFixed(0)}/100 com ${formatBRL(weakAngle.spend)} investidos.`,
    });
  }

  return actions.slice(0, 3);
}

/**
 * Gera o resumo do período. `clientId` segue a convenção do módulo: undefined = todas,
 * null/'own' = só próprias, uuid = só aquele cliente.
 */
export async function getWeeklySummary(params: {
  tenantId: string;
  clientId?: string | null;
  periodDays?: number;
}): Promise<WeeklySummaryResult> {
  const periodDays = params.periodDays ?? 7;
  const crm = await hasCrmModule(params.tenantId);

  const angles = await getAngleInsights(periodDays, params.tenantId, params.clientId ?? undefined);
  const withFit = angles.angleStats.filter((a) => a.avgFit !== null && a.campaigns > 0);
  const bestAngle = withFit.length > 0
    ? withFit.reduce((best, a) => (a.avgFit! > best.avgFit! ? a : best))
    : null;
  const weakAngle = withFit.length > 0
    ? withFit.reduce((worst, a) => (a.avgFit! < worst.avgFit! ? a : worst))
    : null;

  if (!crm) {
    return {
      periodDays,
      qualityAvailable: false,
      qualityUnavailableReason:
        'O módulo de CRM não está contratado: não há como medir a qualidade dos leads nem fechamento de negócios. O resumo mostra apenas custo e volume.',
      campaigns: [],
    };
  }

  const revenue = await getRevenueAttribution({
    tenantId: params.tenantId,
    clientId: params.clientId,
    periodDays,
  });

  const campaigns: CampaignSummary[] = revenue.campaigns.map((row) => ({
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    clientId: row.clientId,
    spend: row.spend,
    leads: row.leadsIdentified,
    avgFit: row.avgFit,
    dealsWon: row.dealsWon,
    actions: evaluateCampaign(row, periodDays, true, bestAngle, weakAngle),
  }));

  return {
    periodDays,
    qualityAvailable: true,
    qualityUnavailableReason: null,
    campaigns,
  };
}
