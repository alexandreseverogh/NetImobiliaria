import {
  AdNetworkService,
  CreateCampaignInput,
  GoogleCampaignInput,
  CreateCampaignResult,
  NetworkInsight,
  TargetingResult,
  UploadResult,
  DateRange,
} from '../types';

/**
 * docs/PLANO_TIKTOK.md (T1) — adapter fake do TikTok, mesmo espírito de FakeMetaAdapter.
 * Implementa `AdNetworkService` direto (ao contrário do fake do Google, que precisou ESTENDER
 * `GoogleAdsAdapter` por causa de um `instanceof` check em `agentMonitor.ts` — não existe check
 * equivalente pro TikTok em lugar nenhum do código, então herdar de uma classe real não é
 * necessário aqui).
 *
 * Métrica de vídeo — ponto deliberado (docs/PLANO_TIKTOK.md §6): TikTok reporta retenção em
 * "watched 2s", não 3s (Meta). Gravado no mesmo slot `videoViews3s` (é o campo que os
 * consumidores de Hook Rate já leem) — comparável de verdade só porque o benchmark de retenção
 * agora é resolvido POR REDE (T0, benchmarkResolver.ts), não porque os números significassem o
 * mesmo. Sem T0, isto inflaria o Hook Rate do TikTok (2s é mais fácil de bater que 3s).
 *
 * Nunca deve ser alcançável por um tenant real — só instanciado pela factory quando as
 * credentials trazem o marcador sentinela `access_token === '__SIMULATED__'`.
 */
export class FakeTikTokAdapter implements AdNetworkService {
  readonly network = 'tiktok' as const;

  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    return { valid: true };
  }

  async uploadCreative(imagePath: string): Promise<UploadResult> {
    return { hash: `fake_tiktok_asset_${hashStr(imagePath)}`, url: imagePath };
  }

  async createCampaign(input: CreateCampaignInput | GoogleCampaignInput): Promise<CreateCampaignResult> {
    const seed = hashStr(JSON.stringify(input));
    return {
      externalId: `fake_tiktok_campaign_${seed}`,
      externalAdSetId: `fake_tiktok_adgroup_${seed}`,
      externalAdId: `fake_tiktok_ad_${seed}`,
      networkMetadata: { simulated: true, status: 'DISABLE' },
    };
  }

  async updateCampaignStatus(externalId: string, status: 'ACTIVE' | 'PAUSED'): Promise<void> {
    // no-op — nenhuma rede real por trás do fake
  }

  async fetchInsights(externalId: string, dateRange: DateRange): Promise<NetworkInsight[]> {
    const seed = hashStr(externalId);
    const days = enumerateDates(dateRange.since, dateRange.until);
    return days.map((date, i) => {
      const rnd = seededRandom(seed + i);
      // TikTok tipicamente entrega CTR/volume maiores e CPM menor que Meta/Google — números
      // calibrados pra refletir esse padrão estrutural, é o que T0 (benchmark por rede) existe
      // pra julgar corretamente (não pelo padrão de outra rede).
      const impressions = 4000 + Math.floor(rnd() * 8000);
      const clicks = Math.max(1, Math.round(impressions * (0.02 + rnd() * 0.03)));
      const spend = Math.round((clicks * (1.2 + rnd() * 1.8)) * 100) / 100;
      const leads = Math.max(0, Math.round(clicks * (rnd() * 0.06))); // intenção mais fria
      const watched2s = Math.round(impressions * (0.35 + rnd() * 0.3));
      return {
        date,
        impressions,
        reach: Math.round(impressions * 0.65),
        clicks,
        spend,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        frequency: 1 + rnd() * 2,
        conversions: leads,
        leads,
        // "watched_2s" do TikTok mapeado pro slot videoViews3s — ver nota da classe acima.
        videoViews3s: watched2s,
        videoViews15s: Math.round(watched2s * 0.4),
        videoViews25Pct: Math.round(impressions * 0.5),
        videoViews50Pct: Math.round(impressions * 0.3),
        videoViews75Pct: Math.round(impressions * 0.15),
        videoViews100Pct: Math.round(impressions * 0.08),
        breakdowns: { simulated: true, network: 'tiktok' },
      };
    });
  }

  async searchTargeting(type: 'interest' | 'location' | 'audience', query: string): Promise<TargetingResult[]> {
    if (type === 'interest') {
      return [
        { id: `fake_tt_int_${hashStr(query)}_1`, name: `${query} (simulado TikTok)`, type: 'interest', audience_size: 800000 },
      ];
    }
    if (type === 'location') {
      return [{ id: `fake_tt_loc_${hashStr(query)}`, name: `${query} (simulado)`, type: 'city' }];
    }
    return [];
  }
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function enumerateDates(since: string, until: string): string[] {
  const out: string[] = [];
  const start = new Date(since + 'T00:00:00Z');
  const end = new Date(until + 'T00:00:00Z');
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
