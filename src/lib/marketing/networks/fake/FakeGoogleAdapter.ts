import { GoogleAdsAdapter, GoogleCredentials } from '../google/GoogleAdsAdapter';
import {
  CreateCampaignInput,
  GoogleCampaignInput,
  CreateCampaignResult,
  NetworkInsight,
  TargetingResult,
  UploadResult,
  DateRange,
} from '../types';

/**
 * Trilha E (docs/TESTE_RIGOROSO_LEADEVENTS_2026-07-22.md) — adapter fake do Google, mesmo
 * espírito do FakeMetaAdapter, mas ESTENDE `GoogleAdsAdapter` (não implementa a interface do
 * zero) porque `agentMonitor.ts` (linha ~236) faz `networkService instanceof GoogleAdsAdapter`
 * antes de coletar Search Terms — um adapter fake que só implementasse `AdNetworkService`
 * nunca passaria nesse check e o cron real nunca chamaria `fetchSearchTerms`. Estender a classe
 * real e sobrescrever todo método público evita alterar esse check em código de produção.
 *
 * O construtor da classe pai (`new GoogleAdsApi(...)`, `.Customer(...)`) só monta objetos de
 * configuração do SDK — não faz nenhuma chamada de rede — então passar credenciais fake pro
 * `super()` é seguro: nenhum desses objetos é usado, já que este adapter nunca chama `super.*`.
 *
 * Nunca deve ser alcançável por um tenant real — só instanciado pela factory quando as
 * credentials trazem o marcador sentinela `developer_token === '__SIMULATED__'`.
 */
export class FakeGoogleAdapter extends GoogleAdsAdapter {
  constructor() {
    const fakeCreds: GoogleCredentials = {
      developer_token: '__SIMULATED__',
      client_id: 'fake',
      client_secret: 'fake',
      refresh_token: 'fake',
      customer_id: '0000000000',
    };
    super(fakeCreds);
  }

  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    return { valid: true };
  }

  async uploadCreative(imagePath: string): Promise<UploadResult> {
    return { hash: `fake_google_asset_${hashStr(imagePath)}`, url: imagePath };
  }

  async createCampaign(input: CreateCampaignInput | GoogleCampaignInput): Promise<CreateCampaignResult> {
    const seed = hashStr(JSON.stringify(input));
    return {
      externalId: `${seed}`,
      networkMetadata: { simulated: true, status: 'PAUSED', campaignType: 'PERFORMANCE_MAX' },
    };
  }

  async updateCampaignStatus(externalId: string, status: 'ACTIVE' | 'PAUSED'): Promise<void> {
    // no-op — nenhuma rede real por trás do fake
  }

  async addNegativeKeyword(
    campaignId: string,
    term: string,
    matchType: 'BROAD' | 'PHRASE' | 'EXACT',
  ): Promise<void> {
    // no-op — chamado pelo agente de negativação; o teste confirma a chamada via spy/log,
    // não via efeito real numa conta Google
  }

  async fetchSearchTerms(externalId: string, dateRange: DateRange): Promise<Array<{
    searchTerm: string;
    matchType: 'BROAD' | 'PHRASE' | 'EXACT' | 'UNKNOWN';
    date: string;
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
  }>> {
    const seed = hashStr(externalId);
    const terms = ['imovel barato simulado', 'aluguel simulado sp', 'comprar apartamento simulado'];
    const days = enumerateDates(dateRange.since, dateRange.until);
    const out: Array<{
      searchTerm: string; matchType: 'BROAD' | 'PHRASE' | 'EXACT' | 'UNKNOWN'; date: string;
      impressions: number; clicks: number; cost: number; conversions: number;
    }> = [];
    for (const date of days) {
      terms.forEach((searchTerm, ti) => {
        const rnd = seededRandom(seed + hashStr(searchTerm) + hashStr(date));
        const clicks = Math.max(1, Math.round(rnd() * 12));
        out.push({
          searchTerm,
          matchType: 'BROAD',
          date,
          impressions: clicks * (3 + Math.floor(rnd() * 4)),
          clicks,
          cost: Math.round(clicks * (150 + rnd() * 200)),
          // O último termo da lista nunca converte — candidato estável de negativação nos testes.
          conversions: ti === terms.length - 1 ? 0 : Math.round(rnd() * 2),
        });
      });
    }
    return out;
  }

  async fetchInsights(externalId: string, dateRange: DateRange): Promise<NetworkInsight[]> {
    const seed = hashStr(externalId);
    const days = enumerateDates(dateRange.since, dateRange.until);
    return days.map((date, i) => {
      const rnd = seededRandom(seed + i);
      const impressions = 2000 + Math.floor(rnd() * 6000);
      const clicks = Math.max(1, Math.round(impressions * (0.01 + rnd() * 0.02)));
      const spend = Math.round(clicks * (300 + rnd() * 200));
      const conversions = Math.max(0, Math.round(clicks * (rnd() * 0.1)));
      return {
        date,
        impressions,
        reach: impressions,
        clicks,
        spend,
        cpc: clicks > 0 ? Math.round(spend / clicks) : 0,
        cpm: impressions > 0 ? Math.round((spend / impressions) * 1000) : 0,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        frequency: 1,
        conversions,
        leads: conversions,
        conversionsValue: conversions * 50000,
        searchImpressionShare: 30 + rnd() * 40,
        searchBudgetLostIs: rnd() * 20,
        searchRankLostIs: rnd() * 10,
      };
    });
  }

  async searchTargeting(type: 'interest' | 'location' | 'audience', query: string): Promise<TargetingResult[]> {
    if (type === 'interest') {
      return [
        { id: `fake_g_seg_${hashStr(query)}_1`, name: `In-market: ${query} (simulado)`, type: 'IN_MARKET' },
      ];
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
