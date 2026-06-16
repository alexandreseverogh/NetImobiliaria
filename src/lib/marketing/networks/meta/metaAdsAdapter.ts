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

// ── FASE 16 — Postagem orgânica ──────────────────────────────────────────────
export type OrganicFormat = 'text' | 'image' | 'carousel' | 'video' | 'reel' | 'story';

export interface OrganicPublishInput {
  format:     OrganicFormat;
  caption?:   string;
  mediaUrls?: string[];   // URLs públicas (imagem ou vídeo conforme o formato)
  link?:      string;
  mediaKind?: 'image' | 'video';   // desambigua Stories (Reels = sempre vídeo)
}

export interface OrganicPublishResult {
  platform: 'facebook' | 'instagram';
  postId:   string;
  permalink: string | null;
  status:   'PUBLISHED';
}

export interface MetaCredentials {
  access_token: string;
  app_id?: string;
  app_secret?: string;
  ad_account_id: string;
  /** Facebook Page ID (obrigatório para criar criativos). */
  page_id?: string;
  /** Meta Pixel ID — para promoted_object e rastreamento de conversões. */
  pixel_id?: string;
  /** Instagram Actor ID — opcional, para criativos no Instagram. */
  instagram_actor_id?: string;
}

export class MetaAdsAdapter implements AdNetworkService {
  readonly network = 'meta' as const;

  private readonly token: string;
  private readonly adAccountId: string;
  private readonly pageId: string;
  private readonly pixelId?: string;
  private readonly instagramActorId?: string;

  constructor(creds: MetaCredentials) {
    this.token             = creds.access_token;
    this.adAccountId       = creds.ad_account_id.replace(/^act_/, '');
    // HOTFIX: page_id vem das credenciais, NÃO do ad_account_id
    this.pageId            = creds.page_id || '';
    this.pixelId           = creds.pixel_id;
    this.instagramActorId  = creds.instagram_actor_id;
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

  // ── FASE 16 — Postagem orgânica ───────────────────────────────────────────
  // Cache em memória do Page Access Token (escopo da instância do adapter).
  private _pageTokenCache?: string;

  /**
   * Resolve o Page Access Token a partir das credenciais do tenant.
   *
   * O token armazenado costuma ser de Usuário/Sistema; publicar na Página exige
   * um Page Access Token. Estratégia (sem hardcode):
   *   1. GET /{page-id}?fields=access_token  (caminho direto se o user token tem acesso)
   *   2. fallback GET /me/accounts e localizar a página por id
   * Lança erro acionável se page_id não configurado ou sem permissão.
   */
  async resolvePageAccessToken(): Promise<string> {
    if (this._pageTokenCache) return this._pageTokenCache;

    if (!this.pageId) {
      throw new Error(
        'Postagem orgânica: page_id não configurado. Configure a Identidade Meta do tenant/cliente.',
      );
    }

    // 1. Caminho direto
    try {
      const res = await axios.get(this.url(this.pageId), {
        params: { ...this.auth, fields: 'access_token' },
      });
      const token = res.data?.access_token;
      if (token) {
        this._pageTokenCache = token;
        return token;
      }
    } catch { /* tenta o fallback abaixo */ }

    // 2. Fallback: lista de páginas do usuário
    try {
      const res = await axios.get(this.url('me/accounts'), {
        params: { ...this.auth, fields: 'id,access_token' },
      });
      const page = (res.data?.data || []).find((p: any) => p.id === this.pageId);
      if (page?.access_token) {
        this._pageTokenCache = page.access_token;
        return page.access_token;
      }
    } catch (err: any) {
      throw new Error(
        `Postagem orgânica: falha ao resolver Page Access Token — ${err?.response?.data?.error?.message || err.message}`,
      );
    }

    throw new Error(
      'Postagem orgânica: o token configurado não tem acesso a esta Página. ' +
      'Verifique a permissão pages_manage_posts e se a Página pertence à conta.',
    );
  }

  /** Busca o permalink de um post/foto (best-effort; null se indisponível).
   *  FB usa o campo `permalink_url`; Instagram usa `permalink`. */
  private async fetchPermalink(objectId: string, pageToken: string, field: 'permalink_url' | 'permalink' = 'permalink_url'): Promise<string | null> {
    try {
      const res = await axios.get(this.url(objectId), {
        params: { access_token: pageToken, fields: field },
      });
      return res.data?.[field] ?? null;
    } catch {
      return null;
    }
  }

  /** Resolve o Instagram Business Account ID ligado à Página.
   *  Usa instagram_actor_id das credenciais; senão deriva da Página. */
  private async resolveInstagramUserId(pageToken: string): Promise<string> {
    if (this.instagramActorId) return this.instagramActorId;
    if (!this.pageId) {
      throw new Error('Instagram: page_id não configurado — não é possível derivar a conta do Instagram.');
    }
    try {
      const res = await axios.get(this.url(this.pageId), {
        params: { access_token: pageToken, fields: 'instagram_business_account' },
      });
      const igId = res.data?.instagram_business_account?.id;
      if (igId) return igId;
    } catch { /* cai no erro abaixo */ }
    throw new Error(
      'Instagram: nenhuma conta do Instagram Business vinculada à Página. ' +
      'Vincule a conta no Meta Business ou configure o Instagram Actor ID.',
    );
  }

  /** Aguarda um container de mídia do Instagram ficar FINISHED (poll com backoff). */
  private async waitForContainer(containerId: string, token: string, maxTries = 8): Promise<void> {
    for (let i = 0; i < maxTries; i++) {
      const res = await axios.get(this.url(containerId), {
        params: { access_token: token, fields: 'status_code' },
      });
      const code = res.data?.status_code;
      if (code === 'FINISHED') return;
      if (code === 'ERROR' || code === 'EXPIRED') {
        throw new Error(`Instagram: processamento da mídia falhou (status ${code}).`);
      }
      // IN_PROGRESS → aguarda com backoff (1s, 2s, 3s...)
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
    throw new Error('Instagram: tempo esgotado aguardando o processamento da mídia.');
  }

  /**
   * Publica um post ORGÂNICO na Página do Facebook (FASE 16.B).
   * Suporta: texto/link (/feed), foto única (/photos) e multi-foto (attached_media).
   * NÃO usa adset/targeting/budget — é publicação orgânica pura.
   */
  async publishToFacebookPage(input: OrganicPublishInput): Promise<OrganicPublishResult> {
    const pageToken = await this.resolvePageAccessToken();
    const media     = (input.mediaUrls || []).filter(Boolean);

    // Formatos de vídeo/efêmeros (16.D) — tratados antes do feed estático
    if (input.format === 'video') return this.publishFacebookVideo(media[0], input.caption, pageToken);
    if (input.format === 'reel')  return this.publishFacebookHostedVideo('video_reels',  media[0], input.caption, pageToken);
    if (input.format === 'story') {
      return (input.mediaKind === 'video')
        ? this.publishFacebookHostedVideo('video_stories', media[0], input.caption, pageToken)
        : this.publishFacebookPhotoStory(media[0], pageToken);
    }

    // 1. Apenas texto / link
    if (media.length === 0) {
      if (!input.caption?.trim() && !input.link) {
        throw new Error('Postagem orgânica: informe um texto, link ou imagem.');
      }
      const res = await axios.post(this.url(`${this.pageId}/feed`), null, {
        params: {
          access_token: pageToken,
          message:      input.caption || undefined,
          link:         input.link || undefined,
        },
      });
      const postId = res.data?.id;
      return { platform: 'facebook', postId, permalink: await this.fetchPermalink(postId, pageToken), status: 'PUBLISHED' };
    }

    // 2. Foto única
    if (media.length === 1) {
      const res = await axios.post(this.url(`${this.pageId}/photos`), null, {
        params: {
          access_token: pageToken,
          url:          media[0],
          caption:      input.caption || undefined,
          published:    true,
        },
      });
      const postId = res.data?.post_id || res.data?.id;
      return { platform: 'facebook', postId, permalink: await this.fetchPermalink(postId, pageToken), status: 'PUBLISHED' };
    }

    // 3. Multi-foto: upload sem publicar → /feed com attached_media
    const mediaFbids: { media_fbid: string }[] = [];
    for (const url of media) {
      const up = await axios.post(this.url(`${this.pageId}/photos`), null, {
        params: { access_token: pageToken, url, published: false },
      });
      if (up.data?.id) mediaFbids.push({ media_fbid: up.data.id });
    }
    const res = await axios.post(this.url(`${this.pageId}/feed`), null, {
      params: {
        access_token:   pageToken,
        message:        input.caption || undefined,
        attached_media: JSON.stringify(mediaFbids),
      },
    });
    const postId = res.data?.id;
    return { platform: 'facebook', postId, permalink: await this.fetchPermalink(postId, pageToken), status: 'PUBLISHED' };
  }

  // ── FASE 16.D — Vídeo / Reels / Stories no Facebook ───────────────────────

  /** Vídeo de feed: POST /{page}/videos com file_url hospedado. */
  private async publishFacebookVideo(videoUrl: string, caption: string | undefined, pageToken: string): Promise<OrganicPublishResult> {
    if (!videoUrl) throw new Error('Vídeo: informe a URL pública do vídeo.');
    const res = await axios.post(this.url(`${this.pageId}/videos`), null, {
      params: { access_token: pageToken, file_url: videoUrl, description: caption || undefined },
    });
    const postId = res.data?.id;
    return { platform: 'facebook', postId, permalink: await this.fetchPermalink(postId, pageToken), status: 'PUBLISHED' };
  }

  /** Foto de Story: upload não publicado → POST /{page}/photo_stories. */
  private async publishFacebookPhotoStory(imageUrl: string, pageToken: string): Promise<OrganicPublishResult> {
    if (!imageUrl) throw new Error('Story: informe a URL pública da imagem.');
    const up = await axios.post(this.url(`${this.pageId}/photos`), null, {
      params: { access_token: pageToken, url: imageUrl, published: false },
    });
    const photoId = up.data?.id;
    const res = await axios.post(this.url(`${this.pageId}/photo_stories`), null, {
      params: { access_token: pageToken, photo_id: photoId },
    });
    const postId = res.data?.post_id || res.data?.id || photoId;
    return { platform: 'facebook', postId, permalink: null, status: 'PUBLISHED' };
  }

  /** Reels / Video Stories: fluxo hospedado em 3 passos (start → upload por file_url → finish). */
  private async publishFacebookHostedVideo(
    endpoint: 'video_reels' | 'video_stories',
    videoUrl: string,
    caption: string | undefined,
    pageToken: string,
  ): Promise<OrganicPublishResult> {
    if (!videoUrl) throw new Error(`${endpoint === 'video_reels' ? 'Reels' : 'Story em vídeo'}: informe a URL pública do vídeo (9:16).`);

    // 1. start
    const start = await axios.post(this.url(`${this.pageId}/${endpoint}`), null, {
      params: { access_token: pageToken, upload_phase: 'start' },
    });
    const videoId   = start.data?.video_id;
    const uploadUrl = start.data?.upload_url;
    if (!videoId || !uploadUrl) throw new Error('Meta: falha ao iniciar o upload do vídeo.');

    // 2. upload hospedado (Meta baixa do file_url via header)
    await axios.post(uploadUrl, null, {
      headers: { Authorization: `OAuth ${pageToken}`, file_url: videoUrl },
    });

    // 3. finish (publica)
    const finishParams: any = {
      access_token: pageToken,
      upload_phase: 'finish',
      video_id:     videoId,
      video_state:  'PUBLISHED',
    };
    if (endpoint === 'video_reels' && caption) finishParams.description = caption;
    const fin = await axios.post(this.url(`${this.pageId}/${endpoint}`), null, { params: finishParams });
    const postId = fin.data?.post_id || videoId;
    return { platform: 'facebook', postId, permalink: null, status: 'PUBLISHED' };
  }

  /**
   * Publica um post ORGÂNICO no Instagram (FASE 16.C) — feed: imagem única ou carrossel.
   * Requer URLs de mídia PÚBLICAS (o Instagram baixa server-side).
   * Fluxo: cria container(es) → aguarda FINISHED → media_publish.
   */
  async publishToInstagram(input: OrganicPublishInput): Promise<OrganicPublishResult> {
    const token = await this.resolvePageAccessToken();
    const igId  = await this.resolveInstagramUserId(token);
    const media = (input.mediaUrls || []).filter(Boolean);

    if (media.length === 0) {
      throw new Error('Instagram: é obrigatório ao menos uma mídia.');
    }

    // 16.D — Vídeo / Reels / Stories: container único com media_type
    if (input.format === 'video' || input.format === 'reel' || input.format === 'story') {
      const mediaType = input.format === 'reel' ? 'REELS' : input.format === 'story' ? 'STORIES' : 'VIDEO';
      const params: any = { access_token: token, media_type: mediaType };
      // Story pode ser imagem ou vídeo; Reels/Video são sempre vídeo
      if (input.format === 'story' && input.mediaKind === 'image') {
        params.image_url = media[0];
      } else {
        params.video_url = media[0];
      }
      if (input.format !== 'story' && input.caption) params.caption = input.caption;

      const c = await axios.post(this.url(`${igId}/media`), null, { params });
      const creationId = c.data?.id;
      await this.waitForContainer(creationId, token, 12);   // vídeo demora mais
      const pub = await axios.post(this.url(`${igId}/media_publish`), null, {
        params: { access_token: token, creation_id: creationId },
      });
      const postId = pub.data?.id;
      return { platform: 'instagram', postId, permalink: await this.fetchPermalink(postId, token, 'permalink'), status: 'PUBLISHED' };
    }

    let creationId: string;

    if (media.length === 1) {
      // Imagem única
      const c = await axios.post(this.url(`${igId}/media`), null, {
        params: { access_token: token, image_url: media[0], caption: input.caption || undefined },
      });
      creationId = c.data?.id;
      await this.waitForContainer(creationId, token);
    } else {
      // Carrossel: containers filhos → container pai CAROUSEL
      if (media.length > 10) throw new Error('Instagram: carrossel aceita no máximo 10 itens.');
      const children: string[] = [];
      for (const url of media) {
        const ch = await axios.post(this.url(`${igId}/media`), null, {
          params: { access_token: token, image_url: url, is_carousel_item: true },
        });
        if (ch.data?.id) children.push(ch.data.id);
      }
      for (const id of children) await this.waitForContainer(id, token);

      const parent = await axios.post(this.url(`${igId}/media`), null, {
        params: {
          access_token: token,
          media_type:   'CAROUSEL',
          children:     children.join(','),
          caption:      input.caption || undefined,
        },
      });
      creationId = parent.data?.id;
      await this.waitForContainer(creationId, token);
    }

    // Publica o container
    const pub = await axios.post(this.url(`${igId}/media_publish`), null, {
      params: { access_token: token, creation_id: creationId },
    });
    const postId = pub.data?.id;
    return {
      platform:  'instagram',
      postId,
      permalink: await this.fetchPermalink(postId, token, 'permalink'),
      status:    'PUBLISHED',
    };
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
    const campaignPayload: any = {
      name: input.name,
      objective: input.objective,
      status: 'PAUSED',
      special_ad_categories: input.specialAdCategory && input.specialAdCategory !== 'NONE'
        ? [input.specialAdCategory]
        : [],
      ...this.auth,
    };

    const campaignRes = await axios.post(
      this.url(`act_${this.adAccountId}/campaigns`),
      campaignPayload,
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
      campaign_id:       externalId,
      name:              input.adSet.name,
      daily_budget:      input.adSet.dailyBudget,
      billing_event:     input.adSet.billingEvent,
      optimization_goal: input.adSet.optimizationGoal,
      targeting,
      start_time:        new Date(input.adSet.startTime).toISOString(),
      status:            'PAUSED',
      ...this.auth,
    };

    if (input.adSet.endTime) {
      adSetPayload.end_time = new Date(input.adSet.endTime).toISOString();
    }

    // HOTFIX: enviar adset_schedule quando scheduleDays estiver configurado
    const schedulePayload = this.buildAdsetSchedule(input.adSet);
    if (schedulePayload) {
      adSetPayload.adset_schedule = schedulePayload;
      // Quando há agendamento dia/hora, billing_event deve ser IMPRESSIONS
      adSetPayload.billing_event = 'IMPRESSIONS';
    }

    // Promoted object (pixel + conversão) — quando pixel_id disponível
    const pixelId = input.pixelId || this.pixelId;
    if (pixelId) {
      adSetPayload.promoted_object = {
        pixel_id:          pixelId,
        custom_event_type: input.customEventType || 'LEAD',
      };
    }

    const adSetRes = await axios.post(this.url(`act_${this.adAccountId}/adsets`), adSetPayload);
    const externalAdSetId = adSetRes.data.id;

    // 4. Create creative
    // HOTFIX: usar page_id real das credenciais, não o ad_account_id
    const pageId = this.pageId;
    if (!pageId) {
      throw new Error(
        'Meta Ads: page_id não configurado. ' +
        'Acesse Configurações → Redes de Anúncios → Identidade Meta e informe o Facebook Page ID.',
      );
    }

    let creativePayload: any;
    const { ad } = input;

    // Instagram actor para criativos (opcional)
    const instagramActorId = this.instagramActorId;

    if (ad.creativeType === 'CAROUSEL' && imageHashes.length > 1) {
      const storySpec: any = {
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
        page_id: pageId,
      };
      if (instagramActorId) storySpec.instagram_actor_id = instagramActorId;

      creativePayload = {
        name: `${ad.name} Creative`,
        object_story_spec: storySpec,
        ...this.auth,
      };
    } else {
      const storySpec: any = {
        link_data: {
          image_hash: imageHashes[0],
          link: ad.linkUrl,
          message: ad.body,
          name: ad.headline,
          call_to_action: { type: ad.ctaType },
        },
        page_id: pageId,
      };
      if (instagramActorId) storySpec.instagram_actor_id = instagramActorId;

      creativePayload = {
        name: `${ad.name} Creative`,
        object_story_spec: storySpec,
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
      networkMetadata: {
        creative_id: creativeId,
        page_id: pageId,
        pixel_id: pixelId || null,
      },
    };
  }

  /**
   * HOTFIX: monta o adset_schedule a partir dos campos de agendamento.
   * Meta API espera: [{ days: number[], start_minute: number, end_minute: number, timezone_type: string }]
   * days: 0=Domingo, 1=Segunda … 6=Sábado
   */
  private buildAdsetSchedule(adSet: CreateCampaignInput['adSet']): any[] | null {
    const { scheduleDays, scheduleStartHour, scheduleEndHour, scheduleTimeSlots } = adSet;

    // Se há time slots detalhados, use-os diretamente
    if (scheduleTimeSlots && Array.isArray(scheduleTimeSlots) && scheduleTimeSlots.length > 0) {
      return scheduleTimeSlots;
    }

    // Se há dias configurados com horário de início/fim
    if (scheduleDays && scheduleDays.length > 0) {
      const startMinute = (scheduleStartHour ?? 0) * 60;
      const endMinute   = (scheduleEndHour ?? 24) * 60;
      return [{
        days:          scheduleDays,
        start_minute:  startMinute,
        end_minute:    endMinute === 1440 ? 1439 : endMinute, // Meta: max 1439
        timezone_type: 'USER',
      }];
    }

    return null;
  }

  async updateCampaignStatus(externalId: string, status: 'ACTIVE' | 'PAUSED'): Promise<void> {
    await axios.post(this.url(externalId), { status, ...this.auth });
  }

  async fetchInsights(externalId: string, dateRange: DateRange): Promise<NetworkInsight[]> {
    const res = await axios.get(this.url(`${externalId}/insights`), {
      params: {
        fields: [
          'impressions', 'reach', 'clicks', 'spend', 'cpc', 'cpm', 'ctr',
          'actions', 'frequency',
          // ROI + conversão (seção 1.6)
          'action_values', 'cost_per_action_type',
          'quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking',
          'link_clicks', 'landing_page_views',
          // FASE 5 — Video Metrics
          'video_3_sec_watched_actions',
          'video_15_sec_watched_actions',
          'video_p25_watched_actions',
          'video_p50_watched_actions',
          'video_p75_watched_actions',
          'video_p100_watched_actions',
          'video_thruplay_watched_actions',
        ].join(','),
        time_range:     JSON.stringify({ since: dateRange.since, until: dateRange.until }),
        time_increment: 1,
        ...this.auth,
      },
    });

    return (res.data.data || []).map((row: any) => {
      const actions: any[]       = row.actions || [];
      const actionValues: any[]  = row.action_values || [];
      const leads      = actions.find((a: any) => a.action_type === 'lead')?.value || 0;
      const purchases  = actions.find((a: any) => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0;
      const purchaseValue = actionValues.find((a: any) => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0;

      // FASE 5 — extrai views de video (Meta retorna arrays de action_type objects)
      const pickVideoAction = (arr: any[] | undefined) =>
        parseInt((arr?.[0]?.value) || 0);

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
        conversions: parseInt(purchases),
        leads:       parseInt(leads),
        // FASE 5 — Video Metrics
        videoViews3s:     pickVideoAction(row.video_3_sec_watched_actions),
        videoViews15s:    pickVideoAction(row.video_15_sec_watched_actions),
        videoViews25Pct:  pickVideoAction(row.video_p25_watched_actions),
        videoViews50Pct:  pickVideoAction(row.video_p50_watched_actions),
        videoViews75Pct:  pickVideoAction(row.video_p75_watched_actions),
        videoViews100Pct: pickVideoAction(row.video_p100_watched_actions),
        thruplayViews:    pickVideoAction(row.video_thruplay_watched_actions),
        // FASE 8.5 — Sinais de diagnóstico elevados para campos top-level
        qualityRanking:        row.quality_ranking        || undefined,
        engagementRateRanking: row.engagement_rate_ranking || undefined,
        conversionRateRanking: row.conversion_rate_ranking || undefined,
        // first_impression_ratio: razão de impressões novas (proxy de saturação de audiência)
        firstImpressionRatio:  parseInt(row.impressions || 0) > 0
          ? parseInt(row.reach || 0) / parseInt(row.impressions || 1)
          : undefined,
        // Campos de ROI — armazenados em breakdowns (compatibilidade retroativa)
        breakdowns: {
          purchase_value:       parseFloat(purchaseValue),
          quality_ranking:      row.quality_ranking,
          engagement_ranking:   row.engagement_rate_ranking,
          conversion_ranking:   row.conversion_rate_ranking,
          link_clicks:          parseInt(row.link_clicks || 0),
          landing_page_views:   parseInt(row.landing_page_views || 0),
          cost_per_lead:        leads > 0 ? parseFloat(row.spend || 0) / parseInt(leads) : null,
          roas:                 parseFloat(row.spend || 0) > 0
                                  ? parseFloat(purchaseValue) / parseFloat(row.spend || 1)
                                  : null,
          raw_actions:          actions,
          raw_action_values:    actionValues,
        },
      };
    });
  }

  /**
   * FASE 8.5 — Busca learning_stage_info de um ad set (sinal de learning do Meta).
   * Retorna null graciosamente se não disponível.
   */
  async fetchAdSetDelivery(adSetId: string): Promise<{
    learningStatus: string | null;
    learningConversions: number | null;
    effectiveStatus: string | null;
  } | null> {
    try {
      const res = await axios.get(this.url(adSetId), {
        params: {
          fields: 'learning_stage_info,effective_status,delivery_status',
          ...this.auth,
        },
      });
      const d = res.data;
      return {
        learningStatus:      d.learning_stage_info?.status         ?? null,
        learningConversions: d.learning_stage_info?.conversions_bitmask
          ? null  // bitmask — não é o count diretamente
          : d.learning_stage_info?.ad_set_budget_remaining != null
            ? null  // fallback: não disponível via este campo
            : null,
        effectiveStatus: d.effective_status ?? null,
      };
    } catch {
      return null;  // gracioso — não interrompe o fluxo
    }
  }

  /**
   * FASE 8.5 — Busca recomendações do Meta para a conta.
   * Fallback silencioso se sem permissão ou vazio.
   */
  async fetchRecommendations(): Promise<Array<{
    recommendation_type: string;
    title: string;
    message: string;
    confidence: string;
  }>> {
    try {
      const res = await axios.get(this.url(`${this.adAccountId}/recommendations`), {
        params: { ...this.auth, fields: 'recommendation_type,title,message,confidence' },
      });
      return res.data.data || [];
    } catch {
      return [];  // gracioso — recomendações são opcionais
    }
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
    access_token:        settings?.metaToken      || process.env.META_ACCESS_TOKEN       || '',
    ad_account_id:       settings?.adAccountId    || process.env.META_AD_ACCOUNT_ID      || '',
    app_id:              settings?.appId,
    app_secret:          settings?.appSecret,
    page_id:             settings?.pageId         || process.env.META_PAGE_ID            || '',
    pixel_id:            settings?.pixelId        || process.env.META_PIXEL_ID,
    instagram_actor_id:  settings?.instagramActorId,
  });
}
