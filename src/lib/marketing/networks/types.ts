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

export interface NetworkCredentials {
  [key: string]: string | undefined;
}

/** Contract every ad network adapter must satisfy. */
export interface AdNetworkService {
  readonly network: NetworkCode;

  validateCredentials(): Promise<{ valid: boolean; error?: string }>;

  uploadCreative(imagePath: string): Promise<UploadResult>;

  createCampaign(input: CreateCampaignInput): Promise<CreateCampaignResult>;

  updateCampaignStatus(externalId: string, status: 'ACTIVE' | 'PAUSED'): Promise<void>;

  fetchInsights(externalId: string, dateRange: DateRange): Promise<NetworkInsight[]>;

  searchTargeting(type: 'interest' | 'location' | 'audience', query: string): Promise<TargetingResult[]>;
}
