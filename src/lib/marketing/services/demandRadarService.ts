/**
 * FASE 18.2 — Demand Radar Service (por segmento)
 * Fusão endógeno (campanhas) × exógeno (Google Trends) → quadrante, POR SEGMENTO.
 * Vértices = ângulos do segmento (segment_angle_terms). ZERO MOCK, ZERO HARDCODE.
 */

import pool from '@/lib/database/connection';
import {
  getSegmentAngles,
  getActiveSegmentsForScope,
  type ScopeSegment,
} from './segmentTaxonomyService';

const S = 'campanhasmarketingdigital';

export type Quadrant = 'oceano-azul' | 'saturado' | 'vigiar' | 'ponto-morto';

export interface RadarAngle {
  angle:           string;          // angle_slug
  label:           string;
  endogenous:      number;          // 0-100 (sempre calculável; 0 = sem campanha)
  exogenous:       number | null;   // 0-100 (null = sem dado Trends)
  quadrant:        Quadrant | null;
  spend?:          number;
  exogenousSource: 'db' | 'unavailable';
}

export interface SegmentRadar {
  segmentId:             string;
  segmentName:           string;
  colorTheme:            string | null;
  angles:                RadarAngle[];
  hasTrendsData:         boolean;
  exogenousAvailability: number;     // quantos ângulos têm exógeno
  totalAngles:           number;
  summary: {
    oceanosAzuis: string[];
    saturados:    string[];
    vigiar:       string[];
    pontosMortos: string[];
    semDados:     string[];
  };
}

export interface DemandRadarBySegment {
  segments:    SegmentRadar[];
  generatedAt: string;
  periodDays:  number;
}

const HIGH_THRESHOLD = 50;

function classifyQuadrant(endogenous: number, exogenous: number | null): Quadrant | null {
  if (exogenous === null) return null;
  const endHigh = endogenous >= HIGH_THRESHOLD;
  const exoHigh = exogenous >= HIGH_THRESHOLD;
  if (!endHigh && exoHigh)  return 'oceano-azul';
  if (endHigh  && exoHigh)  return 'saturado';
  if (endHigh  && !exoHigh) return 'vigiar';
  return 'ponto-morto';
}

/**
 * Spend por declared_angle das campanhas de um segmento (tenant+segmento+período),
 * normalizado 0-100 pelo maior share. Usa declared_angle (ângulo autoritativo).
 */
async function getSegmentEndogenous(
  tenantId: string,
  segmentId: string,
  periodDays: number,
  clientId?: string | null,
): Promise<Map<string, { score: number; spend: number }>> {
  const result = new Map<string, { score: number; spend: number }>();
  const clientFilter = clientId && clientId !== 'own' && clientId !== 'all' ? clientId : null;

  const { rows } = await pool.query(
    `SELECT COALESCE(c.declared_angle, 'unknown') AS angle,
            COALESCE(SUM(i.spend), 0)             AS spend,
            COUNT(DISTINCT c.id)                  AS campaigns
     FROM ${S}."Campaign" c
     LEFT JOIN public.clientes cl ON cl.uuid = c.client_id
     LEFT JOIN public.tenants  t  ON t.id    = c.tenant_id
     LEFT JOIN ${S}."Insight"  i
       ON i."campaignId" = c.id AND i.date >= NOW() - ($2 * INTERVAL '1 day')
     WHERE c.tenant_id = $1::uuid
       AND ( cl.segment_id = $3::uuid OR (c.client_id IS NULL AND t.segment_id = $3::uuid) )
       AND ($4::uuid IS NULL OR c.client_id = $4::uuid)
     GROUP BY angle`,
    [tenantId, periodDays, segmentId, clientFilter],
  );

  if (rows.length === 0) return result;

  const spendByAngle = new Map<string, number>();
  const campByAngle  = new Map<string, number>();
  let totalSpend = 0;
  for (const r of rows) {
    const sp = Number(r.spend) || 0;
    spendByAngle.set(r.angle, sp);
    campByAngle.set(r.angle, Number(r.campaigns) || 0);
    totalSpend += sp;
  }

  if (totalSpend === 0) {
    // Sem spend: usa share por contagem de campanhas
    const totalCamp = Array.from(campByAngle.values()).reduce((a, b) => a + b, 0) || 1;
    Array.from(campByAngle.entries()).forEach(([angle, camp]) => {
      result.set(angle, { score: Math.round((camp / totalCamp) * 100), spend: 0 });
    });
  } else {
    const maxSpend = Math.max(...Array.from(spendByAngle.values())) || 1;
    Array.from(spendByAngle.entries()).forEach(([angle, spend]) => {
      result.set(angle, { score: Math.round((spend / maxSpend) * 100), spend });
    });
  }
  return result;
}

/**
 * Exógeno mais recente por ângulo de um segmento (de exogenous_signals).
 */
async function getSegmentExogenous(segmentId: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (angle) angle, score
       FROM ${S}.exogenous_signals
       WHERE segment_id = $1::uuid
       ORDER BY angle, signal_date DESC`,
      [segmentId],
    );
    for (const r of rows) map.set(r.angle, Number(r.score));
  } catch {
    /* non-fatal */
  }
  return map;
}

async function computeOneSegmentRadar(
  seg: ScopeSegment,
  tenantId: string,
  periodDays: number,
  clientId?: string | null,
): Promise<SegmentRadar> {
  const [angles, endoMap, exoMap] = await Promise.all([
    getSegmentAngles(seg.id),
    getSegmentEndogenous(tenantId, seg.id, periodDays, clientId),
    getSegmentExogenous(seg.id),
  ]);

  const radarAngles: RadarAngle[] = angles.map(a => {
    const endo = endoMap.get(a.slug);
    const endogenous = endo?.score ?? 0;
    const exogenous = exoMap.has(a.slug) ? exoMap.get(a.slug)! : null;
    return {
      angle: a.slug,
      label: a.label,
      endogenous,
      exogenous,
      quadrant: classifyQuadrant(endogenous, exogenous),
      spend: endo?.spend,
      exogenousSource: exogenous !== null ? 'db' : 'unavailable',
    };
  });

  const exogenousAvailability = radarAngles.filter(a => a.exogenous !== null).length;

  return {
    segmentId:   seg.id,
    segmentName: seg.name,
    colorTheme:  seg.colorTheme,
    angles:      radarAngles,
    hasTrendsData: exogenousAvailability > 0,
    exogenousAvailability,
    totalAngles: radarAngles.length,
    summary: {
      oceanosAzuis: radarAngles.filter(a => a.quadrant === 'oceano-azul').map(a => a.angle),
      saturados:    radarAngles.filter(a => a.quadrant === 'saturado').map(a => a.angle),
      vigiar:       radarAngles.filter(a => a.quadrant === 'vigiar').map(a => a.angle),
      pontosMortos: radarAngles.filter(a => a.quadrant === 'ponto-morto').map(a => a.angle),
      semDados:     radarAngles.filter(a => a.exogenous === null).map(a => a.angle),
    },
  };
}

/**
 * Radar de Demanda por segmento. Um bloco por segmento no escopo.
 */
export async function computeDemandRadarBySegment(
  periodDays = 30,
  tenantId?: string,
  clientId?: string | null,
): Promise<DemandRadarBySegment> {
  if (!tenantId) {
    return { segments: [], generatedAt: new Date().toISOString(), periodDays };
  }

  const segments = await getActiveSegmentsForScope(tenantId, clientId);
  const radars = await Promise.all(
    segments.map(seg => computeOneSegmentRadar(seg, tenantId, periodDays, clientId)),
  );

  return {
    segments: radars,
    generatedAt: new Date().toISOString(),
    periodDays,
  };
}
