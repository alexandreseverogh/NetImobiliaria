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

/**
 * Saldo/limite de gasto da conta de anúncio — nível CONTA, não campanha (um único ad account
 * por tenant+rede hoje, ver `getNetworkServiceForTenant`; nunca varia por cliente/segmento).
 * Nem toda rede expõe esse dado de verdade via API (ex.: Google Ads não tem endpoint de "saldo
 * da carteira" pra pagamento manual/automático padrão) — quando não dá pra obter,
 * `unavailableReason` explica o motivo e os demais campos numéricos vêm `null`, nunca um "0"
 * mentiroso que pareça saldo esgotado.
 */
export interface AccountBalanceResult {
  network: NetworkCode;
  /** Moeda da conta (ISO 4217, ex. "BRL"), quando a rede informa. */
  currency: string | null;
  /** Gasto acumulado no ciclo/teto atual, já convertido pra unidade principal da moeda (reais, não centavos). */
  amountSpent: number | null;
  /** Teto de gasto configurado na conta (spend cap) — `null` = sem teto definido (não é zero). */
  spendCap: number | null;
  /** `spendCap - amountSpent` quando há teto definido; `null` quando a conta não tem teto (gasto
   *  é limitado só pela fonte de pagamento, não há "saldo disponível" programático nesse caso). */
  available: number | null;
  /** Valor em aberto a pagar à rede (fatura devida) — conceito distinto de "saldo disponível
   *  pra gastar"; Meta expõe isso como `balance` (nunca confundir os dois). */
  balanceDue: number | null;
  /** Conta é pré-pago? `null` quando a rede não informa esse dado. */
  isPrepay: boolean | null;
  /** Descrição legível da fonte de pagamento (cartão, fatura, etc.), quando disponível. */
  fundingSourceType: string | null;
  checkedAt: string; // ISO timestamp da consulta
  /** Motivo amigável quando a rede não expõe saldo/limite programaticamente — nunca um erro cru. */
  unavailableReason?: string;
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

  /** Opcional — nem toda rede/adapter real expõe saldo programaticamente ainda (ver
   *  AccountBalanceResult). Quando ausente, o chamador deve tratar como "não disponível",
   *  nunca assumir zero. */
  fetchAccountBalance?(): Promise<AccountBalanceResult>;

  /** Opcional — lista TODAS as campanhas que já existem na conta de anúncios, inclusive as
   *  que nunca passaram pelo nosso wizard (ex.: lançadas direto no Meta Ads Manager). Base
   *  da funcionalidade "Importar Campanhas Existentes" — ver /admin/campanhas/importar. */
  fetchAccountCampaigns?(): Promise<ExternalCampaignSummary[]>;
}

/** Resumo de 1 campanha vista direto na API da rede, pra fluxo de importação (ver
 *  fetchAccountCampaigns acima) — deliberadamente mínimo, só o que basta pro usuário decidir
 *  se quer importar e pra criarmos a linha local de Campaign. */
export interface ExternalCampaignSummary {
  externalId: string;
  name: string;
  status: string;
  objective: string | null;
  createdTime: string | null;
  /** true quando já existe uma Campaign local com este externalId (não deveria aparecer pra
   *  re-importar, mas o chamador decide — o adapter só reporta o fato). */
}
