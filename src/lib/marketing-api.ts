import axios from 'axios';

const api = axios.create({
  baseURL: '/api/admin/campanhas',
});

export interface Creative {
  name: string;
  path: string;
  url: string;
  size: number;
  modifiedAt: string;
}

export interface ClientData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  city?: string;
  state?: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  metaCampaignId?: string;
  tenantId?: string;
  clientId?: string | null;
  name: string;
  objective: string;
  status: string;
  specialAdCategory?: string;
  createdAt: string;
  adSets: AdSet[];
}

export interface AdSet {
  id: string;
  name: string;
  dailyBudget: number;
  startTime: string;
  endTime?: string;
  optimizationGoal: string;
  billingEvent: string;
  ageMin: number;
  ageMax: number;
  genders: number[];
  locations: any;
  interests: any;
  scheduleDays: number[];
  ads: Ad[];
}

export interface Ad {
  id: string;
  name: string;
  status: string;
  creativeType: string;
  images: string[];
  body: string;
  headline?: string;
  linkUrl?: string;
  ctaType: string;
  trackingId?: string;
}

export interface InsightData {
  id: string;
  campaignId: string;
  date: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  cpc: number;
  cpm: number;
  ctr: number;
  conversions: number;
  frequency: number;
}

export interface AiInsightData {
  campaignId: string;
  campaignName: string;
  type: 'OPTIMIZE' | 'PAUSE' | 'SCALE' | 'ALERT';
  title: string;
  description: string;
  confidence: number;
}

export interface LeadData {
  id: string;
  campaignId?: string;
  clientId?: string | null;
  adId?: string;
  phoneClicked: string;
  utmSource?: string;
  utmCampaign?: string;
  utmContent?: string;
  clickedAt: string;
}

// Filtro comum por contexto de cliente
export type ClientFilter = string | 'own' | undefined;

// ─── Clientes ────────────────────────────────────────────────────────────────
export const getClients = (search?: string) =>
  api.get<ClientData[]>('/clients', { params: { search } }).then(r => r.data);

// ─── Criativos ────────────────────────────────────────────────────────────────
export const getCreatives = () =>
  api.get<{ images: Creative[] }>('/criativos').then(r => r.data);

// ─── Campanhas ────────────────────────────────────────────────────────────────
export const getCampaigns = (clientId?: ClientFilter) =>
  api.get<Campaign[]>('/campaigns', { params: { clientId } }).then(r => r.data);

export const createCampaign = (data: any) =>
  api.post('/campaigns', data).then(r => r.data);

export const updateCampaignStatus = (id: string, status: string) =>
  api.patch(`/campaigns/${id}/status`, { status }).then(r => r.data);

export const deleteCampaign = (id: string) =>
  api.delete(`/campaigns/${id}`).then(r => r.data);

// ─── Insights ────────────────────────────────────────────────────────────────
export const getInsights = (params?: { campaignId?: string; clientId?: ClientFilter; startDate?: string; endDate?: string }) =>
  api.get('/insights', { params }).then(r => r.data);

export const syncInsights = () =>
  api.post('/insights/sync').then(r => r.data);

export const getAiInsights = (params?: { campaignId?: string; clientId?: ClientFilter }) =>
  api.get('/insights/ai', { params }).then(r => r.data);

// ─── Leads ────────────────────────────────────────────────────────────────────
export const getLeads = (params?: {
  campaignId?: string;
  clientId?: ClientFilter;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => api.get('/leads', { params }).then(r => r.data);

export const getLeadStats = (params?: {
  clientId?: ClientFilter;
  startDate?: string;
  endDate?: string;
}) => api.get('/leads/stats', { params }).then(r => r.data);

// ─── Configurações ────────────────────────────────────────────────────────────
export const getSettings = () =>
  api.get('/settings').then(r => r.data);

export const updateSettings = (data: any) =>
  api.put('/settings', data).then(r => r.data);

export const getWhatsAppConfig = () =>
  api.get('/settings/whatsapp').then(r => r.data);

export const updateWhatsAppConfig = (data: any) =>
  api.put('/settings/whatsapp', data).then(r => r.data);

export interface ClientWithCreativesPath {
  id: string;
  name: string;
  email: string | null;
  creativesPath: string | null;
}

export const getClientCreativePaths = (): Promise<{ clients: ClientWithCreativesPath[] }> =>
  api.get('/settings/client-creatives').then(r => r.data);

export const updateClientCreativePath = (clientId: string, creativesPath: string) =>
  api.put('/settings/client-creatives', { clientId, creativesPath }).then(r => r.data);

export const searchInterests = (q: string) =>
  api.get('/meta/targeting/interests', { params: { q } }).then(r => r.data);

export const searchLocations = (q: string) =>
  api.get('/meta/targeting/locations', { params: { q } }).then(r => r.data);

// ─── LLM ─────────────────────────────────────────────────────────────────────
export interface LlmSettings {
  llmProvider: string;
  llmModel: string;
  llmApiKeyMasked: string;
  llmApiKeySet: boolean;
}

export interface LlmModelOption {
  id: string;
  provider: string;
  providerLabel: string;
  modelId: string;
  modelLabel: string;
  baseUrl: string | null;
  qualityScore: number;
  isFree: boolean;
  contextWindow: number | null;
  isRecommended: boolean;
  notes: string | null;
}

export interface LlmModelsResponse {
  providers: Record<string, { label: string; models: LlmModelOption[] }>;
  flat: LlmModelOption[];
}

export const getLlmSettings = () =>
  api.get<LlmSettings>('/settings/llm').then(r => r.data);

export const getLlmModels = () =>
  api.get<LlmModelsResponse>('/settings/llm/models').then(r => r.data);

export const updateLlmSettings = (data: { llmProvider?: string; llmModel?: string; llmApiKey?: string }) =>
  api.put('/settings/llm', data).then(r => r.data);

export const testLlmConnection = () =>
  api.post<{ success: boolean; provider: string; model: string; response?: string; error?: string }>('/settings/llm/test').then(r => r.data);

export const testWhatsAppBriefing = () =>
  api.post('/settings/whatsapp/test-briefing').then(r => r.data);

// ─── Briefings ───────────────────────────────────────────────────────────────
export interface StrategicBriefingData {
  id: string;
  type: string;
  clientId?: string | null;
  content: {
    urgentAlerts: string[];
    performanceSummary: string;
    campaignAnalysis: { campaignName: string; status: string; recommendation: string }[];
    budgetRecommendations: string[];
    actionItems: string[];
    tomorrowPlan?: string;
  };
  createdAt: string;
}

export const getBriefings = (params?: { limit?: number; type?: string; clientId?: ClientFilter }) =>
  api.get<StrategicBriefingData[]>('/briefings', { params }).then(r => r.data);

export const getLatestBriefing = (params?: { type?: string; clientId?: ClientFilter }) =>
  api.get<StrategicBriefingData | null>('/briefings/latest', { params }).then(r => r.data);

export const generateBriefing = (type: string, clientId?: string) =>
  api.post<StrategicBriefingData>('/briefings/generate', { type, clientId }).then(r => r.data);

// ─── Dashboard ───────────────────────────────────────────────────────────────
export interface DeltaData {
  spend: number;
  clicks: number;
  impressions: number;
  reach: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  leads: number;
}

export interface FunnelData {
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
}

export interface DashboardTotals {
  spend: number;
  clicks: number;
  impressions: number;
  reach: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

export interface DashboardFullData {
  currentPeriod: { insights: InsightData[]; totals: DashboardTotals; leadCount: number };
  previousPeriod: { totals: DashboardTotals; leadCount: number };
  deltas: DeltaData;
  campaigns: Campaign[];
  adSets: { id: string; name: string; campaignId: string; campaignName: string }[];
  dailyLeads: { date: string; count: number }[];
  funnelData: FunnelData;
}

export interface PredictionPoint {
  date: string;
  predicted: number;
  upperBound: number;
  lowerBound: number;
}

export interface PredictionData {
  spend: PredictionPoint[];
  leads: PredictionPoint[];
  ctr: PredictionPoint[];
  cpc: PredictionPoint[];
  historical: {
    dates: string[];
    spend: number[];
    clicks: number[];
    impressions: number[];
    ctr: number[];
    cpc: number[];
    leads: number[];
  };
  insufficientData?: boolean;
}

export const getDashboardFull = (params?: {
  startDate?: string;
  endDate?: string;
  campaignId?: string;
  clientId?: ClientFilter;
  objectiveFilter?: string;
  statusFilter?: string;
  adSetId?: string;
}) => api.get<DashboardFullData>('/dashboard/full', { params }).then(r => r.data);

export const getDashboardPredictions = (params?: {
  campaignId?: string;
  clientId?: ClientFilter;
  days?: number;
}) => api.get<PredictionData>('/dashboard/predictions', { params }).then(r => r.data);

export default api;
