# Análise Estratégica — Adoção do Framework "AI Ads Auditor"

> ⚠️ **PREREQUISITO DE LEITURA**: este documento assume que você já leu
> **[FUNDACAO_MULTISEGMENT_E_PROMPT_MANAGEMENT.md](FUNDACAO_MULTISEGMENT_E_PROMPT_MANAGEMENT.md)**.
>
> A fundação corrige duas premissas estruturais deste documento:
> 1. A plataforma é **multi-segmento** (não apenas imobiliário)
> 2. Toda inteligência LLM deve ser **configurável via banco**, não hardcoded
>
> Sem essa fundação (Fase 0), as funcionalidades aqui descritas herdam acoplamento
> ao segmento imobiliário e impossibilitam customização.

> **Documento de decisão arquitetural e de produto**
> Análise sob duas óticas: **gestor sênior de tráfego pago** + **arquiteto sênior de soluções**.
> Decide o que incorporar, o que rejeitar, e mapeia o impacto técnico real no nosso sistema atual.

---

## 1. Sumário Executivo

### 1.1. Veredito em Uma Linha

> **Adotar 7 das ~20 ideias propostas. Rejeitar 8. Já temos 5 implementadas melhor que a proposta.**

### 1.2. Quadro-Resumo de Decisão

| # | Proposta do Documento | Decisão | Razão |
|---|---|---|---|
| 1 | **Campaign State Machine** (8 estados) | ✅ **ADOTAR — Prioridade Crítica** | Diferencial enorme. Hoje só temos ACTIVE/PAUSED. |
| 2 | **Creative Intelligence Layer** | ✅ **ADOTAR — Prioridade Alta** | Não existe. Maior diferencial competitivo do mercado. |
| 3 | **Tracking Health Monitor** | ✅ **ADOTAR — Prioridade Alta** | Crítico para imobiliário. Não temos. |
| 4 | **Funnel Stage Classification** (TOF/MOF/BOF) | ✅ **ADOTAR — Prioridade Média** | Habilita análises mais inteligentes. |
| 5 | **Wasted Spend Quantification** | ✅ **ADOTAR — Prioridade Média** | Impacto comercial direto. Cálculo derivado, baixo custo. |
| 6 | **Hook Rate + Video Metrics** | ✅ **ADOTAR — Prioridade Média** | Schema atual não comporta. Vital para criativos em vídeo. |
| 7 | **Audit Report Estruturado** (com health scorecard) | ✅ **ADOTAR — Prioridade Média** | Complementa briefing. Visão executiva mensal. |
| 8 | Causality-focused insights | 🔄 **EVOLUIR O QUE TEMOS** | Briefing já faz, mas pode ser mais explícito sobre causa-raiz. |
| 9 | Action Queue com aprovação | ✅ **JÁ TEMOS** (AgentAction) | Manter + enriquecer com `estimated_impact`. |
| 10 | Multi-layer (rules + LLM) | ✅ **JÁ TEMOS** | Nossa arquitetura já é exatamente assim. |
| 11 | LLM como estrategista (não calculadora) | ✅ **JÁ TEMOS** | Princípio respeitado. |
| 12 | Fallback rule-based se LLM falha | ✅ **JÁ TEMOS** | Implementado em todos os pontos. |
| 13 | Multi-tenant + multi-LLM provider | ✅ **JÁ TEMOS — MELHOR** | 8 providers, 23 modelos. Documento propõe single Anthropic. |
| 14 | **Google Ads** (Search/Shopping/PMax/Keyword) | ❌ **REJEITAR — fora de escopo** | Aumenta complexidade massivamente. Fase 4+. |
| 15 | **CSV upload approach** | ❌ **REJEITAR — regressão arquitetural** | Temos API integrada. CSV é solução para quem NÃO tem integração. |
| 16 | Benchmarks ecommerce (ROAS 4x, AOV) | ❌ **REJEITAR diretamente** | Não se aplica a lead gen imobiliário. Calibrar próprios. |
| 17 | System prompt único fixo | ❌ **REJEITAR** | Regredir para single-prompt perderia especialização atual. |
| 18 | Auditoria sob demanda via UI separada | ❌ **REJEITAR formato isolado** | Integrar como secção do dashboard, não ferramenta paralela. |
| 19 | "AI Ads Auditor" como produto standalone | ❌ **REJEITAR posicionamento** | Somos plataforma de gestão, não auditor isolado. |
| 20 | PDF report generation | 🟡 **POSTERGAR (Fase 3)** | Útil mas baixa prioridade. |

### 1.3. Posicionamento Estratégico

O documento posiciona o produto como **"AI Ads Auditor"** (ferramenta de auditoria pontual).
Nós somos algo **maior**: **"Autonomous Paid Media Operating System"**.

A diferença é estrutural:
- **Auditor**: usuário envia dados → recebe diagnóstico → age manualmente
- **Operating System**: sistema observa em tempo real → decide → executa → notifica → aprende

**As incorporações devem reforçar nossa posição como OS, não nos rebaixar para auditor.**

---

## 2. Análise Comparativa Profunda

### 2.1. Filosofia Arquitetural

| Dimensão | Documento Propõe | Nós Temos | Vencedor |
|---|---|---|---|
| Coleta de dados | CSV upload manual | API Meta integrada (sync 6h) | **Nós** |
| Multi-tenant | Não mencionado | Sim, com filtro por cliente | **Nós** |
| Multi-LLM | Single (Anthropic) | 8 providers, 23 modelos | **Nós** |
| Camada de regras | Sim, central | Sim (`aiInsights.ts`, 6 regras) | **Empate** |
| LLM enriquece, não decide | Princípio defendido | Implementado em `agentDecisor.ts` | **Empate** |
| Fallback rule-based | Recomendado | Implementado em `strategicBriefing.ts` | **Empate** |
| Execução autônoma de ações | "Action Queue" + humano aprova | `AgentAction` com 6 estados + aprovação WhatsApp | **Nós** |
| Notificação executiva | Não detalhado | WhatsApp formatado + Slack | **Nós** |
| Predições futuras | Não mencionado | Regressão linear 30 dias com bandas | **Nós** |
| Campaign lifecycle | **8 estados (State Machine)** | **2 estados (ACTIVE/PAUSED)** | **Documento** |
| Creative analysis | **Layer dedicada** | **Nenhuma análise estrutural** | **Documento** |
| Funnel awareness | **TOF/MOF/BOF nativo** | **Sem classificação** | **Documento** |
| Tracking health | **Skill dedicada** | **Não monitora** | **Documento** |
| Wasted spend explícito | **Quantifica e prioriza** | **Não calcula** | **Documento** |
| Health scorecard | **Score 1–10 por área** | **Não tem** | **Documento** |

### 2.2. Sobreposições (não duplicar)

```
DOCUMENTO PROPÕE                            JÁ TEMOS
────────────────────                        ────────────
Skill 2: KPI Mapper          ──────────▶   Dashboard /full + AI Insights
Skill 4: AdSet Analyzer      ──────────▶   aiInsights.ts (regras 1-6)
Skill 5: Performance Auditor ──────────▶   strategicBriefing.ts
Skill 11: Master Audit Prompt──────────▶   Briefing tipo 'manual'
Multi-layer Architecture     ──────────▶   3 motores documentados
Action Queue                 ──────────▶   AgentAction (status machine)
LLM como estrategista         ──────────▶   buildPrompt() já segue padrão
```

**Conclusão:** As 6 sobreposições acima **não devem ser reimplementadas**. Devemos **enriquecer o que temos** com os refinamentos do documento (ex: o "AdSet Analyzer" propõe label `LEARNING LIMITED` que faltam nas nossas regras).

### 2.3. Lacunas Reais (onde o documento agrega valor)

```
LACUNA                                      VALOR DE NEGÓCIO
──────                                      ────────────────
Campaign State Machine                      ★★★★★  Permite decisões contextualizadas
Creative Intelligence                       ★★★★★  Diferencial competitivo único
Tracking Health Check                       ★★★★    Evita budget desperdiçado em tracking quebrado
Funnel Stage Classification                 ★★★★    Habilita análises de funil reais
Wasted Spend Quantification                 ★★★★    Argumento comercial poderoso
Hook Rate / Video Metrics                   ★★★     Vital para vídeos, hoje invisível
Health Scorecard                            ★★★     Visão executiva mensal
Causality-first insights                    ★★★     Mais persuasivo para gestor
Weekly Action Plan estruturado              ★★      Já temos no briefing, formalizar mais
```

### 2.4. O que o Documento Erra (sob ótica de gestor sênior)

#### 2.4.1. Benchmarks Inadequados para Imobiliário

O documento usa benchmarks de **ecommerce**:
- `ROAS 2x+ baseline` — irrelevante para lead gen (não há venda direta)
- `CPA < 30% AOV` — não existe AOV em imobiliário
- `Shopping CTR 0.5-1.5%` — não rodamos shopping
- `BOF conversion 2-5% ecom` — métrica de checkout, não aplicável

**Benchmarks corretos para imobiliário (lead gen via WhatsApp):**

| Métrica | Ruim | OK | Ótimo |
|---|---|---|---|
| CTR (link) | < 1.0% | 1.0–2.5% | > 2.5% |
| CPL (R$) | > R$40 | R$15–40 | < R$15 |
| Lead → Visita | < 5% | 5–15% | > 15% |
| Visita → Proposta | < 10% | 10–25% | > 25% |
| Frequência | > 4.0 | 2.0–4.0 | < 2.0 |
| CPM | > R$30 | R$15–30 | < R$15 |

> **Ação:** ao incorporar funcionalidades, **criar tabela `BenchmarkProfile`** com perfis (imobiliário, ecommerce, serviços, etc.) configurável por tenant.

#### 2.4.2. Negative Keywords e Google Ads

Toda a Skill 7, 8, 9, 10 e a lista de negative keywords são **Google Ads only**. Não rodamos Google Ads. **Adicionar Google Ads é uma decisão de roadmap (Fase 4+)**, não algo a incorporar agora.

#### 2.4.3. CSV Upload é Regressão

O documento defende CSV pois assume que o sistema **não tem API integrada**. Nós temos. Implementar upload CSV:
- Adiciona código de parser, normalização, validação
- Cria caminho paralelo de manutenção
- Confunde o usuário ("uso API ou subo CSV?")
- Reduz frescor dos dados (sync 6h vs export ad-hoc)

**Exceção válida:** CSV pode entrar apenas como **fallback** caso o token Meta de um tenant expire. Mesmo assim, prioridade baixa.

#### 2.4.4. Single System Prompt vs Especialização

O documento propõe um único system prompt:
```
You are a senior paid media consultant specialized in Meta Ads + Google Ads + ecommerce + lead gen
```

Nós já temos **prompts especializados por tipo de briefing** (`morning`, `closing`, `manual` com instruções diferentes em `strategicBriefing.ts`). Regredir para single prompt perderia contexto temporal.

---

## 3. O Que Adotar — Detalhamento Técnico

### 3.1. CAMPAIGN STATE MACHINE (Prioridade Crítica)

#### 3.1.1. Estado Atual

```
Campaign.status: enum { ACTIVE, PAUSED }
```

Limitação: o sistema **não distingue** uma campanha recém-criada de uma que está aprendendo, escalando ou fatigada. Toda lógica de decisão precisa **recalcular do zero** a cada execução do agente.

#### 3.1.2. Estado Proposto

```
Campaign.lifecycle_status: enum
  DRAFT       → criada no app, não publicada no Meta
  READY       → publicada no Meta, status=PAUSED
  LEARNING    → ativa, < 50 conversões em 7 dias (fase aprendizado Meta)
  SCALING     → ativa, performando acima da meta (ROAS/CPL)
  STABLE      → ativa, performando dentro da meta (sem alerta)
  FATIGUED    → ativa, sinais de fadiga (freq > 3.5, CTR caindo)
  PAUSED      → manualmente pausada
  KILLED      → arquivada (não retornar em queries default)
```

#### 3.1.3. Diagrama de Transições

```
              ┌───────┐
              │ DRAFT │
              └───┬───┘
                  │ publish_to_meta()
                  ▼
              ┌───────┐
              │ READY │
              └───┬───┘
                  │ activate()
                  ▼
            ┌──────────┐
            │ LEARNING │ ◄────────┐
            └─────┬────┘          │ Meta reset learning
                  │ 50+ convs     │ (criativo trocado, audiência mudou)
                  ▼               │
            ┌──────────┐          │
            │  STABLE  │──────────┤
            └────┬─────┘          │
        ┌───────┼──────────┐      │
        │       │          │      │
        ▼       ▼          ▼      │
    ┌────────┐ ┌────────┐ ┌───────────┐
    │ SCALING│ │FATIGUED│ │  PAUSED  │
    └───┬────┘ └────┬───┘ └─────┬────┘
        │           │           │
        │           │           │
        └───────────┴─────┐     │
                          ▼     ▼
                       ┌────────┐
                       │ KILLED │
                       └────────┘
```

#### 3.1.4. Impacto no Banco de Dados

**Tabela `Campaign` — alteração:**
```sql
ALTER TABLE campanhasmarketingdigital."Campaign"
  ADD COLUMN lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN lifecycle_changed_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN learning_started_at TIMESTAMP,
  ADD COLUMN stable_since TIMESTAMP;

CREATE INDEX idx_campaign_lifecycle ON campanhasmarketingdigital."Campaign"(lifecycle_status, tenant_id);
```

**Nova tabela `CampaignLifecycleEvent`:**
```sql
CREATE TABLE campanhasmarketingdigital."CampaignLifecycleEvent" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES "Campaign"(id) ON DELETE CASCADE,
  tenant_id       UUID,
  from_status     VARCHAR(20),
  to_status       VARCHAR(20) NOT NULL,
  trigger_source  VARCHAR(20) NOT NULL,  -- 'AGENT', 'MANUAL', 'SYNC', 'CRON'
  reason          TEXT,
  metrics_snapshot JSONB,                 -- KPIs do momento da transição
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lifecycle_event_campaign ON "CampaignLifecycleEvent"(campaign_id, created_at DESC);
```

#### 3.1.5. Impacto em Código

**Novo serviço:** `src/lib/marketing/services/campaignStateMachine.ts`
```typescript
export type LifecycleStatus = 'DRAFT' | 'READY' | 'LEARNING' | 'STABLE' |
                              'SCALING' | 'FATIGUED' | 'PAUSED' | 'KILLED';

export const VALID_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  DRAFT:     ['READY', 'KILLED'],
  READY:     ['LEARNING', 'PAUSED', 'KILLED'],
  LEARNING:  ['STABLE', 'FATIGUED', 'PAUSED', 'KILLED'],
  STABLE:    ['SCALING', 'FATIGUED', 'LEARNING', 'PAUSED', 'KILLED'],
  SCALING:   ['STABLE', 'FATIGUED', 'PAUSED', 'KILLED'],
  FATIGUED:  ['LEARNING', 'PAUSED', 'KILLED'],
  PAUSED:    ['LEARNING', 'KILLED'],
  KILLED:    [],
};

export async function transitionCampaign(
  campaignId: string,
  toStatus: LifecycleStatus,
  source: 'AGENT' | 'MANUAL' | 'SYNC' | 'CRON',
  reason: string,
  metricsSnapshot?: any
): Promise<void> {
  // valida transição, persiste evento, atualiza Campaign
}

export async function inferLifecycleStatus(campaignId: string): Promise<LifecycleStatus> {
  // analisa últimas métricas e retorna status sugerido
}
```

**Atualizar `agentDecisor.ts`:** ao detectar FATIGUE/PAUSE, chamar `transitionCampaign()` antes de executar.

**Atualizar `agentMonitor.ts`:** após `syncMetrics()`, rodar `inferLifecycleStatus()` para cada campanha ativa e auto-transicionar.

#### 3.1.6. Ganho para o Gestor

**Antes:**
> "Campanha Aurora está ACTIVE."

**Depois:**
> "Campanha Aurora está **FATIGUED** desde 2026-05-23 (há 2 dias). Antes disso estava **STABLE** por 18 dias com CPL R$22. Transição automática disparada pelo agente — frequência subiu de 2.1 para 4.3 e CTR caiu 41%."

---

### 3.2. CREATIVE INTELLIGENCE LAYER (Prioridade Alta)

#### 3.2.1. O Que É

Camada que **analisa o conteúdo do criativo** (imagem/vídeo/texto) e **correlaciona com performance**, permitindo identificar **padrões vencedores e replicar**.

#### 3.2.2. Por Que É um Diferencial Competitivo Único

Hoje, todo gestor sabe **quais** criativos performam. Pouquíssimas plataformas dizem **por que**:
- É UGC ou corporativo?
- Hook emocional (medo, desejo, urgência) ou racional (preço, especificação)?
- Ângulo "problema-solução" ou "aspiracional"?
- CTA explícito ("clique aqui") ou implícito?
- Está pessoas no frame ou só imóvel?

Sem essa análise, **insights de criativo são superficiais**: "esse anúncio tem CTR melhor". Com essa análise: "**vídeos UGC com hook de urgência + pessoas no frame** têm 2.3x melhor CTR que static corporativo".

#### 3.2.3. Arquitetura Proposta

```
                  Novo criativo enviado
                          │
                          ▼
              ┌─────────────────────────┐
              │  Creative Ingestion     │
              │  - Salva metadata       │
              │  - Detecta formato      │
              │  - Trigger analysis     │
              └─────────────┬───────────┘
                            │ (assíncrono, queue)
                            ▼
              ┌─────────────────────────┐
              │  Creative Analyzer      │
              │  ├── Vision LLM         │  ← Anthropic Claude com vision
              │  │   analisa imagem      │
              │  ├── Text LLM            │  ← analisa body/headline
              │  │   analisa copy       │
              │  └── Classifier         │  ← consolida classificação
              └─────────────┬───────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  CreativeAnalysis       │
              │  (persistência)         │
              └─────────────┬───────────┘
                            │
            ┌───────────────┴────────────────┐
            ▼                                ▼
    ┌─────────────────┐            ┌────────────────────┐
    │ Insights por    │            │ Recomendação de    │
    │ padrão vencedor │            │ novos criativos    │
    │ (no Briefing)   │            │ (concept generator)│
    └─────────────────┘            └────────────────────┘
```

#### 3.2.4. Impacto no Banco de Dados

**Nova tabela `CreativeAnalysis`:**
```sql
CREATE TABLE campanhasmarketingdigital."CreativeAnalysis" (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id                 UUID REFERENCES "Ad"(id) ON DELETE CASCADE,
  creative_source_path  TEXT,           -- path original do arquivo
  format                VARCHAR(20),    -- 'IMAGE', 'VIDEO', 'CAROUSEL'

  -- Classificação estrutural
  has_people            BOOLEAN,
  has_property          BOOLEAN,
  has_text_overlay      BOOLEAN,
  is_ugc_style          BOOLEAN,
  is_corporate_style    BOOLEAN,

  -- Classificação narrativa (LLM)
  hook_type             VARCHAR(30),    -- 'curiosity', 'urgency', 'fear', 'desire', 'social_proof'
  emotional_tone        VARCHAR(30),    -- 'aspirational', 'practical', 'emotional', 'rational'
  angle                 VARCHAR(50),    -- 'problem_solution', 'transformation', 'lifestyle', 'investment'
  cta_style             VARCHAR(20),    -- 'explicit', 'implicit', 'soft'

  -- Análise de copy
  body_word_count       INTEGER,
  headline_word_count   INTEGER,
  has_emoji             BOOLEAN,
  has_price             BOOLEAN,
  has_urgency_words     BOOLEAN,       -- "últimas", "hoje", "só hoje"

  -- Metadados
  analyzed_at           TIMESTAMP DEFAULT NOW(),
  llm_model_used        VARCHAR(50),
  llm_confidence        DECIMAL(3,2),
  raw_analysis          JSONB,         -- resposta completa do LLM

  tenant_id             UUID
);

CREATE INDEX idx_creative_analysis_ad ON "CreativeAnalysis"(ad_id);
CREATE INDEX idx_creative_analysis_hook ON "CreativeAnalysis"(hook_type, tenant_id);
CREATE INDEX idx_creative_analysis_format ON "CreativeAnalysis"(format, is_ugc_style);
```

#### 3.2.5. Nova View Analítica

```sql
CREATE OR REPLACE VIEW campanhasmarketingdigital.vw_creative_performance_patterns AS
SELECT
  ca.hook_type,
  ca.is_ugc_style,
  ca.format,
  COUNT(DISTINCT ad.id)                         AS ads_count,
  AVG(i.ctr)                                    AS avg_ctr,
  AVG(i.cpc)                                    AS avg_cpc,
  SUM(i.spend)                                  AS total_spend,
  (SELECT COUNT(*) FROM "Lead" l WHERE l.ad_id = ad.id) AS leads,
  CASE WHEN SUM(i.spend) > 0
       THEN (SELECT COUNT(*) FROM "Lead" l WHERE l.ad_id = ad.id) / NULLIF(SUM(i.spend), 0)
       ELSE 0 END AS leads_per_real
FROM "CreativeAnalysis" ca
JOIN "Ad" ad     ON ad.id = ca.ad_id
JOIN "AdSet" ads ON ads.id = ad.adSetId
JOIN "Insight" i ON i.campaignId = ads.campaignId
GROUP BY ca.hook_type, ca.is_ugc_style, ca.format
HAVING COUNT(DISTINCT ad.id) >= 2;
```

#### 3.2.6. Ganho para o Gestor

**Insight tradicional (hoje):**
> "Anúncio X tem CTR 2.8%, anúncio Y tem CTR 0.7%. Pausar Y."

**Insight enriquecido (com Creative Intelligence):**
> "Padrão vencedor identificado: **UGC vertical com hook de urgência + pessoa no frame** rende CTR médio 2.6%, contra 0.9% de static corporativo. Recomendação: produzir 5 novos criativos seguindo esse padrão. Estimativa: redução de CPL de R$28 para R$18 (–36%)."

#### 3.2.7. Custo Estimado de LLM

- **Vision call**: ~$0.005 por imagem (Claude Sonnet vision)
- **Text call**: ~$0.001 por análise de copy
- **Total por criativo**: ~$0.006
- **Análise é one-shot**: roda 1x quando criativo é cadastrado, cacheia para sempre

Para 100 criativos novos/mês: **$0.60/mês** por tenant. Custo trivial.

---

### 3.3. TRACKING HEALTH MONITOR (Prioridade Alta)

#### 3.3.1. O Problema

Skill 1 do documento (Tracking Checker) endereça algo **crítico que ignoramos**:
- Pixel Meta com Event Match Quality baixo → atribuição quebrada → otimização ruim
- Eventos duplicados → contagem inflada
- Purchase event no checkout page (não pós-pagamento)
- Conversion event não vinculado à campanha

No nosso caso (lead via WhatsApp), os equivalentes:
- O `trackingId` da rota `/api/r/[id]` está respondendo?
- O endpoint está registrando Lead corretamente?
- Há leads duplicados (mesmo IP em <30s)?
- O Meta Conversion API está enviando eventos?

#### 3.3.2. Arquitetura Proposta

**Novo serviço:** `src/lib/marketing/services/trackingHealth.ts`

```typescript
export interface TrackingHealthReport {
  tenantId: string;
  generatedAt: Date;
  overallScore: number;          // 0-100
  issues: TrackingIssue[];
  checks: {
    trackingEndpointAlive: boolean;
    leadsBeingRecorded: boolean;
    duplicateLeadsRate: number;    // %
    metaPixelConfigured: boolean;
    conversionsApiActive: boolean;
    averageLeadCaptureLatency: number;  // ms
    orphanLeads: number;           // leads sem campaignId
  };
}

export async function runTrackingHealthCheck(tenantId: string): Promise<TrackingHealthReport>;
```

**Endpoint:** `GET /api/admin/campanhas/tracking/health`

#### 3.3.3. Impacto no Banco de Dados

**Nova tabela `TrackingHealthCheck`:**
```sql
CREATE TABLE campanhasmarketingdigital."TrackingHealthCheck" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  overall_score INTEGER NOT NULL,
  checks        JSONB NOT NULL,
  issues        JSONB NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tracking_health_tenant ON "TrackingHealthCheck"(tenant_id, created_at DESC);
```

Executado por cron diário (3am). Resultado exibido como widget no dashboard ("⚠ 2 problemas de tracking detectados").

---

### 3.4. FUNNEL STAGE CLASSIFICATION (Prioridade Média)

#### 3.4.1. Conceito

Toda campanha pertence a uma das três camadas do funil:
- **TOF (Top of Funnel)**: público frio, objetivo `awareness/traffic`
- **MOF (Middle of Funnel)**: público engajado (visitou site, viu vídeo), objetivo `engagement/consideration`
- **BOF (Bottom of Funnel)**: público quente (retargeting), objetivo `conversion/leads`

Permite análises de **saúde do funil**: "TOF gera muito tráfego mas BOF converte pouco → problema na landing/oferta".

#### 3.4.2. Impacto no Banco de Dados

**Tabela `Campaign` — alteração mínima:**
```sql
ALTER TABLE campanhasmarketingdigital."Campaign"
  ADD COLUMN funnel_stage VARCHAR(10) DEFAULT 'TOF';
  -- valores: 'TOF', 'MOF', 'BOF'

CREATE INDEX idx_campaign_funnel ON "Campaign"(funnel_stage, tenant_id);
```

#### 3.4.3. Auto-classificação

**Regras de inferência inicial (rule-based):**
```typescript
function inferFunnelStage(campaign: Campaign): FunnelStage {
  if (['OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC'].includes(campaign.objective)) return 'TOF';
  if (['OUTCOME_ENGAGEMENT'].includes(campaign.objective)) return 'MOF';
  if (['OUTCOME_LEADS', 'OUTCOME_SALES'].includes(campaign.objective)) return 'BOF';
  // Inspeciona targeting: se inclui custom_audience de visitantes → MOF/BOF
  return 'TOF';
}
```

Permitir override manual via UI.

#### 3.4.4. Novo Endpoint

`GET /api/admin/campanhas/dashboard/funnel`
```json
{
  "TOF": { "spend": 800, "impressions": 50000, "clicks": 600, "leads": 8 },
  "MOF": { "spend": 300, "impressions": 12000, "clicks": 240, "leads": 12 },
  "BOF": { "spend": 200, "impressions": 4000, "clicks": 180, "leads": 24 },
  "health": {
    "tofToMof": 0.04,   // clicks_mof / clicks_tof
    "mofToBof": 0.13,
    "diagnosis": "TOF saudável, gargalo em MOF→BOF (audiência de retargeting pequena demais)"
  }
}
```

---

### 3.5. HOOK RATE + VIDEO METRICS (Prioridade Média)

#### 3.5.1. O Que Estamos Perdendo

Para anúncios em vídeo (cada vez mais frequentes em Meta), CTR isolado é **enganoso**. As métricas reais de qualidade do criativo em vídeo são:

| Métrica | Definição | Benchmark |
|---|---|---|
| **Hook Rate** | `video_views_3s / impressions` | > 25% = forte |
| **Hold Rate** | `video_views_15s / video_views_3s` | > 40% = forte |
| **Completion Rate** | `video_views_100% / impressions` | > 10% = forte |
| **Cost per ThruPlay** | `spend / thruplay_views` | < R$0.30 = forte |

Hoje nosso schema só tem `videoViews` (campo único, sem granularidade).

#### 3.5.2. Impacto no Banco de Dados

**Tabela `Insight` — alteração:**
```sql
ALTER TABLE campanhasmarketingdigital."Insight"
  ADD COLUMN video_views_3s         INTEGER DEFAULT 0,
  ADD COLUMN video_views_15s        INTEGER DEFAULT 0,
  ADD COLUMN video_views_25_pct     INTEGER DEFAULT 0,
  ADD COLUMN video_views_50_pct     INTEGER DEFAULT 0,
  ADD COLUMN video_views_75_pct     INTEGER DEFAULT 0,
  ADD COLUMN video_views_100_pct    INTEGER DEFAULT 0,
  ADD COLUMN thruplay_views          INTEGER DEFAULT 0;

-- Hook rate e completion rate são CALCULADOS, não armazenados
```

#### 3.5.3. Impacto em Código

Atualizar `metaAds.ts > getCampaignInsights()` para incluir nos fields:
```typescript
fields: 'impressions,reach,clicks,spend,cpc,cpm,ctr,actions,frequency,' +
        'video_play_actions,video_p25_watched_actions,video_p50_watched_actions,' +
        'video_p75_watched_actions,video_p100_watched_actions,' +
        'video_thruplay_watched_actions,video_3_sec_watched_actions'
```

Atualizar `agentMonitor.ts > syncMetrics()` para parsear os novos campos.

Adicionar nova regra em `aiInsights.ts`:
```typescript
{
  check: (d) => d.format === 'video' && d.hookRate < 0.10 && d.daysRunning >= 3,
  type: 'PAUSE',
  title: 'Hook fraco no vídeo',
  description: (d) => `Apenas ${(d.hookRate*100).toFixed(0)}% das pessoas viram 3+ segundos do vídeo "${d.campaignName}". Hook não está prendendo atenção — trocar primeiros 3 segundos.`,
  confidence: () => 0.85,
}
```

---

### 3.6. WASTED SPEND QUANTIFICATION (Prioridade Média)

#### 3.6.1. Conceito

Para o gestor, dizer "campanha está ruim" é **suave**. Dizer "**você perdeu R$1.247 em 30 dias com essa campanha**" é **comercialmente devastador**. É o argumento que justifica o produto.

#### 3.6.2. Categorias de Wasted Spend

```
┌──────────────────────────────────────────────────────────────┐
│  Categoria                  Definição                         │
├──────────────────────────────────────────────────────────────┤
│  ZERO_LEADS_SPEND           Spend em campanha com 0 leads     │
│                             em > 7 dias                        │
│  HIGH_CPL_SPEND             Spend acima do CPL meta            │
│                             (excesso = (cpl_real - cpl_meta)   │
│                              * leads)                          │
│  FATIGUED_CONTINUE          Spend após detecção de fadiga      │
│                             não atuada                          │
│  LOW_HOOK_VIDEO             Spend em vídeo com hook rate <10%  │
│  LEARNING_LIMITED_SPEND     Spend em ad set que nunca sai       │
│                             de learning                         │
│  TRACKING_BROKEN             Spend enquanto tracking estava off │
└──────────────────────────────────────────────────────────────┘
```

#### 3.6.3. Sem Schema Novo — Cálculo Derivado

```typescript
// src/lib/marketing/services/wastedSpend.ts
export async function calculateWastedSpend(
  tenantId: string,
  periodDays: number = 30
): Promise<WastedSpendReport> {
  // Para cada categoria, calcula somatório
  // Retorna detalhamento + total + recuperação potencial
}
```

#### 3.6.4. Exibição no Dashboard

Card destacado no topo:
```
┌──────────────────────────────────────────────────────────┐
│  💸 Wasted Spend (últimos 30 dias)                       │
│                                                          │
│  R$ 1.247,00                                             │
│  ├── R$ 540 em campanhas sem leads (Aurora, Solar)       │
│  ├── R$ 480 em CPL acima da meta (Boa Vista BOF)         │
│  └── R$ 227 em fadiga não atuada (Edifício Marina)       │
│                                                          │
│  [ Plano de Recuperação ]  [ Ver detalhamento ]          │
└──────────────────────────────────────────────────────────┘
```

---

### 3.7. AUDIT REPORT ESTRUTURADO (Prioridade Média)

#### 3.7.1. Diferença vs. Briefing

| Aspecto | Briefing (atual) | Audit Report (novo) |
|---|---|---|
| Frequência | Diário (8h, 18h) ou manual | Semanal/Mensal |
| Foco | Estratégico, narrativo | Operacional, estruturado |
| Formato | Texto + JSON livre | Scorecard rígido (1-10 por área) |
| Audiência | Gestor diário | Dono do negócio, cliente |
| Saída | WhatsApp + UI | UI + PDF + email |

#### 3.7.2. Estrutura do Audit Report

```typescript
interface AuditReport {
  period: { start: Date; end: Date };

  healthScorecard: {
    tracking:          { score: number; reason: string };
    structure:         { score: number; reason: string };
    targeting:         { score: number; reason: string };
    creative:          { score: number; reason: string };
    budgetAllocation:  { score: number; reason: string };
    biddingStrategy:   { score: number; reason: string };
    overall:           number;
  };

  top3Problems:     Issue[];
  top3Opportunities: Opportunity[];

  wastedSpend: {
    total: number;
    byCategory: Record<string, number>;
    recoveryPlan: string;
  };

  weeklyActionPlan: {
    week1_fix:        ActionItem[];
    week2_optimize:   ActionItem[];
    week3_test:       ActionItem[];
    week4_scale:      ActionItem[];
  };
}
```

#### 3.7.3. Impacto no Banco

**Nova tabela `AuditReport`:**
```sql
CREATE TABLE campanhasmarketingdigital."AuditReport" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  client_id       UUID,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  overall_score   INTEGER,
  scorecard       JSONB NOT NULL,
  problems        JSONB NOT NULL,
  opportunities   JSONB NOT NULL,
  wasted_spend    JSONB NOT NULL,
  action_plan     JSONB NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW(),

  UNIQUE (tenant_id, period_start, period_end)
);

CREATE INDEX idx_audit_report_tenant ON "AuditReport"(tenant_id, period_end DESC);
```

#### 3.7.4. LLM Prompt Especializado

Diferente dos briefings, este prompt **força estrutura**:
```
Você é um consultor sênior de mídia paga gerando AUDIT REPORT mensal.
DADOS: [...]
INSTRUÇÕES: Responda com JSON RIGOROSO no schema:
{
  "healthScorecard": { ... },     // valores INTEGER 1-10 obrigatórios
  "top3Problems": [...],          // exatamente 3 itens
  "top3Opportunities": [...],     // exatamente 3 itens
  ...
}
```

---

## 4. Resumo Consolidado de Impacto no Banco de Dados

### 4.1. Alterações em Tabelas Existentes

```sql
-- Campaign
ALTER TABLE "Campaign"
  ADD COLUMN lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN lifecycle_changed_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN learning_started_at TIMESTAMP,
  ADD COLUMN stable_since TIMESTAMP,
  ADD COLUMN funnel_stage VARCHAR(10) DEFAULT 'TOF';

CREATE INDEX idx_campaign_lifecycle ON "Campaign"(lifecycle_status, tenant_id);
CREATE INDEX idx_campaign_funnel    ON "Campaign"(funnel_stage, tenant_id);

-- Insight (métricas de vídeo)
ALTER TABLE "Insight"
  ADD COLUMN video_views_3s      INTEGER DEFAULT 0,
  ADD COLUMN video_views_15s     INTEGER DEFAULT 0,
  ADD COLUMN video_views_25_pct  INTEGER DEFAULT 0,
  ADD COLUMN video_views_50_pct  INTEGER DEFAULT 0,
  ADD COLUMN video_views_75_pct  INTEGER DEFAULT 0,
  ADD COLUMN video_views_100_pct INTEGER DEFAULT 0,
  ADD COLUMN thruplay_views     INTEGER DEFAULT 0;
```

### 4.2. Novas Tabelas

```
┌─────────────────────────────┬──────────────────────────────────────┐
│ Tabela                      │ Função                                │
├─────────────────────────────┼──────────────────────────────────────┤
│ CampaignLifecycleEvent      │ Histórico de transições de estado     │
│ CreativeAnalysis            │ Classificação estrutural/narrativa    │
│                             │ do criativo (output do Vision LLM)    │
│ TrackingHealthCheck         │ Snapshots periódicos de saúde         │
│                             │ do tracking                            │
│ AuditReport                 │ Relatórios estruturados mensais       │
│ BenchmarkProfile            │ Perfis de benchmark configuráveis     │
│                             │ (imobiliário, ecommerce, etc.)        │
└─────────────────────────────┴──────────────────────────────────────┘
```

### 4.3. Novas Views

```
vw_creative_performance_patterns    → agrupa criativos por padrão e mostra performance
vw_funnel_health                    → métricas agregadas por TOF/MOF/BOF
vw_lifecycle_distribution           → quantas campanhas em cada estado
vw_wasted_spend_by_category         → wasted spend agrupado por categoria
```

### 4.4. Migrations Necessárias

Conforme regra do projeto (CLAUDE.md):
> **CRÍTICO — Nunca executar `prisma db push`**

Todas as DDL devem ser arquivos SQL idempotentes em `prisma/`:
```
prisma/migration-2026-XX-lifecycle-state-machine.sql
prisma/migration-2026-XX-creative-analysis.sql
prisma/migration-2026-XX-tracking-health.sql
prisma/migration-2026-XX-funnel-stage.sql
prisma/migration-2026-XX-video-metrics.sql
prisma/migration-2026-XX-audit-report.sql
prisma/migration-2026-XX-benchmark-profile.sql
```

E atualizar `prisma/schema.marketing.prisma` para refletir os novos modelos.

---

## 5. Riscos e Complexidades

### 5.1. Matriz de Risco por Funcionalidade

```
┌──────────────────────────┬──────────┬──────────┬─────────────────────────────────┐
│ Funcionalidade           │ Esforço  │ Risco    │ Principal Risco                 │
├──────────────────────────┼──────────┼──────────┼─────────────────────────────────┤
│ State Machine            │   M      │ Médio    │ Migrar dados legados sem ACTIVE │
│                          │          │          │ → mapear para LEARNING/STABLE   │
├──────────────────────────┼──────────┼──────────┼─────────────────────────────────┤
│ Creative Intelligence    │   L      │ Médio    │ Custo LLM + tempo de análise    │
│                          │          │          │ Mitigação: análise assíncrona   │
├──────────────────────────┼──────────┼──────────┼─────────────────────────────────┤
│ Tracking Health          │   M      │ Baixo    │ False positives em early stage  │
├──────────────────────────┼──────────┼──────────┼─────────────────────────────────┤
│ Funnel Stage             │   S      │ Baixo    │ Classificação inicial pode errar│
│                          │          │          │ → permitir override manual      │
├──────────────────────────┼──────────┼──────────┼─────────────────────────────────┤
│ Video Metrics            │   S      │ Baixo    │ Apenas para vídeos. Não afeta   │
│                          │          │          │ campanhas de imagem.            │
├──────────────────────────┼──────────┼──────────┼─────────────────────────────────┤
│ Wasted Spend             │   S      │ Baixo    │ Categorias podem se sobrepor    │
│                          │          │          │ → priorizar por severidade      │
├──────────────────────────┼──────────┼──────────┼─────────────────────────────────┤
│ Audit Report             │   M      │ Médio    │ LLM pode não respeitar schema   │
│                          │          │          │ → validação Zod + retry         │
└──────────────────────────┴──────────┴──────────┴─────────────────────────────────┘
Legenda: S=2–5 dias | M=1–2 semanas | L=2–4 semanas
```

### 5.2. Dependências entre Funcionalidades

```
        State Machine
              │
       ┌──────┴──────┐
       │             │
   Wasted        Audit Report
   Spend            │
       │      ┌─────┴──────┐
       │      │            │
       ▼      ▼            ▼
   Creative   Funnel    Tracking
   Intelligence Stage    Health
       ▲
       │
   Video Metrics
```

State Machine é **dependência crítica** para Wasted Spend, Audit Report e enriquecimento do Agente. Implementar primeiro.

### 5.3. Riscos Transversais

#### 5.3.1. Custo de LLM
Adicionar Creative Intelligence + Audit Report aumenta uso de LLM. Estimativa por tenant ativo/mês:
- Briefings (já temos): ~$1.50
- Agent enrichment (já temos): ~$0.30
- Creative analysis (novo): ~$0.60
- Audit Report (novo, mensal): ~$0.50
- **Total: ~$3/mês por tenant** — totalmente sustentável.

#### 5.3.2. Performance do Banco
Adicionar 4 novas tabelas + 7 índices não impacta. Maior risco é a view `vw_creative_performance_patterns` se rodar a cada page load — mitigar com materialized view e refresh diário.

#### 5.3.3. UX Overload
Risco real: adicionar muitos widgets no dashboard sobrecarrega. **Mitigação**: criar página dedicada `/admin/campanhas/auditoria` para o Audit Report e progresso de Tracking Health; dashboard mantém foco operacional.

#### 5.3.4. Multi-tenancy nas Novas Features
Todas as novas tabelas DEVEM ter `tenant_id` e indexar por ele. Risk: esquecer e vazar dados entre tenants. **Mitigação**: code review focado + testes de isolamento.

---

## 6. Ganhos para o Gestor de Tráfego Pago

### 6.1. Comparativo de Capacidade

```
┌─────────────────────────────┬───────────────┬─────────────────────────────────────┐
│ Pergunta do Gestor          │ Hoje          │ Depois das Incorporações            │
├─────────────────────────────┼───────────────┼─────────────────────────────────────┤
│ Em que fase está minha       │ "Ativa" ou    │ "FATIGUED há 2 dias, estava STABLE  │
│ campanha?                    │ "Pausada"     │ por 18 dias com CPL R$22"           │
├─────────────────────────────┼───────────────┼─────────────────────────────────────┤
│ Por que esse anúncio         │ Métricas      │ "UGC vertical + hook urgência +     │
│ funciona melhor que o outro? │ comparadas    │ pessoa no frame: padrão vencedor.   │
│                              │               │ Replicar em 5 novos criativos."     │
├─────────────────────────────┼───────────────┼─────────────────────────────────────┤
│ Quanto dinheiro estou        │ Não sabe      │ "R$1.247 nos últimos 30 dias.       │
│ desperdiçando?               │               │ Recuperáveis com 3 ações."          │
├─────────────────────────────┼───────────────┼─────────────────────────────────────┤
│ Meu tracking está OK?         │ Não sabe      │ "Score 87/100. 1 alerta: 12% de     │
│                              │               │ leads sem campaignId atribuído."    │
├─────────────────────────────┼───────────────┼─────────────────────────────────────┤
│ Onde está o gargalo do funil?│ Não distingue │ "TOF saudável, MOF com queda de 40% │
│                              │ funil          │ → audiência de retargeting pequena" │
├─────────────────────────────┼───────────────┼─────────────────────────────────────┤
│ O vídeo da campanha X tem    │ Não distingue │ "Hook rate 8% (fraco). Apenas 8%    │
│ bom hook?                    │ video metrics │ assistem 3+ segundos. Trocar 3      │
│                              │               │ primeiros segundos."                │
├─────────────────────────────┼───────────────┼─────────────────────────────────────┤
│ O que devo fazer essa        │ Briefing      │ "Audit Report semanal estruturado:  │
│ semana?                      │ narrativo     │ Sem 1=fix, Sem 2=optimize,           │
│                              │               │ Sem 3=test, Sem 4=scale"            │
└─────────────────────────────┴───────────────┴─────────────────────────────────────┘
```

### 6.2. Caso de Uso Concreto — Antes e Depois

#### Cenário: Campanha "Lançamento Edifício Aurora" rodando há 12 dias.

**Hoje (sistema atual):**
> Card no Dashboard:
> 🔴 **PAUSE** — CTR muito baixo (0.6% nos últimos 5 dias). 87% de confiança.
> Agente vai pausar automaticamente.

**Depois (com incorporações):**
> Card no Dashboard:
> 🔴 **FATIGUED → PAUSAR** — Campanha "Aurora" (BOF, vídeo)
>
> **Estado:** FATIGUED desde 2026-05-23. Antes: STABLE por 9 dias.
> **Métricas:** CTR 0.6% (caiu 62% em 5d), Hook Rate 9%, Freq 4.1x, CPL R$78 (meta R$25)
> **Causa-raiz LLM:** "Vídeo corporativo sem pessoas, hook racional ('Apartamento 3 quartos em Boa Viagem'), narrativa lenta. Em BOF (audiência já quente), formato corporativo subperforma vs UGC."
> **Wasted Spend:** R$340 nos últimos 7 dias.
> **Recomendação:** Pausar imediatamente. Produzir 3 novos vídeos UGC verticais (15s) com hook emocional + pessoas. Padrão vencedor da conta: "Família visitando imóvel + texto sobre futuro".
> **Estimativa de recuperação:** CPL projetado R$20–25 com novo formato. Recuperação de R$300/semana.
>
> [ ✅ Aprovar pausa ] [ 🎬 Briefing criativo ] [ 📊 Ver histórico ]

### 6.3. Métricas de Sucesso

Após implementação, mensurar:

| KPI | Baseline | Meta 6 meses |
|---|---|---|
| Tempo médio de detecção de fadiga | ~7 dias | < 24h |
| Wasted spend mensal (média por tenant) | desconhecido | -40% após 3 meses |
| Taxa de aprovação de sugestões do agente | n/d | > 70% |
| Tempo gasto pelo gestor analisando dashboard | n/d | -50% |
| CPL médio (lead WhatsApp) por tenant | varia | -25% |

---

## 7. Roadmap Recomendado

### 7.1. Sequenciamento por Valor + Dependência

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FASE 1 (4 semanas) — Fundações Estruturais                             │
│  ├── Campaign State Machine                                              │
│  ├── Funnel Stage Classification (simples, sem LLM)                     │
│  └── Wasted Spend Quantification (cálculo derivado)                     │
│                                                                          │
│  Saída: Dashboard com novos widgets, agente usa lifecycle nas decisões  │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  FASE 2 (3 semanas) — Inteligência Operacional                          │
│  ├── Video Metrics (sync + nova regra hook)                              │
│  ├── Tracking Health Monitor                                             │
│  └── Benchmark Profile (perfil imobiliário)                              │
│                                                                          │
│  Saída: Detecção de problemas operacionais antes de virarem prejuízo    │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  FASE 3 (5 semanas) — Diferencial Competitivo                           │
│  ├── Creative Intelligence Layer (Vision LLM + classifier)               │
│  ├── View vw_creative_performance_patterns                               │
│  └── Recomendação de novos criativos baseada em padrões vencedores      │
│                                                                          │
│  Saída: Único produto no mercado imobiliário com essa capacidade        │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  FASE 4 (3 semanas) — Visão Executiva                                   │
│  ├── Audit Report estruturado (mensal)                                  │
│  ├── Health Scorecard no dashboard                                       │
│  └── Página /admin/campanhas/auditoria                                   │
│                                                                          │
│  Saída: Cliente final/dono do negócio enxerga valor mensurável           │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  FASE 5+ (futuro) — Expansões                                            │
│  ├── PDF Export do Audit Report                                          │
│  ├── Google Ads integration (Search → Shopping → PMax)                   │
│  └── Webhooks/integrações externas                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2. Princípio de Não-Quebra

**Toda incorporação deve ser aditiva:**
- Novas colunas com default value (não NULL sem default)
- Novas tabelas sem foreign key obrigatória para tabelas existentes
- Novos serviços em arquivos novos, sem refatorar serviços atuais drasticamente
- Novo campo `lifecycle_status` coexiste com `status` antigo até migração completa

### 7.3. Pontos de Decisão Antes de Cada Fase

Antes de iniciar cada fase, validar com gestor real de tráfego pago:
1. **Fase 1**: confirmar que os 8 estados do lifecycle fazem sentido para o workflow real
2. **Fase 2**: validar lista de Tracking Health checks contra problemas reais já vividos
3. **Fase 3**: revisar taxonomia de hooks/ângulos com criadores de criativos
4. **Fase 4**: definir periodicidade do Audit Report (semanal? mensal? ambos?)

---

## 8. Conclusão e Decisão Recomendada

### 8.1. Síntese

O documento "10 AI AD AUDIT PROMPTS" é **excelente como inspiração estratégica**, mas **não como blueprint arquitetural**:

✅ **O que tem de melhor:**
- Campaign State Machine
- Creative Intelligence Layer
- Tracking Health Monitor
- Funnel awareness
- Linguagem operacional (SCALE/PAUSE/FIX/TEST)
- Princípio de "LLM como estrategista, não calculadora"
- Princípio de "Action Queue, nunca execução direta da IA"

❌ **O que NÃO devemos copiar:**
- Posicionamento como "Auditor" (somos OS)
- CSV upload (regressão arquitetural)
- Google Ads (escopo futuro, não atual)
- Benchmarks ecommerce (irrelevantes para nosso domínio)
- Single LLM provider (já temos 8)

### 8.2. Decisão Recomendada

**ADOTAR as 7 funcionalidades marcadas como ✅ no quadro-resumo, seguindo o roadmap de 4 fases.**

Esforço total estimado: **15 semanas** de desenvolvimento.
Custo adicional de LLM: **~$1.50/mês por tenant ativo**.
Impacto no schema: **6 colunas novas + 5 tabelas novas + 4 views**.
Risco arquitetural: **Baixo** (todas as mudanças são aditivas).

### 8.3. ROI Esperado para o Gestor

> Após implementação completa, o gestor de tráfego pago consegue:
> - Identificar fadiga **24h antes** vs. 7 dias hoje (proteção de R$1.000+/semana)
> - Replicar padrões vencedores **com base em dados**, não intuição (–25% CPL)
> - Justificar valor da plataforma com **número absoluto de wasted spend recuperado**
> - Entregar **Audit Report mensal estruturado** ao cliente final (retenção)
> - Operar com **lifecycle inteligente** em vez de status binário (decisões mais finas)

A diferença competitiva passa de **"temos IA"** (commodity) para **"entendemos causalidade e classificamos criativos"** (defensável).

---

*Documento gerado em 25/05/2026. Reflete o estado atual da codebase em `C:\NetImobiliária\net-imobiliaria`.*
*Análise feita sob óticas de gestor sênior de tráfego pago + arquiteto sênior de soluções.*
