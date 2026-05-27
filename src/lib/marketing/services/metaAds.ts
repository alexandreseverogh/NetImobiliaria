import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const META_API_BASE = 'https://graph.facebook.com/v21.0';

export class MetaAdsService {
  private token: string;
  private adAccountId: string;

  constructor(settings: any) {
    this.token = settings?.metaToken || process.env.META_ACCESS_TOKEN || '';
    this.adAccountId = settings?.adAccountId || process.env.META_AD_ACCOUNT_ID || '';
  }

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  private url(path: string) {
    return `${META_API_BASE}/${path}`;
  }

  async uploadImage(imagePath: string): Promise<string> {
    const form = new FormData();
    form.append('filename', fs.createReadStream(imagePath));
    form.append('access_token', this.token);

    const res = await axios.post(
      this.url(`act_${this.adAccountId}/adimages`),
      form,
      { headers: form.getHeaders() }
    );

    const images = res.data.images;
    const key = Object.keys(images)[0];
    return images[key].hash;
  }

  async createFullCampaign(data: {
    campaign: any;
    adSet: any;
    ad: any;
    whatsappNumber?: string;
    whatsappMessage?: string;
  }) {
    // 1. Upload images
    const imageHashes: string[] = [];
    for (const imagePath of data.ad.images) {
      if (fs.existsSync(imagePath)) {
        const hash = await this.uploadImage(imagePath);
        imageHashes.push(hash);
      }
    }

    // 2. Create campaign
    const campaignRes = await axios.post(this.url(`act_${this.adAccountId}/campaigns`), {
      name: data.campaign.name,
      objective: data.campaign.objective,
      status: 'PAUSED',
      special_ad_categories: data.campaign.specialAdCategory ? [data.campaign.specialAdCategory] : [],
      access_token: this.token,
    });
    const campaignId = campaignRes.data.id;

    // 3. Create ad set
    const targeting: any = {
      age_min: data.adSet.ageMin,
      age_max: data.adSet.ageMax,
      geo_locations: data.adSet.locations,
    };
    if (data.adSet.genders?.length > 0) {
      targeting.genders = data.adSet.genders;
    }
    if (data.adSet.interests?.length > 0) {
      targeting.interests = data.adSet.interests;
    }

    const adSetPayload: any = {
      campaign_id: campaignId,
      name: data.adSet.name,
      daily_budget: data.adSet.dailyBudget,
      billing_event: data.adSet.billingEvent,
      optimization_goal: data.adSet.optimizationGoal,
      targeting,
      start_time: new Date(data.adSet.startTime).toISOString(),
      status: 'PAUSED',
      access_token: this.token,
    };

    if (data.adSet.endTime) {
      adSetPayload.end_time = new Date(data.adSet.endTime).toISOString();
    }

    const adSetRes = await axios.post(this.url(`act_${this.adAccountId}/adsets`), adSetPayload);
    const adSetId = adSetRes.data.id;

    // 4. Create creative
    let creativePayload: any;

    if (data.ad.creativeType === 'CAROUSEL' && imageHashes.length > 1) {
      const childAttachments = imageHashes.map((hash, i) => ({
        image_hash: hash,
        link: data.ad.linkUrl,
        name: data.ad.headline || `Slide ${i + 1}`,
      }));

      creativePayload = {
        name: `${data.ad.name} Creative`,
        object_story_spec: {
          link_data: {
            child_attachments: childAttachments,
            link: data.ad.linkUrl,
            message: data.ad.body,
            call_to_action: { type: data.ad.ctaType },
          },
          page_id: this.adAccountId,
        },
        access_token: this.token,
      };
    } else {
      creativePayload = {
        name: `${data.ad.name} Creative`,
        object_story_spec: {
          link_data: {
            image_hash: imageHashes[0],
            link: data.ad.linkUrl,
            message: data.ad.body,
            name: data.ad.headline,
            call_to_action: { type: data.ad.ctaType },
          },
          page_id: this.adAccountId,
        },
        access_token: this.token,
      };
    }

    const creativeRes = await axios.post(this.url(`act_${this.adAccountId}/adcreatives`), creativePayload);
    const creativeId = creativeRes.data.id;

    // 5. Create ad
    const adRes = await axios.post(this.url(`act_${this.adAccountId}/ads`), {
      name: data.ad.name,
      adset_id: adSetId,
      creative: { creative_id: creativeId },
      status: 'PAUSED',
      access_token: this.token,
    });

    return {
      campaignId,
      adSetId,
      adId: adRes.data.id,
      creativeId,
    };
  }

  async updateCampaignStatus(metaCampaignId: string, status: string) {
    await axios.post(this.url(metaCampaignId), {
      status,
      access_token: this.token,
    });
  }

  async getCampaignInsights(metaCampaignId: string, dateRange = 30) {
    const res = await axios.get(this.url(`${metaCampaignId}/insights`), {
      params: {
        fields: 'impressions,reach,clicks,spend,cpc,cpm,ctr,actions,frequency',
        time_range: JSON.stringify({
          since: new Date(Date.now() - dateRange * 86400000).toISOString().split('T')[0],
          until: new Date().toISOString().split('T')[0],
        }),
        time_increment: 1,
        access_token: this.token,
      },
    });
    return res.data.data || [];
  }

  async searchInterests(query: string) {
    const res = await axios.get(this.url('search'), {
      params: {
        type: 'adinterest',
        q: query,
        access_token: this.token,
      },
    });
    return res.data.data || [];
  }

  async searchLocations(query: string) {
    const res = await axios.get(this.url('search'), {
      params: {
        type: 'adgeolocation',
        q: query,
        location_types: ['city', 'region', 'country'],
        access_token: this.token,
      },
    });
    return res.data.data || [];
  }
}
