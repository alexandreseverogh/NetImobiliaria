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
 * Trilha E (docs/TESTE_RIGOROSO_LEADEVENTS_2026-07-22.md) — adapter fake do Meta, mesma
 * interface `AdNetworkService` real, plugado na mesma fábrica (`factory.ts`). Faz o cron real
 * de sync (`agentMonitor.syncMetrics`) e a criação real de campanha (`POST /campaigns`) rodarem
 * de ponta a ponta sem nenhuma chamada de rede — só a resposta do "outro lado" é simulada.
 *
 * Determinístico por design: os números de `fetchInsights` derivam de um hash simples do
 * `externalId` + data, então a mesma campanha sempre produz a mesma série (útil pra comparar
 * resultado antes/depois de uma mudança de código, sem re-sortear tudo a cada chamada).
 *
 * Nunca deve ser alcançável por um tenant real — só é instanciado pela factory quando as
 * credentials trazem o marcador sentinela `access_token === '__SIMULATED__'`.
 */
export class FakeMetaAdapter implements AdNetworkService {
  readonly network = 'meta' as const;

  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    return { valid: true };
  }

  async uploadCreative(imagePath: string): Promise<UploadResult> {
    return { hash: `fake_meta_hash_${hashStr(imagePath)}`, url: imagePath };
  }

  async createCampaign(input: CreateCampaignInput | GoogleCampaignInput): Promise<CreateCampaignResult> {
    const seed = hashStr(JSON.stringify(input));
    return {
      externalId: `fake_meta_campaign_${seed}`,
      externalAdSetId: `fake_meta_adset_${seed}`,
      externalAdId: `fake_meta_ad_${seed}`,
      networkMetadata: { simulated: true, status: 'PAUSED' },
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
      const impressions = 1000 + Math.floor(rnd() * 4000);
      const clicks = Math.max(1, Math.round(impressions * (0.008 + rnd() * 0.02)));
      const spend = Math.round((clicks * (2 + rnd() * 3)) * 100) / 100;
      const leads = Math.max(0, Math.round(clicks * (rnd() * 0.15)));
      return {
        date,
        impressions,
        reach: Math.round(impressions * 0.7),
        clicks,
        spend,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        frequency: 1 + rnd() * 1.5,
        conversions: leads,
        leads,
        videoViews3s: 0,
        videoViews15s: 0,
        breakdowns: { simulated: true },
      };
    });
  }

  async searchTargeting(type: 'interest' | 'location' | 'audience', query: string): Promise<TargetingResult[]> {
    if (type === 'interest') {
      return [
        { id: `fake_int_${hashStr(query)}_1`, name: `${query} (simulado)`, type: 'interests', audience_size: 500000 },
      ];
    }
    if (type === 'location') {
      return [{ id: `fake_loc_${hashStr(query)}`, name: `${query} (simulado)`, type: 'city' }];
    }
    return [];
  }
}

/** Hash string→int determinístico (não criptográfico, só pra semear os números fake). */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Gerador pseudo-aleatório determinístico (LCG simples) — mesma seed sempre produz a mesma
 *  sequência, ao contrário de Math.random(). */
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
