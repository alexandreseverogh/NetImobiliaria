import axios from 'axios';

const api = axios.create({
  baseURL: '/api/admin/campanhas',
});

// Injeta o Bearer token do localStorage em todas as requisições
api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin-auth-token');
    if (token) {
      config.headers = config.headers ?? {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
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
  // FASE 4 — lifecycle
  lifecycleStatus?: string;
  lifecycleChangedAt?: string | null;
  // FASE 7 — funnel stage
  funnelStage?: string;
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
  // FASE 5 — Video Metrics
  videoViews3s?: number;
  videoViews15s?: number;
  thruplayViews?: number;
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

// ─── Segmentos ───────────────────────────────────────────────────────────────
export interface SegmentOption {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  colorTheme: string | null;
  clientCount: number;
  campaignCount: number;
  isOwn: boolean;
}

export const getSegments = () =>
  api.get<SegmentOption[]>('/segments').then(r => r.data);

// ─── Clientes ────────────────────────────────────────────────────────────────
export const getClients = (params?: { search?: string; segmentId?: string }) =>
  api.get<ClientData[]>('/clients', { params }).then(r => r.data);

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

export const getAiInsights = (params?: {
  campaignId?: string; clientId?: ClientFilter; segmentId?: string;
  objectiveFilter?: string; statusFilter?: string; adSetId?: string;
  startDate?: string; endDate?: string; network?: string;
}) => api.get('/insights/ai', { params }).then(r => r.data);

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
  campaignId?: string;
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

// ─── Identidade Meta (page_id, pixel_id, instagram, website) ─────────────────
export interface MetaIdentitySettings {
  pageId:           string;
  pixelId:          string;
  instagramActorId: string;
  accessToken:      string;
  appId:            string;
  adAccountId:      string;
  credentialsActive: boolean;
  lastValidated:    string | null;
  tokenExpiresAt:   string | null;
  website:          string;
  tenantName:       string;
}

export const getMetaIdentity = (): Promise<MetaIdentitySettings> =>
  api.get('/settings/meta-identity').then(r => r.data);

export const updateMetaIdentity = (data: {
  pageId?: string;
  pixelId?: string;
  instagramActorId?: string;
  website?: string;
}) => api.put('/settings/meta-identity', data).then(r => r.data);


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
  segmentId?: string | null;
  segmentName?: string | null;
  periodDays?: number | null;
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

export const getBriefings = (params?: { limit?: number; type?: string; clientId?: ClientFilter; segmentId?: string }) =>
  api.get<StrategicBriefingData[]>('/briefings', { params }).then(r => r.data);

export const getLatestBriefing = (params?: { type?: string; clientId?: ClientFilter; segmentId?: string }) =>
  api.get<StrategicBriefingData[]>('/briefings/latest', { params }).then(r => r.data);

export const generateBriefing = (
  type: string,
  clientId?: string,
  periodDays?: number,
  segmentId?: string,
  startDate?: string,
  endDate?: string,
) =>
  api.post<StrategicBriefingData[]>('/briefings/generate', { type, clientId, periodDays, segmentId, startDate, endDate }).then(r => r.data);

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
  spendByNetwork?: Record<string, number>;
}

export interface DashboardFullData {
  currentPeriod: { insights: InsightData[]; totals: DashboardTotals; leadCount: number };
  previousPeriod: { totals: DashboardTotals; leadCount: number };
  deltas: DeltaData;
  campaigns: Campaign[];
  adSets: { id: string; name: string; campaignId: string; campaignName: string }[];
  dailyLeads: { date: string; count: number }[];
  leadsByNetwork?: Record<string, number>;
  // FASE 1 (Google Ads) A7 — comparativo CPL por rede (meta/google/...)
  cplByNetwork?: Record<string, { spend: number; leads: number; cpl: number | null }>;
  // PARTE D1 — redes com dado real no escopo atual (antes do filtro de rede), alimenta o seletor
  availableNetworks?: string[];
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
  /** Multiplicador de sigma usado nas bandas (ex: 1.5 → ±1.5σ ≈ 86.6 %) */
  sigmaMult?: number;
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

// ─── Funil (FASE 7) ──────────────────────────────────────────────────────────

export interface FunnelStage {
  code: string;
  label: string;
  icon: string;
  campaigns_count: number;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
}

export interface FunnelConversionRates {
  tof_ctr:     number;   // CTR do topo (impressões→cliques)
  mof_ltr:     number;   // Lead-through-rate do meio (cliques→leads)
  bof_cvr:     number;   // Conversion rate do fundo (leads→conversões)
  overall_ctr: number;
  overall_ltr: number;
  overall_cpl: number;
}

export interface FunnelData7 {
  stages:          FunnelStage[];
  conversionRates: FunnelConversionRates;
  totals: {
    spend: number; impressions: number; clicks: number;
    leads: number; conversions: number; cpl: number;
  };
  bottleneck: string | null;
  period: { startDate: string; endDate: string };
}

export const getFunnelData = (params?: {
  startDate?: string; endDate?: string; clientId?: ClientFilter; segmentId?: string;
  campaignId?: string; objectiveFilter?: string; statusFilter?: string; adSetId?: string;
  network?: string;
}) => api.get<FunnelData7>('/dashboard/funnel', { params }).then(r => r.data);

export const generateFunnelDiagnosis = (body: {
  stages: FunnelStage[];
  conversionRates: FunnelConversionRates;
  totals: FunnelData7['totals'];
  period: { startDate: string; endDate: string };
  clientId?: ClientFilter;
}) => api.post<{ diagnosis: string; generatedAt: string }>('/dashboard/funnel/diagnosis', body).then(r => r.data);

export const updateCampaignFunnelStage = (id: string, funnelStage: string) =>
  api.patch(`/campaigns/${id}/funnel-stage`, { funnelStage }).then(r => r.data);

export const getDashboardFull = (params?: {
  startDate?: string;
  endDate?: string;
  campaignId?: string;
  clientId?: ClientFilter;
  segmentId?: string;
  objectiveFilter?: string;
  statusFilter?: string;
  adSetId?: string;
  network?: string;
}) => api.get<DashboardFullData>('/dashboard/full', { params }).then(r => r.data);

export const getDashboardPredictions = (params?: {
  campaignId?: string; clientId?: ClientFilter; segmentId?: string; days?: number;
  objectiveFilter?: string; statusFilter?: string; adSetId?: string;
  startDate?: string; endDate?: string; network?: string;
}) => api.get<PredictionData>('/dashboard/predictions', { params }).then(r => r.data);

/* ──────────────────────────────────────────────────────────────
   FASE 8 — Tracking Health Monitor
────────────────────────────────────────────────────────────── */

export type HealthCheckStatus = 'ok' | 'warn' | 'critical' | 'skip';

export interface TrackingCheckResult {
  id: string;
  label: string;
  status: HealthCheckStatus;
  value: string | number | null;
  detail: string;
}

export interface TrackingHealthIssue {
  severity: 'warn' | 'critical';
  checkId: string;
  message: string;
}

export interface TrackingHealthResult {
  id?: string;
  overallScore: number;
  checks: TrackingCheckResult[];
  issues: TrackingHealthIssue[];
  createdAt?: string;
}

export interface TrackingHealthHistoryEntry {
  id: string;
  overallScore: number;
  issueCount: number;
  createdAt: string;
}

export interface TrackingHealthData {
  latest: TrackingHealthResult | null;
  history: TrackingHealthHistoryEntry[];
}

export const getTrackingHealth = (clientId?: string | null, segmentId?: string | null) =>
  api.get<TrackingHealthData>('/tracking/health', {
    params: { ...(clientId ? { clientId } : {}), ...(segmentId ? { segmentId } : {}) },
  }).then(r => r.data);

export const runTrackingHealth = (clientId?: string | null, segmentId?: string | null) =>
  api.post<TrackingHealthResult>('/tracking/health', {
    ...(clientId ? { clientId } : {}),
    ...(segmentId ? { segmentId } : {}),
  }).then(r => r.data);

/* ──────────────────────────────────────────────────────────────
   BENCHMARKS — resolução dinâmica por tenant/segmento/cliente
────────────────────────────────────────────────────────────── */

export interface HookRateBenchmarks {
  hook_rate_critical: number;
  hook_rate_min:      number;
  hook_rate_good:     number;
}

export const getHookRateBenchmarks = (clientId?: string | null, segmentId?: string | null): Promise<HookRateBenchmarks> =>
  api.get<HookRateBenchmarks>('/benchmarks', {
    params: {
      keys: 'hook_rate_critical,hook_rate_min,hook_rate_good',
      ...(clientId  ? { clientId }  : {}),
      ...(segmentId ? { segmentId } : {}),
    },
  }).then(r => r.data);

/* ──────────────────────────────────────────────────────────────
   FASE 8.5 — Signal-Driven Anticipation
────────────────────────────────────────────────────────────── */

export type CalibrationAction =
  | 'HOLD_BUDGET'
  | 'SWAP_CREATIVE'
  | 'EXPAND_AUDIENCE'
  | 'SHIFT_BUDGET'
  | 'REVIEW_OFFER'
  | 'SCALE';

export interface CalibrationInsight {
  campaignId:   string;
  campaignName: string;
  action:       CalibrationAction;
  title:        string;
  detail:       string;
  confidence:   number;
}

export interface TimeToEvent {
  event:      'FATIGUE' | 'EXIT_LEARNING' | 'AUDIENCE_EXHAUSTION';
  adsetId?:   string;
  campaignId: string;
  daysUntil:  number | null;
  detail:     string;
  confidence: number;
}

export interface Trajectory {
  signal:      'engagement_ranking' | 'cpm' | 'frequency' | 'first_impression_ratio';
  direction:   'up' | 'down' | 'stable';
  implication: string;
  values:      number[];
}

export interface AnticipationResult {
  campaignId:   string;
  events:       TimeToEvent[];
  trajectories: Trajectory[];
}

export const getAnticipation = (params?: {
  clientId?: ClientFilter;
  segmentId?: string;
  campaignId?: string;
  network?: string;
}) => api.get<AnticipationResult[]>('/dashboard/anticipation', { params }).then(r => r.data);

export const getCalibrationInsights = (params?: {
  campaignId?: string;
  clientId?: ClientFilter;
  objectiveFilter?: string;
  statusFilter?: string;
}) => api.get<{ insights: AiInsightData[]; calibrationActions: CalibrationInsight[] }>(
  '/insights/ai', { params }
).then(r => r.data);

/* ──────────────────────────────────────────────────────────────
   FASE 10 — Portfolio Dashboard + Cross-Pollination
────────────────────────────────────────────────────────────── */

export interface PortfolioMetrics {
  spend: number;
  leads: number;
  cpl: number | null;
  ctr: number | null;
  impressions: number;
  clicks: number;
  campaigns: number;
}

export interface PortfolioBenchmarks {
  cplIdeal: number | null;
  cplCritical: number | null;
  ctrMin: number | null;
}

export interface PortfolioClient {
  clientId: string | null;
  clientName: string;
  segment: { id: string; name: string; slug: string } | null;
  metrics: PortfolioMetrics;
  benchmarks: PortfolioBenchmarks;
  status: 'ok' | 'warn' | 'critical' | 'nodata';
}

export interface PortfolioData {
  period: number;
  totalClients: number;
  totalSpend: number;
  totalLeads: number;
  avgCpl: number | null;
  clients: PortfolioClient[];
}

export const getPortfolio = (params?: {
  period?: number;
  segmentId?: string;
}) => api.get<PortfolioData>('/campanhas/portfolio', { params }).then(r => r.data);

/* ── Cross-Insights ── */

export type CrossInsightType = 'opportunity' | 'warning' | 'pattern';

export interface CrossInsight {
  id: string;
  type: CrossInsightType;
  title: string;
  description: string;
  sourceClients: string[];
  targetClients: string[];
  metric?: string;
  improvement?: string;
}

export interface CrossInsightsData {
  generatedAt: string;
  period: number;
  totalClients: number;
  narrative: string | null;
  insights: CrossInsight[];
  topPerformers: { clientName: string; cpl: number | null; spend: number }[];
  underperformers: { clientName: string; cpl: number | null; spend: number; reason: string }[];
}

export const getCrossInsights = (params?: { period?: number }) =>
  api.get<CrossInsightsData>('/campanhas/portfolio/cross-insights', { params }).then(r => r.data);

export const generateCrossInsightsNarrative = (params?: { period?: number }) =>
  api.post<CrossInsightsData>('/campanhas/portfolio/cross-insights', params ?? {}).then(r => r.data);

/* ──────────────────────────────────────────────────────────────
   FASE 1 (Google Ads) A7 — drill-down de Search Terms
────────────────────────────────────────────────────────────── */

export interface GoogleSearchTermRow {
  campaignId: string;
  searchTerm: string;
  matchType: string;
  status: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
}

export interface GoogleCampaignSummary {
  id: string;
  name: string;
  avgSearchBudgetLostIs: number;
  roas: number | null;
}

export interface GoogleSearchTermsData {
  campaigns: GoogleCampaignSummary[];
  terms: GoogleSearchTermRow[];
}

export const getGoogleSearchTerms = (params?: { campaignId?: string; status?: string; windowDays?: number }) =>
  api.get<GoogleSearchTermsData>('/google/search-terms', { params }).then(r => r.data);

export const negateGoogleSearchTerm = (data: { campaignId: string; searchTerm: string; matchType: string }) =>
  api.post<{ ok: boolean }>('/google/search-terms/negate', data).then(r => r.data);

export default api;
