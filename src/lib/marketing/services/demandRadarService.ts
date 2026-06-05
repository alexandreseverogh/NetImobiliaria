/**
 * FASE 18.1 — Demand Radar Service
 * Fusão endógeno (campanhas) × exógeno (Google Trends) → quadrante estratégico
 */

import { getAngleInsights, type AngleStat } from './angleInsightsService';
import { fetchAllAngleScores, type TrendAngle, type TrendScore } from './exogenousTrendsService';

export type Quadrant = 'oceano-azul' | 'saturado' | 'vigiar' | 'ponto-morto';

export interface RadarAngle {
  angle: TrendAngle;
  label: string;
  endogenous: number;    // 0-100: força interna (campanhas)
  exogenous: number;     // 0-100: demanda externa (Trends)
  quadrant: Quadrant;
  spend?: number;
  cpl?: number;
  exogenousSource: 'trends' | 'mock';
}

export interface DemandRadarResult {
  angles: RadarAngle[];
  generatedAt: string;   // ISO
  endogenousPeriodDays: number;
  hasTrendsData: boolean;
  summary: {
    oceanosAzuis: TrendAngle[];
    saturados: TrendAngle[];
    vigiar: TrendAngle[];
    pontosMortos: TrendAngle[];
  };
}

const ANGLE_LABELS: Record<TrendAngle, string> = {
  investment: 'Investimento',
  lifestyle:  'Estilo de Vida',
  family:     'Família',
  price:      'Preço',
  urgency:    'Urgência',
  social:     'Social',
  luxury:     'Luxo',
  other:      'Outros',
};

// Limites dos quadrantes (percentil do score normalizado)
const HIGH_THRESHOLD = 50; // >50 = alto

function classifyQuadrant(endogenous: number, exogenous: number): Quadrant {
  const endHigh = endogenous >= HIGH_THRESHOLD;
  const exoHigh = exogenous >= HIGH_THRESHOLD;

  if (!endHigh && exoHigh)  return 'oceano-azul';  // oportunidade
  if (endHigh  && exoHigh)  return 'saturado';      // manter
  if (endHigh  && !exoHigh) return 'vigiar';        // cuidado
  return 'ponto-morto';                              // baixa prioridade
}

/**
 * Normaliza AngleStats → 0-100 baseado em share of spend relativo.
 * Se não há campanhas para um ângulo, retorna 0.
 */
function normalizeEndogenous(stats: AngleStat[]): Map<string, number> {
  if (stats.length === 0) return new Map();

  const spendMap = new Map<string, number>();
  let totalSpend = 0;

  for (const s of stats) {
    const sp = Number(s.spend) || 0;
    spendMap.set(s.angle, sp);
    totalSpend += sp;
  }

  const result = new Map<string, number>();
  if (totalSpend === 0) {
    // Sem dados financeiros: usa contagem de campanhas proporcional
    const totalCampaigns = stats.reduce((acc, s) => acc + (s.campaigns || 0), 0) || 1;
    for (const s of stats) {
      result.set(s.angle, Math.round(((s.campaigns || 0) / totalCampaigns) * 100));
    }
  } else {
    // Share of spend normalizado
    const spendValues = Array.from(spendMap.values());
    const maxShare = spendValues.length > 0 ? Math.max(...spendValues) : 1;
    const safeMax = maxShare || 1;
    Array.from(spendMap.entries()).forEach(([angle, spend]) => {
      result.set(angle, Math.round((spend / safeMax) * 100));
    });
  }

  return result;
}

/**
 * Computa o Radar de Demanda fusionando dados endógenos e exógenos.
 */
export async function computeDemandRadar(
  periodDays = 30,
  tenantId?: string,
  clientId?: number,
): Promise<DemandRadarResult> {
  const angles: TrendAngle[] = [
    'investment', 'lifestyle', 'family', 'price',
    'urgency', 'social', 'luxury', 'other',
  ];

  // getAngleInsights expects clientId as string
  const clientIdStr = clientId != null ? String(clientId) : undefined;

  // Buscar em paralelo: insights endógenos + scores exógenos
  const [insightsResult, trendScores] = await Promise.all([
    getAngleInsights(periodDays, tenantId, clientIdStr).catch(() => null),
    fetchAllAngleScores().catch(() => [] as TrendScore[]),
  ]);

  const endoMap = normalizeEndogenous(insightsResult?.angleStats ?? []);
  const exoMap = new Map<string, TrendScore>(trendScores.map(s => [s.angle, s]));

  const hasTrendsData = trendScores.some(s => s.source === 'trends');

  const radarAngles: RadarAngle[] = angles.map(angle => {
    const endogenous = endoMap.get(angle) ?? 0;
    const trend = exoMap.get(angle);
    const exogenous = trend?.score ?? 50;
    const stat = insightsResult?.angleStats.find(s => s.angle === angle);

    return {
      angle,
      label: ANGLE_LABELS[angle],
      endogenous,
      exogenous,
      quadrant: classifyQuadrant(endogenous, exogenous),
      spend: stat ? Number(stat.spend) : undefined,
      cpl:   stat ? Number(stat.cpl)   : undefined,
      exogenousSource: trend?.source ?? 'mock',
    };
  });

  const summary = {
    oceanosAzuis: radarAngles.filter(a => a.quadrant === 'oceano-azul').map(a => a.angle),
    saturados:    radarAngles.filter(a => a.quadrant === 'saturado').map(a => a.angle),
    vigiar:       radarAngles.filter(a => a.quadrant === 'vigiar').map(a => a.angle),
    pontosMortos: radarAngles.filter(a => a.quadrant === 'ponto-morto').map(a => a.angle),
  };

  return {
    angles: radarAngles,
    generatedAt: new Date().toISOString(),
    endogenousPeriodDays: periodDays,
    hasTrendsData,
    summary,
  };
}
