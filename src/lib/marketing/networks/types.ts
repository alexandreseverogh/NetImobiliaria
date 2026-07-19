// ─────────────────────────────────────────────────────────────
// Network abstraction types — shared by all ad network adapters
// ─────────────────────────────────────────────────────────────

export type NetworkCode = 'meta' | 'google' | 'linkedin' | 'tiktok';

export interface DateRange {
  since: string;  // YYYY-MM-DD
  until: string;  // YYYY-MM-DD
}

export interface NetworkInsight {
  date: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  cpc: number;
  cpm: number;
  ctr: number;
  frequency: number;
  conversions: number;
  leads: number;
  // FASE 5 — Video Metrics
  videoViews3s?: number;
  videoViews15s?: number;
  videoViews25Pct?: number;
  videoViews50Pct?: number;
  videoViews75Pct?: number;
  videoViews100Pct?: number;
  thruplayViews?: number;
  breakdowns?: Record<string, any>;
  // FASE 8.5 — Sinais de diagnóstico do Meta (leading indicators)
  qualityRanking?:        string;  // below_average_10 | below_average_20 | below_average_35 | average | above_average
  engagementRateRanking?: string;
  conversionRateRanking?: string;
  learningStatus?:        string;  // LEARNING | LEARNING_LIMITED | ACTIVE | ...
  learningConversions?:   number;  // conversões acumuladas no período de learning
  firstImpressionRatio?:  number;  // reach / impressions — proxy de saturação de audiência
  // FASE 1 (Google Ads) — Impression Share + ROAS
  searchImpressionShare?: number;  // % de impression share (0-100)
  searchBudgetLostIs?:    number;  // % perdido por orçamento insuficiente
  searchRankLostIs?:      number;  // % perdido por rank/qualidade
  conversionsValue?:      number;  // valor monetário das conversões (para ROAS)
}

export interface TargetingResult {
  id: string;
  name: string;
  type: string;
  audience_size?: number;
}

export interface UploadResult {
  hash: string;
  url?: string;
}

export interface CreateCampaignInput {
  name: string;
  objective: string;
  specialAdCategory?: string;
  /** Meta Pixel ID — para promoted_object. Derivado das credentials se não informado. */
  pixelId?: string;
  /** Tipo do evento de conversão (ex: LEAD, PURCHASE). Derivado do network_defaults do segmento. */
  customEventType?: string;
  adSet: {
    name: string;
    dailyBudget: number;   // in cents
    startTime: string;
    endTime?: string;
    optimizationGoal: string;
    billingEvent: string;
    ageMin: number;
    ageMax: number;
    genders?: number[];
    locations: Record<string, any>;
    interests?: any[];
    scheduleDays?: number[];
    scheduleStartHour?: number;
    scheduleEndHour?: number;
    scheduleTimeSlots?: any;
  };
  ad: {
    name: string;
    creativeType: string;
    images: string[];
    body: string;
    headline?: string;
    linkUrl: string;
    ctaType: string;
  };
  whatsappNumber?: string;
  whatsappMessage?: string;
}

export interface CreateCampaignResult {
  externalId: string;
  externalAdSetId?: string;
  externalAdId?: string;
  networkMetadata: Record<string, any>;
}

export interface GoogleCampaignInput {
  name: string;
  budget: number; // daily budget in cents
  conversionGoal?: string; // Conversion Action ID
  biddingStrategy: {
    type: 'MAXIMIZE_CONVERSIONS' | 'TCPA' | 'TROAS';
    targetValue?: number; // target CPA/ROAS value if applicable
  };
  assetGroups: Array<{
    name: string;
    headlines: string[];
    descriptions: string[];
    images: string[];
    videos?: string[];
    logos?: string[];
    finalUrl: string;
  }>;
  audienceSignals?: {
    keywords?: string[];
    segments?: string[];
  };
}

export interface NetworkCredentials {
  [key: string]: string | undefined;
}

/** Contract every ad network adapter must satisfy. */
export interface AdNetworkService {
  readonly network: NetworkCode;

  validateCredentials(): Promise<{ valid: boolean; error?: string }>;

  uploadCreative(imagePath: string): Promise<UploadResult>;

  createCampaign(input: CreateCampaignInput | GoogleCampaignInput): Promise<CreateCampaignResult>;

  updateCampaignStatus(externalId: string, status: 'ACTIVE' | 'PAUSED'): Promise<void>;

  fetchInsights(externalId: string, dateRange: DateRange): Promise<NetworkInsight[]>;

  searchTargeting(type: 'interest' | 'location' | 'audience', query: string): Promise<TargetingResult[]>;
}
