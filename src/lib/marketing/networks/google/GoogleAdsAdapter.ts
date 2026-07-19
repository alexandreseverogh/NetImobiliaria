import * as fs from 'fs';
import * as path from 'path';
import { GoogleAdsApi, Customer, enums } from 'google-ads-api';
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

export interface GoogleCredentials {
  developer_token: string;
  client_id: string;
  client_secret: string;
  refresh_token: string;
  customer_id: string;
}

const MIME_BY_EXT: Record<string, number> = {
  '.jpg':  enums.MimeType.IMAGE_JPEG,
  '.jpeg': enums.MimeType.IMAGE_JPEG,
  '.png':  enums.MimeType.IMAGE_PNG,
  '.gif':  enums.MimeType.IMAGE_GIF,
};

/** Extrai o resource_name do 1º resultado de uma resposta mutate (única forma garantida
 *  pela API — ver docs/PLANO_GOOGLE_TIKTOK.md A3, resposta NÃO tem `.id` direto). */
function firstResourceName(mutateResponse: any): string {
  const resourceName = mutateResponse?.results?.[0]?.resource_name;
  if (!resourceName) {
    throw new Error('Google Ads API não retornou resource_name na mutação');
  }
  return resourceName;
}

/** `customers/123/campaigns/456` → `456` */
function idFromResourceName(resourceName: string): string {
  return resourceName.split('/').pop() || resourceName;
}

export class GoogleAdsAdapter implements AdNetworkService {
  readonly network = 'google' as const;

  private creds: GoogleCredentials;
  private api: GoogleAdsApi;
  private customer: Customer;

  constructor(creds: GoogleCredentials) {
    this.creds = creds;
    this.api = new GoogleAdsApi({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      developer_token: creds.developer_token,
    });
    this.customer = this.api.Customer({
      customer_id: creds.customer_id,
      refresh_token: creds.refresh_token,
    });
  }

  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    if (!this.creds.developer_token || !this.creds.customer_id) {
      return { valid: false, error: 'Missing developer_token or customer_id' };
    }
    try {
      // Simple query to validate connection
      await this.customer.query(`SELECT customer.id FROM customer LIMIT 1`);
      return { valid: true };
    } catch (e: any) {
      return { valid: false, error: e.message || 'Invalid credentials' };
    }
  }

  /** Upload real de imagem — cria um Asset do tipo IMAGE na conta Google Ads.
   *  `hash` retorna o resource_name (é o que asset group asset precisa para vincular). */
  async uploadCreative(imagePath: string): Promise<UploadResult> {
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = MIME_BY_EXT[ext];
    if (!mimeType) {
      throw new Error(`Formato de imagem não suportado pelo Google Ads: ${ext}`);
    }

    const buffer = fs.readFileSync(imagePath);
    const result = await this.customer.assets.create([{
      name: `img_${Date.now()}_${path.basename(imagePath)}`,
      type: enums.AssetType.IMAGE,
      image_asset: {
        data: buffer.toString('base64'),
        mime_type: mimeType,
      },
    }]);

    const resourceName = firstResourceName(result);
    return { hash: resourceName, url: imagePath };
  }

  /** Cria um Asset de texto (HEADLINE ou DESCRIPTION) e retorna o resource_name. */
  private async createTextAsset(text: string): Promise<string> {
    const result = await this.customer.assets.create([{
      name: `text_${Date.now()}_${text.slice(0, 20)}`,
      type: enums.AssetType.TEXT,
      text_asset: { text },
    }]);
    return firstResourceName(result);
  }

  async createCampaign(input: CreateCampaignInput | GoogleCampaignInput): Promise<CreateCampaignResult> {
    const gInput = input as GoogleCampaignInput;
    if (!gInput.assetGroups) {
      throw new Error('GoogleAdsAdapter requires GoogleCampaignInput (missing assetGroups).');
    }

    console.log(`[GoogleAdsAdapter] Creating Performance Max campaign: ${gInput.name}`);

    try {
      // 1. Create Campaign Budget
      const budgetResult = await this.customer.campaignBudgets.create([{
        name: `Budget - ${gInput.name} #${Date.now()}`,
        amount_micros: (gInput.budget * 1000000) / 100, // Cents to micros
        delivery_method: enums.BudgetDeliveryMethod.STANDARD,
      }]);
      const budgetResourceName = firstResourceName(budgetResult);

      // 2. Create Performance Max Campaign
      const campaignResult = await this.customer.campaigns.create([{
        name: gInput.name,
        campaign_budget: budgetResourceName,
        advertising_channel_type: enums.AdvertisingChannelType.PERFORMANCE_MAX,
        status: enums.CampaignStatus.PAUSED,
        bidding_strategy_type: enums.BiddingStrategyType.MAXIMIZE_CONVERSIONS,
        maximize_conversions: {},
      }]);
      const campaignResourceName = firstResourceName(campaignResult);
      const campaignId = idFromResourceName(campaignResourceName);

      // 3. Para cada Asset Group do input: cria os Assets (texto + imagem), o Asset Group,
      //    e vincula tudo via AssetGroupAsset. Uma campanha PMax pode ter vários grupos;
      //    o wizard hoje sempre manda 1, mas o adapter suporta N sem alteração.
      for (const group of gInput.assetGroups) {
        const headlineAssets = await Promise.all(
          (group.headlines || []).map(h => this.createTextAsset(h)),
        );
        const descriptionAssets = await Promise.all(
          (group.descriptions || []).map(d => this.createTextAsset(d)),
        );
        const imageAssets = await Promise.all(
          (group.images || [])
            .filter(p => fs.existsSync(p))
            .map(p => this.uploadCreative(p).then(r => r.hash)),
        );
        const logoAssets = await Promise.all(
          (group.logos || [])
            .filter(p => fs.existsSync(p))
            .map(p => this.uploadCreative(p).then(r => r.hash)),
        );

        const assetGroupResult = await this.customer.assetGroups.create([{
          campaign: campaignResourceName,
          name: group.name,
          final_urls: [group.finalUrl],
          status: enums.AssetGroupStatus.PAUSED,
        }]);
        const assetGroupResourceName = firstResourceName(assetGroupResult);

        const links: Array<{ asset_group: string; asset: string; field_type: number }> = [
          ...headlineAssets.map(a => ({ asset_group: assetGroupResourceName, asset: a, field_type: enums.AssetFieldType.HEADLINE })),
          ...descriptionAssets.map(a => ({ asset_group: assetGroupResourceName, asset: a, field_type: enums.AssetFieldType.DESCRIPTION })),
          ...imageAssets.map(a => ({ asset_group: assetGroupResourceName, asset: a, field_type: enums.AssetFieldType.MARKETING_IMAGE })),
          ...logoAssets.map(a => ({ asset_group: assetGroupResourceName, asset: a, field_type: enums.AssetFieldType.LOGO })),
        ];
        if (links.length > 0) {
          await this.customer.assetGroupAssets.create(links);
        }

        // Audience signals (opcional) — Performance Max aceita "search themes" como sinal
        // de intenção (não são keywords tradicionais, mas cumprem o mesmo papel de guiar
        // a segmentação automática do PMax).
        if (gInput.audienceSignals?.keywords?.length) {
          await this.customer.assetGroupSignals.create(
            gInput.audienceSignals.keywords.map(text => ({
              asset_group: assetGroupResourceName,
              search_theme: { text },
            })),
          );
        }
      }

      return {
        externalId: campaignId,
        networkMetadata: {
          status: 'PAUSED',
          campaignType: 'PERFORMANCE_MAX',
        },
      };
    } catch (e: any) {
      console.error('[GoogleAdsAdapter] Error creating campaign:', e);
      throw new Error(`Google Ads API error: ${e.message}`);
    }
  }

  async updateCampaignStatus(externalId: string, status: 'ACTIVE' | 'PAUSED'): Promise<void> {
    console.log(`[GoogleAdsAdapter] Updating campaign ${externalId} to status ${status}`);
    try {
      const gStatus = status === 'ACTIVE' ? enums.CampaignStatus.ENABLED : enums.CampaignStatus.PAUSED;
      await this.customer.campaigns.update([{
        id: parseInt(externalId, 10),
        status: gStatus,
      }]);
    } catch (e: any) {
      console.error('[GoogleAdsAdapter] Error updating campaign status:', e);
      throw new Error(`Google Ads API error updating status: ${e.message}`);
    }
  }

  /** Google-only — não faz parte de AdNetworkService (Meta não tem negativação de termo).
   *  Chamado pelo agente de Negativação (ver docs/PLANO_GOOGLE_TIKTOK.md A6). */
  async addNegativeKeyword(
    campaignId: string,
    term: string,
    matchType: 'BROAD' | 'PHRASE' | 'EXACT',
  ): Promise<void> {
    console.log(`[GoogleAdsAdapter] Adding negative keyword "${term}" (${matchType}) to campaign ${campaignId}`);
    try {
      await this.customer.campaignCriteria.create([{
        campaign: `customers/${this.creds.customer_id}/campaigns/${campaignId}`,
        negative: true,
        keyword: {
          text: term,
          match_type: enums.KeywordMatchType[matchType],
        },
      }]);
    } catch (e: any) {
      console.error('[GoogleAdsAdapter] Error adding negative keyword:', e);
      throw new Error(`Google Ads API error adding negative keyword: ${e.message}`);
    }
  }

  /** Google-only — grão termo de busca, sustenta a negativação automática (ver
   *  docs/PLANO_GOOGLE_TIKTOK.md A4/A6). Só se aplica a campanhas SEARCH (search_term_view
   *  não existe para PERFORMANCE_MAX — retorna vazio nesse caso, não é erro). */
  async fetchSearchTerms(externalId: string, dateRange: DateRange): Promise<Array<{
    searchTerm: string;
    matchType: 'BROAD' | 'PHRASE' | 'EXACT' | 'UNKNOWN';
    date: string;
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
  }>> {
    try {
      const query = `
        SELECT
          search_term_view.search_term,
          segments.search_term_match_type,
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions
        FROM search_term_view
        WHERE campaign.id = ${externalId}
          AND segments.date >= '${dateRange.since}'
          AND segments.date <= '${dateRange.until}'
      `;
      const response = await this.customer.query(query);

      const matchTypeMap: Record<number, 'BROAD' | 'PHRASE' | 'EXACT' | 'UNKNOWN'> = {
        [enums.KeywordMatchType.BROAD]: 'BROAD',
        [enums.KeywordMatchType.PHRASE]: 'PHRASE',
        [enums.KeywordMatchType.EXACT]: 'EXACT',
      };

      return response.map((row: any) => ({
        searchTerm: row.search_term_view.search_term,
        matchType: matchTypeMap[row.segments.search_term_match_type] || 'UNKNOWN',
        date: row.segments.date,
        impressions: row.metrics.impressions || 0,
        clicks: row.metrics.clicks || 0,
        cost: Math.round((row.metrics.cost_micros / 1000000) * 100), // cents, mesmo padrão de spend
        conversions: row.metrics.conversions || 0,
      }));
    } catch (e: any) {
      // Campanhas PERFORMANCE_MAX não têm search_term_view — falha esperada, não crítica
      console.warn(`[GoogleAdsAdapter] Search terms indisponíveis para campanha ${externalId}: ${e.message}`);
      return [];
    }
  }

  async fetchInsights(externalId: string, dateRange: DateRange): Promise<NetworkInsight[]> {
    console.log(`[GoogleAdsAdapter] Fetching insights for ${externalId} from ${dateRange.since} to ${dateRange.until}`);
    try {
      const query = `
        SELECT
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.conversions_from_interactions_rate,
          metrics.average_cpc,
          metrics.search_impression_share,
          metrics.search_budget_lost_impression_share,
          metrics.search_rank_lost_impression_share
        FROM campaign
        WHERE campaign.id = ${externalId}
          AND segments.date >= '${dateRange.since}'
          AND segments.date <= '${dateRange.until}'
      `;
      const response = await this.customer.query(query);

      const insights: NetworkInsight[] = response.map((row: any) => {
        const costCents = Math.round((row.metrics.cost_micros / 1000000) * 100);
        const impressions = row.metrics.impressions || 0;
        const clicks = row.metrics.clicks || 0;
        // Google devolve as métricas de impression share como fração 0-1 (não %)
        const toPct = (v: number | undefined) => (typeof v === 'number' ? v * 100 : 0);
        return {
          date: row.segments.date,
          impressions: impressions,
          reach: impressions, // Google doesn't surface reach identically to Meta, using impressions as fallback
          clicks: clicks,
          spend: costCents,
          cpc: clicks > 0 ? Math.round(costCents / clicks) : 0,
          cpm: impressions > 0 ? Math.round((costCents / impressions) * 1000) : 0,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          frequency: 1, // Not always available for PMax
          conversions: row.metrics.conversions || 0,
          leads: row.metrics.conversions || 0,
          // FASE 1 (Google Ads) — Impression Share + ROAS (ver docs/PLANO_GOOGLE_TIKTOK.md A2/A3)
          conversionsValue:      row.metrics.conversions_value || 0,
          searchImpressionShare: toPct(row.metrics.search_impression_share),
          searchBudgetLostIs:    toPct(row.metrics.search_budget_lost_impression_share),
          searchRankLostIs:      toPct(row.metrics.search_rank_lost_impression_share),
        };
      });

      return insights;
    } catch (e: any) {
      console.error('[GoogleAdsAdapter] Error fetching insights:', e);
      // Return empty array to not break the dashboard on errors, or throw depending on policy
      return [];
    }
  }

  async searchTargeting(type: 'interest' | 'location' | 'audience', query: string): Promise<TargetingResult[]> {
    // Google Ads keyword/audience signals suggestion
    if (type === 'interest') {
      return [
        { id: 'g_seg_1', name: `In-market: ${query}`, type: 'IN_MARKET' },
        { id: 'g_seg_2', name: `Affinity: ${query}`, type: 'AFFINITY' },
      ];
    }
    return [];
  }
}
