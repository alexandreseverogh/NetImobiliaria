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

  async uploadCreative(imagePath: string): Promise<UploadResult> {
    // Mock implementation for uploading assets to Google Ads
    return {
      hash: `mock_g_hash_${Date.now()}`,
      url: 'https://mock.google.com/asset.jpg',
    };
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
      const budgetId = (budgetResult as any)[0].id;

      // 2. Create Performance Max Campaign
      const campaignResult = await this.customer.campaigns.create([{
        name: gInput.name,
        campaign_budget: `customers/${this.creds.customer_id}/campaignBudgets/${budgetId}`,
        advertising_channel_type: enums.AdvertisingChannelType.PERFORMANCE_MAX,
        status: enums.CampaignStatus.PAUSED,
        bidding_strategy_type: enums.BiddingStrategyType.MAXIMIZE_CONVERSIONS,
        maximize_conversions: {}, 
      }]);
      const campaignId = (campaignResult as any)[0].id;

      // 3. Create Asset Group (Mock for simplification, actual requires linking all assets)
      // We skip the deep asset linking here to keep the demo/adapter clean, 
      // but in production it creates AssetGroup and then AssetGroupAssets
      
      return {
        externalId: String(campaignId),
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
