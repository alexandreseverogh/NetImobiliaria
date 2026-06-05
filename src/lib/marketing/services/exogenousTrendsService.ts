/**
 * FASE 18.1 — Exogenous Trends Service
 * Busca sinais de demanda do Google Trends (unofficial API, server-side only)
 * Sem autenticação necessária. Timeout agressivo + graceful fallback.
 */

export type TrendAngle =
  | 'investment'
  | 'lifestyle'
  | 'family'
  | 'price'
  | 'urgency'
  | 'social'
  | 'luxury'
  | 'other';

export interface TrendScore {
  angle: TrendAngle;
  score: number;       // 0-100 normalizado
  term: string;        // termo usado
  source: 'trends' | 'mock';
  rawValues?: number[];
}

// Fallback mock: scores PT-BR plausíveis por ângulo (sem depender de API)
const MOCK_SCORES: Record<TrendAngle, number> = {
  investment: 65,
  lifestyle:  55,
  family:     72,
  price:      80,
  urgency:    48,
  social:     60,
  luxury:     45,
  other:      70,
};

// Termos primários por ângulo (mirror do SQL seed — fonte de verdade está no DB)
const PRIMARY_TERMS: Record<TrendAngle, string> = {
  investment: 'apartamento para investimento',
  lifestyle:  'apartamento de luxo',
  family:     'apartamento família',
  price:      'apartamento barato',
  urgency:    'lançamento imobiliário',
  social:     'condomínio clube',
  luxury:     'apartamento alto padrão',
  other:      'comprar imóvel',
};

const GEO = 'BR';
const TRENDS_API_BASE = 'https://trends.google.com/trends/api';
const FETCH_TIMEOUT_MS = 5_000;

async function fetchWithTimeout(url: string, opts: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Obtém o widget token para a API multiline do Trends.
 * Retorna null em caso de falha (será tratado com mock).
 */
async function getWidgetToken(keyword: string): Promise<string | null> {
  try {
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const req = JSON.stringify([{
      comparisonItem: [{ keyword, geo: GEO, time: `${formatDate(startDate)} ${formatDate(now)}` }],
      category: 0,
      property: '',
    }]);

    const url = `${TRENDS_API_BASE}/explore?hl=pt-BR&tz=-180&req=${encodeURIComponent(req)}`;
    const res = await fetchWithTimeout(url, {
      headers: {
        'Accept': 'application/json, text/javascript',
        'User-Agent': 'Mozilla/5.0 (compatible; DemandRadar/1.0)',
      },
    });

    if (!res.ok) return null;

    const raw = await res.text();
    // Google prefixes response with ")]}'\n"
    const json = JSON.parse(raw.replace(/^\)\]\}'\n/, ''));
    const widgets: any[] = json?.widgets ?? [];
    const timeWidget = widgets.find((w: any) => w?.id === 'TIMESERIES');
    return timeWidget?.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Busca a série temporal normalizada (0-100) para um keyword.
 * Retorna array de valores ou null em falha.
 */
async function getTimeseriesValues(keyword: string, token: string): Promise<number[] | null> {
  try {
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const req = JSON.stringify({
      time: `${formatDate(startDate)} ${formatDate(now)}`,
      resolution: 'DAY',
      locale: 'pt-BR',
      comparisonItem: [{ geo: { country: GEO }, complexKeywordsRestriction: { keyword: [{ type: 'BROAD', value: keyword }] } }],
      requestOptions: { property: '', backend: 'IZG', category: 0 },
    });

    const url = `${TRENDS_API_BASE}/widgetdata/multiline?hl=pt-BR&tz=-180&req=${encodeURIComponent(req)}&token=${encodeURIComponent(token)}`;
    const res = await fetchWithTimeout(url, {
      headers: {
        'Accept': 'application/json, text/javascript',
        'User-Agent': 'Mozilla/5.0 (compatible; DemandRadar/1.0)',
      },
    });

    if (!res.ok) return null;

    const raw = await res.text();
    const json = JSON.parse(raw.replace(/^\)\]\}'\n/, ''));
    const rows: any[] = json?.default?.timelineData ?? [];
    const values = rows.map((r: any) => (r?.value?.[0] ?? 0) as number);
    return values.length > 0 ? values : null;
  } catch {
    return null;
  }
}

/**
 * Normaliza uma série para a média dos últimos 7 dias (score de "demanda atual").
 */
function computeScore(values: number[]): number {
  if (values.length === 0) return 0;
  const recent = values.slice(-7);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  return Math.round(Math.min(100, Math.max(0, avg)));
}

/**
 * Busca score de demanda para um ângulo via Google Trends.
 * Sempre retorna um valor (mock se a API falhar).
 */
export async function fetchAngleScore(angle: TrendAngle): Promise<TrendScore> {
  const term = PRIMARY_TERMS[angle];

  try {
    const token = await getWidgetToken(term);
    if (!token) throw new Error('no token');

    const rawValues = await getTimeseriesValues(term, token);
    if (!rawValues || rawValues.length === 0) throw new Error('no data');

    const score = computeScore(rawValues);
    return { angle, score, term, source: 'trends', rawValues };
  } catch {
    // Graceful degradation: mock estável com leve variação diária
    const seed = new Date().getDate() + angle.charCodeAt(0);
    const jitter = (seed % 15) - 7; // ±7 pontos
    const score = Math.min(100, Math.max(0, MOCK_SCORES[angle] + jitter));
    return { angle, score, term, source: 'mock' };
  }
}

/**
 * Busca scores para todos os 8 ângulos em paralelo (com timeout individual).
 */
export async function fetchAllAngleScores(): Promise<TrendScore[]> {
  const angles: TrendAngle[] = [
    'investment', 'lifestyle', 'family', 'price',
    'urgency', 'social', 'luxury', 'other',
  ];

  const results = await Promise.allSettled(angles.map(fetchAngleScore));
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    const angle = angles[i];
    return {
      angle,
      score: MOCK_SCORES[angle],
      term: PRIMARY_TERMS[angle],
      source: 'mock' as const,
    };
  });
}
