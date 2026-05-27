import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import type {
  AdNetworkService,
  CreateCampaignInput,
  CreateCampaignResult,
  DateRange,
  NetworkInsight,
  TargetingResult,
  UploadResult,
} from '../types';

const META_API_BASE = 'https://graph.facebook.com/v21.0';

export interface MetaCredentials {
  access_token: string;
  app_id?: string;
  app_secret?: string;
  ad_account_id: string;
}

export class MetaAdsAdapter implements AdNetworkService {
  readonly network = 'meta' as const;

  private readonly token: string;
  private readonly adAccountId: string;

  constructor(creds: MetaCredentials) {
    this.token       = creds.access_token;
    this.adAccountId = creds.ad_account_id.replace(/^act_/, '');
  }

  private url(path: string) {
    return `${META_API_BASE}/${path}`;
  }

  private get auth() {
    return { access_token: this.token };
  }

  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    try {
      await axios.get(this.url('me'), { params: { ...this.auth, fields: 'id,name' } });
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err?.response?.data?.error?.message || err.message };
    }
  }

  async uploadCreative(imagePath: string): Promise<UploadResult> {
    const form = new FormData();
    form.append('filename', fs.createReadStream(imagePath));
    form.append('access_token', this.token);

    const res = await axios.post(
      this.url(`act_${this.adAccountId}/adimages`),
      form,
      { headers: form.getHeaders() },
    );

    const images = res.data.images;
    const key    = Object.keys(images)[0];
    return { hash: images[key].hash, url: images[key].url };
  }

  async createCampaign(input: CreateCampaignInput): Promise<CreateCampaignResult> {
    // 1. Upload images
    const imageHashes: string[] = [];
    for (const imagePath of input.ad.images) {
      if (fs.existsSync(imagePath)) {
        const result = await this.uploadCreative(imagePath);
        imageHashes.push(result.hash);
      }
    }

    // 2. Create campaign
    const campaignRes = await axios.post(
      this.url(`act_${this.adAccountId}/campaigns`),
      {
        name: input.name,
        objective: input.objective,
        status: 'PAUSED',
        special_ad_categories: input.specialAdCategory ? [input.specialAdCategory] : [],
        ...this.auth,
      },
    );
    const externalId = campaignRes.data.id;

    // 3. Create ad set
    const targeting: any = {
      age_min: input.adSet.ageMin,
      age_max: input.adSet.ageMax,
      geo_locations: input.adSet.locations,
    };
    if (input.adSet.genders?.length) targeting.genders = input.adSet.genders;
    if (input.adSet.interests?.length) targeting.interests = input.adSet.interests;

    const adSetPayload: any = {
      campaign_id:      externalId,
      name:             input.adSet.name,
      daily_budget:     input.adSet.dailyBudget,
      billing_event:    input.adSet.billingEvent,
      optimization_goal: input.adSet.optimizationGoal,
      targeting,
      start_time:       new Date(input.adSet.startTime).toISOString(),
      status:           'PAUSED',
      ...this.auth,
    };
    if (input.adSet.endTime) {
      adSetPayload.end_time = new Date(input.adSet.endTime).toISOString();
    }

    const adSetRes = await axios.post(this.url(`act_${this.adAccountId}/adsets`), adSetPayload);
    const externalAdSetId = adSetRes.data.id;

    // 4. Create creative
    let creativePayload: any;
    const { ad } = input;

    if (ad.creativeType === 'CAROUSEL' && imageHashes.length > 1) {
      creativePayload = {
        name: `${ad.name} Creative`,
        object_story_spec: {
          link_data: {
            child_attachments: imageHashes.map((hash, i) => ({
              image_hash: hash,
              link: ad.linkUrl,
              name: ad.headline || `Slide ${i + 1}`,
            })),
            link: ad.linkUrl,
            message: ad.body,
            call_to_action: { type: ad.ctaType },
          },
          page_id: this.adAccountId,
        },
        ...this.auth,
      };
    } else {
      creativePayload = {
        name: `${ad.name} Creative`,
        object_story_spec: {
          link_data: {
            image_hash: imageHashes[0],
            link: ad.linkUrl,
            message: ad.body,
            name: ad.headline,
            call_to_action: { type: ad.ctaType },
          },
          page_id: this.adAccountId,
        },
        ...this.auth,
      };
    }

    const creativeRes = await axios.post(
      this.url(`act_${this.adAccountId}/adcreatives`),
      creativePayload,
    );
    const creativeId = creativeRes.data.id;

    // 5. Create ad
    const adRes = await axios.post(this.url(`act_${this.adAccountId}/ads`), {
      name: ad.name,
      adset_id: externalAdSetId,
      creative: { creative_id: creativeId },
      status: 'PAUSED',
      ...this.auth,
    });

    return {
      externalId,
      externalAdSetId,
      externalAdId: adRes.data.id,
      networkMetadata: { creative_id: creativeId },
    };
  }

  async updateCampaignStatus(externalId: string, status: 'ACTIVE' | 'PAUSED'): Promise<void> {
    await axios.post(this.url(externalId), { status, ...this.auth });
  }

  async fetchInsights(externalId: string, dateRange: DateRange): Promise<NetworkInsight[]> {
    const res = await axios.get(this.url(`${externalId}/insights`), {
      params: {
        fields: 'impressions,reach,clicks,spend,cpc,cpm,ctr,actions,frequency',
        time_range: JSON.stringify({ since: dateRange.since, until: dateRange.until }),
        time_increment: 1,
        ...this.auth,
      },
    });

    return (res.data.data || []).map((row: any) => {
      const actions: any[] = row.actions || [];
      const leads = actions.find((a: any) => a.action_type === 'lead')?.value || 0;
      const conversions = actions.find((a: any) => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0;

      return {
        date:        row.date_start,
        impressions: parseInt(row.impressions  || 0),
        reach:       parseInt(row.reach        || 0),
        clicks:      parseInt(row.clicks       || 0),
        spend:       parseFloat(row.spend      || 0),
        cpc:         parseFloat(row.cpc        || 0),
        cpm:         parseFloat(row.cpm        || 0),
        ctr:         parseFloat(row.ctr        || 0),
        frequency:   parseFloat(row.frequency  || 0),
        conversions: parseInt(conversions),
        leads:       parseInt(leads),
      };
    });
  }

  async searchTargeting(
    type: 'interest' | 'location' | 'audience',
    query: string,
  ): Promise<TargetingResult[]> {
    const typeMap = {
      interest: 'adinterest',
      location: 'adgeolocation',
      audience: 'adTargetingCategory',
    };

    const params: any = {
      type: typeMap[type] || 'adinterest',
      q: query,
      ...this.auth,
    };

    if (type === 'location') {
      params.location_types = ['city', 'region', 'country'];
    }

    const res = await axios.get(this.url('search'), { params });
    return (res.data.data || []).map((item: any) => ({
      id:            item.id,
      name:          item.name,
      type:          item.type || type,
      audience_size: item.audience_size,
    }));
  }
}

/** Build MetaAdsAdapter from legacy settings object (backwards compat). */
export function buildMetaAdapterFromSettings(settings: any): MetaAdsAdapter {
  return new MetaAdsAdapter({
    access_token:  settings?.metaToken || process.env.META_ACCESS_TOKEN || '',
    ad_account_id: settings?.adAccountId || process.env.META_AD_ACCOUNT_ID || '',
    app_id:        settings?.appId,
    app_secret:    settings?.appSecret,
  });
}
