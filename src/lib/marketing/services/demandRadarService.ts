/**
 * FASE 18.1 — Demand Radar Service
 * Fusão endógeno (campanhas) × exógeno (Google Trends) → quadrante estratégico.
 * ZERO MOCK — dados ausentes ficam null, nunca inventados.
 */

import { getAngleInsights, type AngleStat } from './angleInsightsService';
import { fetchAllAngleScores, type TrendAngle, type TrendScore } from './exogenousTrendsService';

export type Quadrant = 'oceano-azul' | 'saturado' | 'vigiar' | 'ponto-morto';

export interface RadarAngle {
  angle:            TrendAngle;
  label:            string;
  endogenous:       number;        // 0-100: força interna (campanhas) — sempre calculável
  exogenous:        number | null; // 0-100: demanda externa (Trends) — null se indisponível
  quadrant:         Quadrant | null; // null quando exógeno ausente
  spend?:           number;
  cpl?:             number;
  exogenousSource:  'trends' | 'db' | 'unavailable';
}

export interface DemandRadarResult {
  angles:                RadarAngle[];
  generatedAt:           string;    // ISO
  endogenousPeriodDays:  number;
  hasTrendsData:         boolean;   // true se ao menos 1 ângulo tem score real
  exogenousAvailability: number;    // 0-8: quantos ângulos têm dados exógenos
  summary: {
    oceanosAzuis: TrendAngle[];
    saturados:    TrendAngle[];
    vigiar:       TrendAngle[];
    pontosMortos: TrendAngle[];
    semDados:     TrendAngle[];     // ângulos sem exógeno disponível
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

const HIGH_THRESHOLD = 50; // ≥50 = alto

function classifyQuadrant(endogenous: number, exogenous: number | null): Quadrant | null {
  if (exogenous === null) return null; // sem dados — sem classificação
  const endHigh = endogenous >= HIGH_THRESHOLD;
  const exoHigh = exogenous >= HIGH_THRESHOLD;
  if (!endHigh && exoHigh)  return 'oceano-azul';
  if (endHigh  && exoHigh)  return 'saturado';
  if (endHigh  && !exoHigh) return 'vigiar';
  return 'ponto-morto';
}

/**
 * Normaliza AngleStats → 0-100 baseado em share of spend relativo.
 * Se não há campanhas para um ângulo, retorna 0. Nunca retorna mock.
 */
function normalizeEndogenous(stats: AngleStat[]): Map<string, number> {
  const result = new Map<string, number>();
  if (stats.length === 0) return result;

  const spendMap = new Map<string, number>();
  let totalSpend = 0;

  for (const s of stats) {
    const sp = Number(s.spend) || 0;
    spendMap.set(s.angle, sp);
    totalSpend += sp;
  }

  if (totalSpend === 0) {
    // Sem dados financeiros: usa contagem de campanhas proporcional
    const totalCampaigns = stats.reduce((acc, s) => acc + (s.campaigns || 0), 0) || 1;
    for (const s of stats) {
      result.set(s.angle, Math.round(((s.campaigns || 0) / totalCampaigns) * 100));
    }
  } else {
    const spendValues = Array.from(spendMap.values());
    const maxShare    = spendValues.length > 0 ? Math.max(...spendValues) : 1;
    const safeMax     = maxShare || 1;
    Array.from(spendMap.entries()).forEach(([angle, spend]) => {
      result.set(angle, Math.round((spend / safeMax) * 100));
    });
  }

  return result;
}

/**
 * Lê os scores exógenos mais recentes do banco de dados.
 * Usados quando a API ao vivo não está disponível (dados do cron de ontem são válidos).
 */
async function readExogenousFromDB(
  pool: any,
): Promise<Map<string, { score: number; source: 'db' }>> {
  const result = new Map<string, { score: number; source: 'db' }>();
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (angle) angle, score
       FROM campanhasmarketingdigital.exogenous_signals
       ORDER BY angle, signal_date DESC`,
    );
    for (const row of rows) {
      result.set(row.angle, { score: Number(row.score), source: 'db' });
    }
  } catch {
    // DB read failure is non-fatal
  }
  return result;
}

/**
 * Computa o Radar de Demanda fusionando dados endógenos e exógenos.
 * Exógenos vêm do DB (se disponível) ou da API ao vivo. Nunca mock.
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

  const clientIdStr = clientId != null ? String(clientId) : undefined;

  // Importa pool aqui para evitar circular em módulos server-only
  const pool = (await import('@/lib/database/connection')).default;

  // Busca em paralelo: insights endógenos + exógenos do DB
  const [insightsResult, dbExogenous] = await Promise.all([
    getAngleInsights(periodDays, tenantId, clientIdStr).catch(() => null),
    readExogenousFromDB(pool),
  ]);

  // Se não há dados no DB, tenta busca ao vivo (pode falhar — sem mock)
  let liveScores: TrendScore[] = [];
  if (dbExogenous.size === 0) {
    liveScores = await fetchAllAngleScores().catch(() => []);
  }

  const endoMap = normalizeEndogenous(insightsResult?.angleStats ?? []);

  const radarAngles: RadarAngle[] = angles.map(angle => {
    const endogenous = endoMap.get(angle) ?? 0;

    // Prioridade: DB > live > null
    let exogenous:      number | null        = null;
    let exogenousSource: 'trends' | 'db' | 'unavailable' = 'unavailable';

    const dbEntry = dbExogenous.get(angle);
    if (dbEntry) {
      exogenous       = dbEntry.score;
      exogenousSource = 'db';
    } else {
      const live = liveScores.find(s => s.angle === angle);
      if (live && live.score !== null) {
        exogenous       = live.score;
        exogenousSource = 'trends';
      }
    }

    const stat = insightsResult?.angleStats.find(s => s.angle === angle);

    return {
      angle,
      label:  ANGLE_LABELS[angle],
      endogenous,
      exogenous,
      quadrant: classifyQuadrant(endogenous, exogenous),
      spend:  stat ? Number(stat.spend)   : undefined,
      cpl:    stat ? Number(stat.cpl)     : undefined,
      exogenousSource,
    };
  });

  const hasTrendsData        = radarAngles.some(a => a.exogenous !== null);
  const exogenousAvailability = radarAngles.filter(a => a.exogenous !== null).length;

  const summary = {
    oceanosAzuis: radarAngles.filter(a => a.quadrant === 'oceano-azul').map(a => a.angle),
    saturados:    radarAngles.filter(a => a.quadrant === 'saturado').map(a => a.angle),
    vigiar:       radarAngles.filter(a => a.quadrant === 'vigiar').map(a => a.angle),
    pontosMortos: radarAngles.filter(a => a.quadrant === 'ponto-morto').map(a => a.angle),
    semDados:     radarAngles.filter(a => a.exogenous === null).map(a => a.angle),
  };

  return {
    angles: radarAngles,
    generatedAt: new Date().toISOString(),
    endogenousPeriodDays: periodDays,
    hasTrendsData,
    exogenousAvailability,
    summary,
  };
}
