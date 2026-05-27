# Fundação Arquitetural — Multi-Segment + Prompt Management

> **Leitura obrigatória ANTES do documento `ANALISE_ADOCAO_AI_ADS_AUDITOR.md`.**
>
> Este documento corrige duas premissas estruturais que invalidam parte do design anterior:
> 1. A plataforma é **multi-segmento** (imobiliário, educação, saúde, serviços, comércio, etc.)
> 2. **Nenhum prompt** deve ser hardcoded — toda inteligência LLM deve ser configurável

---

## 1. Princípios Fundamentais (não-negociáveis)

### 1.1. Segmento ≠ Tenant

```
TENANT      = empresa cliente da plataforma (multi-tenancy técnico)
              Ex: "Agência Imobiliária ABC", "Grupo Saúde XYZ"

CLIENTE     = cliente do tenant (no schema public.clientes)
              Ex: a agência ABC gerencia campanhas de 5 imobiliárias

SEGMENTO    = vertical de negócio que define vocabulário,
              benchmarks, KPIs específicos
              Ex: imobiliário, educação, saúde, serviços, comércio
```

**Implicações:**
- Um tenant pode atender clientes de **múltiplos segmentos**
  (ex: agência cuida de imobiliária + clínica + curso)
- Cada **cliente** tem seu próprio segmento
- Campanhas "próprias" do tenant (sem cliente) usam o **segmento padrão do tenant**

### 1.2. Nenhuma Lógica de Negócio Hardcoded

Tudo abaixo deve ser **dado configurável**, não código:
- ✗ Prompts LLM (system, user, role)
- ✗ Benchmarks numéricos (CTR bom, CPL ideal, frequência fadiga)
- ✗ Vocabulário ("imóvel" vs "curso" vs "consulta")
- ✗ Persona do especialista ("senior em imobiliário" vs "senior em saúde")
- ✗ Definições de funil ("lead → visita imóvel" vs "lead → matrícula")
- ✗ Taxonomia de criativos (ângulos, hooks específicos por segmento)
- ✗ Regras de detecção (thresholds das 6 regras do `aiInsights.ts`)

**Código carrega lógica genérica. Banco carrega especialização.**

---

## 2. Modelo de Dados — Camada de Fundação

### 2.1. Tabela `BusinessSegment`

```sql
CREATE TABLE campanhasmarketingdigital."BusinessSegment" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(40) UNIQUE NOT NULL,    -- 'real_estate', 'education', etc
  name          VARCHAR(100) NOT NULL,           -- 'Imobiliário', 'Educação'
  description   TEXT,

  -- Vocabulário usado nos prompts (renderizado dinamicamente)
  vocabulary    JSONB NOT NULL DEFAULT '{}',

  -- Definição do funil de conversão deste segmento
  funnel_stages JSONB NOT NULL DEFAULT '[]',

  -- Taxonomias específicas para Creative Intelligence
  creative_taxonomy JSONB DEFAULT '{}',

  -- KPIs primários (em ordem de prioridade)
  primary_kpis  JSONB NOT NULL DEFAULT '[]',

  is_active     BOOLEAN DEFAULT true,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_segment_active ON "BusinessSegment"(is_active, sort_order);
```

#### Exemplo de seed — imobiliário:
```json
{
  "code": "real_estate",
  "name": "Imobiliário",
  "vocabulary": {
    "product_singular": "imóvel",
    "product_plural": "imóveis",
    "lead_intent": "interessado em imóvel",
    "conversion_event": "agendamento de visita",
    "expert_persona": "especialista sênior em tráfego pago para o mercado imobiliário brasileiro",
    "buyer_journey": ["awareness", "consideration", "visit_scheduled", "proposal", "deal"],
    "common_objections": ["preço", "localização", "financiamento", "documentação"]
  },
  "funnel_stages": [
    { "code": "TOF", "name": "Descoberta", "metrics": ["impressions", "reach", "ctr"] },
    { "code": "MOF", "name": "Consideração", "metrics": ["clicks", "engagement"] },
    { "code": "BOF", "name": "Lead WhatsApp", "metrics": ["leads", "cpl"] },
    { "code": "VISIT", "name": "Visita Agendada", "metrics": ["visit_count", "cost_per_visit"] },
    { "code": "DEAL", "name": "Proposta", "metrics": ["proposals", "deals_closed"] }
  ],
  "creative_taxonomy": {
    "angles": ["aspiracional", "investimento", "primeiro_imovel", "luxo", "familia", "localizacao"],
    "hooks": ["seguranca", "urgencia_estoque", "preco_diferenciado", "transformacao_vida", "futuro_familia"],
    "formats_priority": ["video_ugc", "carrossel_imoveis", "video_aereo", "static_planta"]
  },
  "primary_kpis": ["cpl", "lead_to_visit", "visit_to_proposal", "frequency"]
}
```

#### Exemplo de seed — saúde:
```json
{
  "code": "health",
  "name": "Saúde",
  "vocabulary": {
    "product_singular": "consulta",
    "product_plural": "consultas/procedimentos",
    "lead_intent": "interessado em consulta ou procedimento",
    "conversion_event": "agendamento de consulta",
    "expert_persona": "especialista sênior em tráfego pago para o setor de saúde no Brasil",
    "buyer_journey": ["awareness", "symptom_research", "doctor_choice", "appointment", "consultation"],
    "common_objections": ["preço", "convênio", "tempo_de_espera", "especialização"]
  },
  "funnel_stages": [
    { "code": "TOF", "name": "Descoberta", "metrics": ["impressions", "reach", "ctr"] },
    { "code": "MOF", "name": "Pesquisa Sintoma", "metrics": ["engagement", "saves"] },
    { "code": "BOF", "name": "Lead WhatsApp", "metrics": ["leads", "cpl"] },
    { "code": "SCHEDULED", "name": "Consulta Agendada", "metrics": ["appointments_count"] }
  ],
  "creative_taxonomy": {
    "angles": ["bem_estar", "prevencao", "transformacao", "expertise_medica", "testemunho"],
    "hooks": ["sintoma_comum", "antes_e_depois", "estatistica_alarmante", "duvida_frequente"],
    "formats_priority": ["video_explicativo_medico", "carrossel_servicos", "depoimento_paciente"]
  },
  "primary_kpis": ["cpl", "lead_to_appointment", "appointment_to_show"]
}
```

#### Exemplo de seed — educação:
```json
{
  "code": "education",
  "name": "Educação",
  "vocabulary": {
    "product_singular": "curso",
    "product_plural": "cursos",
    "lead_intent": "interessado em curso ou formação",
    "conversion_event": "matrícula realizada",
    "expert_persona": "especialista sênior em tráfego pago para o setor de educação no Brasil",
    "buyer_journey": ["interest", "comparison", "trial", "enrollment", "completion"]
  },
  "funnel_stages": [
    { "code": "TOF", "name": "Descoberta", "metrics": ["impressions", "ctr"] },
    { "code": "MOF", "name": "Comparação", "metrics": ["engagement", "video_watch"] },
    { "code": "BOF", "name": "Lead", "metrics": ["leads", "cpl"] },
    { "code": "TRIAL", "name": "Aula Experimental", "metrics": ["trial_count"] },
    { "code": "ENROLLED", "name": "Matrícula", "metrics": ["enrollments", "cost_per_enrollment"] }
  ],
  "creative_taxonomy": {
    "angles": ["empregabilidade", "transformacao_carreira", "metodo_diferenciado", "depoimento_aluno", "preco_acessivel"],
    "hooks": ["resultado_em_tempo", "antes_e_depois_carreira", "duvida_mercado", "exclusividade"],
    "formats_priority": ["video_depoimento", "carrossel_modulos", "aula_demonstrativa"]
  },
  "primary_kpis": ["cost_per_enrollment", "cpl", "lead_to_trial", "trial_to_enrollment"]
}
```

### 2.2. Associação Segmento ↔ Tenant/Cliente

```sql
-- Cliente tem segmento próprio
ALTER TABLE public.clientes
  ADD COLUMN segment_id UUID
  REFERENCES campanhasmarketingdigital."BusinessSegment"(id);

CREATE INDEX idx_clientes_segment ON public.clientes(segment_id);

-- Tenant tem segmento padrão (para campanhas "próprias" sem clientId)
ALTER TABLE public.tenants
  ADD COLUMN default_segment_id UUID;

-- Settings opcionalmente sobrescreve segmento por tenant
-- (caso o tenant queira forçar um segmento mesmo em campanhas com cliente)
ALTER TABLE campanhasmarketingdigital."Settings"
  ADD COLUMN override_segment_id UUID;
```

### 2.3. Resolução de Segmento em Runtime

```typescript
// src/lib/marketing/services/segmentResolver.ts
export async function resolveSegment(
  tenantId: string,
  clientId?: string | null
): Promise<BusinessSegment> {
  // 1. Override por tenant tem prioridade absoluta
  const override = await getOverrideSegment(tenantId);
  if (override) return override;

  // 2. Se há cliente, usar segmento do cliente
  if (clientId) {
    const clientSegment = await getClientSegment(clientId);
    if (clientSegment) return clientSegment;
  }

  // 3. Fallback: segmento padrão do tenant
  const tenantDefault = await getTenantDefaultSegment(tenantId);
  if (tenantDefault) return tenantDefault;

  // 4. Último recurso: segmento "generic" do sistema
  return getSystemDefaultSegment();
}
```

---

## 3. Arquitetura de Gestão de Prompts

### 3.1. O Problema Atual

Hoje os prompts estão **hardcoded em código**:

```typescript
// strategicBriefing.ts (linha 185)
function buildPrompt(type, context): string {
  return `Voce e um especialista senior em trafego pago para o mercado imobiliario brasileiro...
  ${JSON.stringify(context.campaigns, null, 2)}
  ...`;
}

// agentDecisor.ts (linha 86)
const prompt = `Especialista em tráfego pago imobiliário. Enriqueça esta recomendação...`;

// settings/llm/test/route.ts (linha 16)
const response = await llm.complete('Responda apenas "OK"...', 20);
```

**Problemas:**
- ❌ Não escalável para múltiplos segmentos (precisaria de `if (segment === 'real_estate')`)
- ❌ Não permite customização por tenant/cliente
- ❌ Toda mudança em prompt exige deploy
- ❌ Sem versionamento (não dá para A/B testar versões)
- ❌ Sem auditoria (quem mudou, quando, por quê)
- ❌ Acoplamento entre lógica e conteúdo

### 3.2. Solução: Tabela `PromptTemplate`

```sql
CREATE TABLE campanhasmarketingdigital."PromptTemplate" (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  code              VARCHAR(60) NOT NULL,
  version           INTEGER NOT NULL DEFAULT 1,
  is_active         BOOLEAN DEFAULT true,

  -- Escopo (resolução hierárquica)
  segment_id        UUID REFERENCES "BusinessSegment"(id),
  tenant_id         UUID,
  -- NULL/NULL = template GLOBAL (fallback universal)
  -- segment_id apenas = padrão do segmento
  -- segment_id + tenant_id = override por tenant para esse segmento
  -- tenant_id apenas = override total do tenant (qualquer segmento)

  -- Conteúdo do prompt
  system_prompt     TEXT,                              -- role/persona/contexto
  user_prompt       TEXT NOT NULL,                     -- com placeholders {{var}}

  -- Configurações do LLM
  max_tokens        INTEGER DEFAULT 2000,
  temperature       DECIMAL(3,2) DEFAULT 0.7,
  response_format   VARCHAR(20) DEFAULT 'json',        -- 'json' | 'text' | 'markdown'
  response_schema   JSONB,                             -- validação JSON Schema

  -- Documentação e metadados
  name              VARCHAR(150),
  description       TEXT,
  placeholders      JSONB NOT NULL DEFAULT '[]',      -- lista de variáveis esperadas
  example_input     JSONB,                             -- exemplo de input completo
  example_output    TEXT,                              -- exemplo de output esperado

  -- Auditoria
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW(),
  created_by        UUID,
  notes             TEXT,

  UNIQUE (code, segment_id, tenant_id, version)
);

CREATE INDEX idx_prompt_lookup ON "PromptTemplate"(code, is_active, segment_id, tenant_id);
CREATE INDEX idx_prompt_tenant ON "PromptTemplate"(tenant_id) WHERE tenant_id IS NOT NULL;
```

### 3.3. Catálogo de Códigos (`code`) Padronizados

| Code | Uso | Onde é Chamado |
|---|---|---|
| `briefing_morning` | Briefing matinal (7 dias) | `strategicBriefing.ts` |
| `briefing_closing` | Briefing fechamento (1 dia) | `strategicBriefing.ts` |
| `briefing_manual` | Briefing sob demanda | `strategicBriefing.ts` |
| `agent_enrichment` | Enriquecer insight do agente | `agentDecisor.ts` |
| `creative_analysis_vision` | Análise de imagem do criativo | `creativeAnalyzer.ts` (novo) |
| `creative_analysis_copy` | Análise do texto do anúncio | `creativeAnalyzer.ts` (novo) |
| `creative_concept_generator` | Gerar novos conceitos baseado em vencedores | `creativeRecommender.ts` (novo) |
| `audit_report_monthly` | Relatório mensal estruturado | `auditReportService.ts` (novo) |
| `audit_report_weekly` | Versão semanal | `auditReportService.ts` (novo) |
| `funnel_diagnosis` | Diagnóstico de gargalo de funil | `funnelAnalyzer.ts` (novo) |
| `wasted_spend_explanation` | Explicar wasted spend em linguagem executiva | `wastedSpendService.ts` (novo) |
| `lifecycle_transition_reason` | Justificar transição de estado | `campaignStateMachine.ts` (novo) |
| `connection_test` | Teste de conexão LLM | `settings/llm/test/route.ts` |

### 3.4. Resolução em Runtime (4 camadas)

```typescript
// src/lib/marketing/services/promptResolver.ts
export async function resolvePromptTemplate(
  code: string,
  tenantId: string,
  segmentId?: string
): Promise<PromptTemplate> {
  // Ordem de precedência (mais específico ganha):
  // 1. tenant_id + segment_id  → override máximo
  // 2. tenant_id apenas        → override total do tenant
  // 3. segment_id apenas       → padrão do segmento
  // 4. NULL + NULL             → fallback global
  // 5. Erro                    → template não cadastrado

  const candidates = await pool.query(`
    SELECT * FROM "PromptTemplate"
    WHERE code = $1 AND is_active = true
      AND (
        (tenant_id = $2 AND segment_id = $3) OR
        (tenant_id = $2 AND segment_id IS NULL) OR
        (tenant_id IS NULL AND segment_id = $3) OR
        (tenant_id IS NULL AND segment_id IS NULL)
      )
    ORDER BY
      (tenant_id IS NOT NULL)::int + (segment_id IS NOT NULL)::int DESC,
      version DESC
    LIMIT 1
  `, [code, tenantId, segmentId]);

  if (!candidates.rows[0]) {
    throw new Error(`PromptTemplate "${code}" não encontrado (tenant=${tenantId}, segment=${segmentId})`);
  }

  return candidates.rows[0];
}
```

### 3.5. Renderização (template engine simples)

```typescript
// src/lib/marketing/services/promptRenderer.ts
export function renderPrompt(template: string, vars: Record<string, any>): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
    const value = key.split('.').reduce((obj, k) => obj?.[k], vars);
    if (value === undefined || value === null) {
      throw new Error(`Placeholder {{${key}}} não foi fornecido`);
    }
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  });
}

export function validatePlaceholders(template: PromptTemplate, vars: Record<string, any>): void {
  const required = template.placeholders as string[];
  const missing = required.filter(p => vars[p] === undefined);
  if (missing.length > 0) {
    throw new Error(`Placeholders ausentes para "${template.code}": ${missing.join(', ')}`);
  }
}
```

### 3.6. Uso Final — Refatoração do `strategicBriefing.ts`

**ANTES (hardcoded):**
```typescript
function buildPrompt(type, context) {
  return `Voce e um especialista senior em trafego pago para o mercado imobiliario...
  ${JSON.stringify(context.campaigns)}
  ...`;
}
```

**DEPOIS (data-driven):**
```typescript
import { resolveSegment } from './segmentResolver';
import { resolvePromptTemplate } from './promptResolver';
import { renderPrompt, validatePlaceholders } from './promptRenderer';

async function buildPrompt(type, context, tenantId, clientId) {
  const segment = await resolveSegment(tenantId, clientId);
  const template = await resolvePromptTemplate(`briefing_${type}`, tenantId, segment.id);

  const vars = {
    expert_persona: segment.vocabulary.expert_persona,
    product_singular: segment.vocabulary.product_singular,
    lead_intent: segment.vocabulary.lead_intent,
    conversion_event: segment.vocabulary.conversion_event,
    period_days: context.periodDays,
    campaigns_json: context.campaigns,
    totals: context.totals,
    deltas: context.deltas,
    rule_insights: context.ruleInsights,
  };

  validatePlaceholders(template, vars);
  return {
    systemPrompt: renderPrompt(template.system_prompt || '', vars),
    userPrompt: renderPrompt(template.user_prompt, vars),
    maxTokens: template.max_tokens,
    responseSchema: template.response_schema,
  };
}
```

### 3.7. Exemplo de Template Global — `briefing_morning`

```sql
INSERT INTO "PromptTemplate" (
  code, segment_id, tenant_id, version, name,
  system_prompt,
  user_prompt,
  max_tokens, response_format, response_schema,
  placeholders, description
) VALUES (
  'briefing_morning', NULL, NULL, 1, 'Briefing Matinal (Global)',

  -- System prompt
  'Você é {{expert_persona}}.
Sua missão é gerar um briefing estratégico matinal acionável a partir dos dados das campanhas.
Foque no resumo do dia anterior, alertas urgentes e plano de ação para o dia que está começando.
Use vocabulário do segmento: o produto é {{product_singular}}, o lead é {{lead_intent}}, a conversão desejada é {{conversion_event}}.
Sempre responda APENAS com JSON válido no schema fornecido.',

  -- User prompt
  '## Dados das Campanhas (últimos {{period_days}} dias)

{{campaigns_json}}

## Totais do Período
- Gasto total: R${{totals.spend}}
- Cliques: {{totals.clicks}}
- Impressões: {{totals.impressions}}
- Leads ({{conversion_event}}): {{totals.leads}}
- Campanhas ativas: {{totals.activeCampaigns}}/{{totals.campaigns}}

## Variação vs Período Anterior
- Gasto: {{deltas.spend}}%
- Cliques: {{deltas.clicks}}%
- Impressões: {{deltas.impressions}}%
- Leads: {{deltas.leads}}%

## Alertas do Motor de Regras
{{rule_insights}}

## Instruções
Analise com foco em:
1. Canibalização entre campanhas
2. Realocação de budget
3. Fadiga criativa e saturação
4. Otimização de CPL
5. Tendências e oportunidades

Responda no schema JSON definido.',

  2000, 'json',

  -- response_schema (JSON Schema)
  '{
    "type": "object",
    "required": ["urgentAlerts", "performanceSummary", "campaignAnalysis"],
    "properties": {
      "urgentAlerts": { "type": "array", "items": { "type": "string" } },
      "performanceSummary": { "type": "string" },
      "campaignAnalysis": { "type": "array" },
      "budgetRecommendations": { "type": "array" },
      "actionItems": { "type": "array" },
      "tomorrowPlan": { "type": "string" }
    }
  }'::jsonb,

  -- placeholders
  '["expert_persona", "product_singular", "lead_intent", "conversion_event",
    "period_days", "campaigns_json", "totals", "deltas", "rule_insights"]'::jsonb,

  'Template global para briefing matinal. Override por segmento ou tenant se necessário.'
);
```

### 3.8. UI de Gestão de Prompts

Nova página administrativa (apenas para super-admin ou tenant admin):

```
/admin/campanhas/configuracoes/prompts

┌──────────────────────────────────────────────────────────────────────┐
│  Gerenciar Prompts LLM                                                │
│                                                                       │
│  Filtros: [ Segmento ▾ ]  [ Código ▾ ]  [ Apenas overrides ☐ ]       │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ briefing_morning        Global v3       [Editar] [Histórico]   │  │
│  │ briefing_morning        Imobiliário v1  [Editar]                │  │
│  │ briefing_morning        Saúde v2        [Editar]                │  │
│  │ briefing_closing        Global v1       [Editar]                │  │
│  │ agent_enrichment        Global v2       [Editar]                │  │
│  │ creative_analysis_vision Global v1      [Editar]                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  [ + Novo Override ]  [ ↩ Restaurar Padrão Global ]                   │
└──────────────────────────────────────────────────────────────────────┘
```

Funcionalidades essenciais:
- Editor com syntax highlight para placeholders `{{var}}`
- Preview do prompt renderizado (com exemplo de input)
- **Botão "Testar"** que dispara o LLM com input de exemplo e mostra output
- Versionamento — toda edição cria nova versão
- Rollback para versão anterior
- Diff entre versões

---

## 4. Modelo de Dados — Benchmarks por Segmento

Substitui a proposta original de `BenchmarkProfile` por algo mais estruturado:

```sql
CREATE TABLE campanhasmarketingdigital."Benchmark" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id      UUID REFERENCES "BusinessSegment"(id),
  tenant_id       UUID,                          -- NULL = padrão do segmento

  -- Métrica
  metric_code     VARCHAR(40) NOT NULL,         -- 'ctr', 'cpl', 'frequency', etc
  metric_label    VARCHAR(100),

  -- Thresholds (todos opcionais — defina apenas os relevantes)
  critical_below  DECIMAL,                       -- abaixo disso = crítico
  warning_below   DECIMAL,                       -- abaixo disso = atenção
  target_min      DECIMAL,                       -- meta mínima
  target_max      DECIMAL,                       -- meta máxima
  warning_above   DECIMAL,                       -- acima disso = atenção
  critical_above  DECIMAL,                       -- acima disso = crítico

  -- Configurações
  invert_logic    BOOLEAN DEFAULT false,         -- true para métricas onde menor=melhor (CPC, CPL)
  unit            VARCHAR(20),                   -- 'percent', 'currency_brl', 'count', 'ratio'
  notes           TEXT,

  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),

  UNIQUE (segment_id, tenant_id, metric_code)
);

CREATE INDEX idx_benchmark_segment ON "Benchmark"(segment_id, metric_code);
```

#### Seed exemplo — imobiliário:

| metric_code | critical_below | warning_below | target_min | target_max | warning_above | critical_above | unit |
|---|---|---|---|---|---|---|---|
| ctr | 0.5 | 1.0 | 1.5 | 3.0 | — | — | percent |
| cpl | — | — | 10 | 25 | 40 | 60 | currency_brl |
| frequency | — | — | 1.5 | 3.0 | 3.5 | 4.5 | ratio |
| cpc | — | — | — | 2.5 | 4.0 | 6.0 | currency_brl |
| cpm | — | — | — | 25 | 35 | 50 | currency_brl |
| hook_rate | 10 | 15 | 25 | 50 | — | — | percent |

#### Seed exemplo — saúde:

| metric_code | critical_below | warning_below | target_min | target_max | warning_above | critical_above | unit |
|---|---|---|---|---|---|---|---|
| ctr | 0.4 | 0.8 | 1.2 | 2.5 | — | — | percent |
| cpl | — | — | 15 | 35 | 50 | 80 | currency_brl |
| frequency | — | — | 1.5 | 3.5 | 4.0 | 5.0 | ratio |

A diferença é evidente: **CPL saudável em saúde (R$15-35) é muito diferente de imobiliário (R$10-25)**.

#### Uso em `aiInsights.ts`:

**ANTES (hardcoded):**
```typescript
{ check: (d) => d.avgCtr < 1 && d.daysRunning >= 3, type: 'PAUSE', ... }
```

**DEPOIS (benchmark-driven):**
```typescript
const benchmarks = await getBenchmarksForCampaign(campaign);
const ctrBenchmark = benchmarks.find(b => b.metric_code === 'ctr');

if (d.avgCtr < ctrBenchmark.warning_below && d.daysRunning >= 3) {
  // dispara regra de PAUSE
}
```

---

## 5. Regras de Detecção Também Configuráveis

Avançando ainda mais: as 6 regras do `aiInsights.ts` também podem virar dados.

```sql
CREATE TABLE campanhasmarketingdigital."DetectionRule" (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id        UUID REFERENCES "BusinessSegment"(id),
  tenant_id         UUID,

  code              VARCHAR(50) NOT NULL,         -- 'low_ctr', 'spend_no_leads', etc
  name              VARCHAR(150),
  action_type       VARCHAR(20) NOT NULL,         -- 'PAUSE', 'SCALE', 'ALERT', 'OPTIMIZE'

  -- Condição como expressão JSON avaliável
  condition_expr    JSONB NOT NULL,
  -- Ex: {
  --   "and": [
  --     { "lt": ["avgCtr", { "benchmark": "ctr.warning_below" }] },
  --     { "gte": ["daysRunning", 3] }
  --   ]
  -- }

  -- Templates para título/descrição (usam placeholders)
  title_template       VARCHAR(200),
  description_template TEXT,

  -- Cálculo de confiança como expressão
  confidence_expr   JSONB NOT NULL,
  -- Ex: { "min": [0.9, { "add": [0.6, { "mul": [{ "sub": ["daysRunning", 3] }, 0.1] }] }] }

  is_active         BOOLEAN DEFAULT true,
  priority          INTEGER DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMP DEFAULT NOW(),

  UNIQUE (segment_id, tenant_id, code)
);
```

> **Pragmatismo:** transformar **regras** em JSON aumenta muito a complexidade. Recomendação:
> - **Fase 0**: implementar BusinessSegment + PromptTemplate + Benchmark (suficiente)
> - **Fase futura (opcional)**: DetectionRule data-driven se houver real demanda de customização

---

## 6. Impacto no Documento Anterior

### 6.1. O que muda na proposta original

| Item original | Como muda |
|---|---|
| Hook types hardcoded (curiosity, urgency, etc) | Vem de `BusinessSegment.creative_taxonomy.hooks` |
| Funnel stages TOF/MOF/BOF fixos | Definidos em `BusinessSegment.funnel_stages` (pode haver 5 stages em educação) |
| Persona "especialista imobiliário" em prompt | Vem de `vocabulary.expert_persona` |
| Benchmark CPL R$15-40 | Vem de `Benchmark` por segmento |
| Termos "imóvel", "visita" nos prompts | Substituídos por placeholders `{{product_singular}}`, `{{conversion_event}}` |
| Insight "CPL acima do ideal" | Threshold lido de `Benchmark.warning_above` do segmento |

### 6.2. O que NÃO muda

- Campaign State Machine (8 estados) — universal entre segmentos
- Creative Intelligence (a estrutura) — varia apenas na **taxonomia**, não na lógica
- Tracking Health Monitor — universal
- Wasted Spend Quantification — universal
- Audit Report estrutura — universal, vocabulário vem do segmento

---

## 7. Roadmap Revisado

### 7.1. Nova Fase 0 (precede todas as outras)

```
┌─────────────────────────────────────────────────────────────────┐
│  FASE 0 — FUNDAÇÃO (3 semanas) ⚠ BLOQUEADORA                    │
│                                                                  │
│  ├── Tabela BusinessSegment + seed (5 segmentos iniciais)        │
│  ├── Associação clientes.segment_id, tenants.default_segment_id  │
│  ├── Tabela PromptTemplate + seed (migração dos prompts atuais)  │
│  ├── Tabela Benchmark + seed por segmento                        │
│  ├── Serviços: segmentResolver, promptResolver, promptRenderer   │
│  ├── Refatorar strategicBriefing.ts para usar templates          │
│  ├── Refatorar agentDecisor.ts (enrichWithClaude) para templates │
│  ├── Refatorar aiInsights.ts para usar benchmarks dinâmicos      │
│  └── UI de Gestão de Prompts (/configuracoes/prompts)            │
│                                                                  │
│  Saída: zero hardcode de prompts/benchmarks/vocabulário          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              (Fases 1-4 do documento anterior)
              State Machine → Funnel → Wasted Spend → Video Metrics →
              Tracking Health → Creative Intelligence → Audit Report
```

### 7.2. Critério de Conclusão da Fase 0

A Fase 0 está completa quando:
- ✅ É possível adicionar um novo segmento (ex: "automotivo") **sem deploy**, apenas via SQL/UI
- ✅ É possível customizar prompt do briefing para um tenant específico via UI
- ✅ Benchmarks aparecem diferentes para campanhas de clientes em segmentos diferentes
- ✅ Os 6 alertas do motor de regras disparam com thresholds do segmento, não hardcoded

---

## 8. Riscos Adicionados pela Multi-Segmentação

### 8.1. Risco: Explosão Combinatória de Templates

Com 5 segmentos × 13 códigos de prompt × N tenants com override, podemos ter centenas de templates.

**Mitigação:**
- Templates globais cobrem 80% dos casos (com placeholders de vocabulário)
- Overrides por segmento só quando estrutura do prompt precisa mudar (não apenas vocabulário)
- Overrides por tenant **só sob demanda explícita**

### 8.2. Risco: Inconsistência entre Segmentos

Cada segmento pode evoluir prompts diferentes e divergir muito.

**Mitigação:**
- Estabelecer **schema obrigatório de placeholders** por código
- CI que valida: "todos os templates de `briefing_morning` recebem os mesmos placeholders"
- Documentação por código (`name`, `description`, `placeholders`, `example_input`)

### 8.3. Risco: Mudança de Vocabulário Quebra Análise Histórica

Se hoje saúde usa "consulta" e amanhã passa a usar "atendimento", briefings antigos ficam inconsistentes.

**Mitigação:**
- `BusinessSegment.vocabulary` é versionada (campo `version` + histórico)
- StrategicBriefing armazena snapshot do vocabulário usado no `content.metadata`

### 8.4. Risco: Performance de Resolução de Prompt

Cada chamada LLM faz 1 query para resolver template + 1 para resolver segmento + 1 para benchmarks.

**Mitigação:**
- Cache em memória com TTL de 5min para `PromptTemplate`, `BusinessSegment`, `Benchmark`
- Invalidação ao editar via UI
- Pré-warm no startup do servidor

---

## 9. DDL Consolidada — Fase 0

```sql
-- ============================================================================
-- FASE 0: FUNDAÇÃO MULTI-SEGMENT + PROMPT MANAGEMENT
-- Idempotente: pode ser re-executada sem efeito colateral
-- ============================================================================

-- 1. Segmentos de negócio
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."BusinessSegment" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(40) UNIQUE NOT NULL,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  vocabulary    JSONB NOT NULL DEFAULT '{}',
  funnel_stages JSONB NOT NULL DEFAULT '[]',
  creative_taxonomy JSONB DEFAULT '{}',
  primary_kpis  JSONB NOT NULL DEFAULT '[]',
  is_active     BOOLEAN DEFAULT true,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_segment_active
  ON campanhasmarketingdigital."BusinessSegment"(is_active, sort_order);

-- 2. Associações em tabelas existentes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS segment_id UUID;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS default_segment_id UUID;

ALTER TABLE campanhasmarketingdigital."Settings"
  ADD COLUMN IF NOT EXISTS override_segment_id UUID;

-- 3. Templates de prompt
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."PromptTemplate" (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              VARCHAR(60) NOT NULL,
  version           INTEGER NOT NULL DEFAULT 1,
  is_active         BOOLEAN DEFAULT true,
  segment_id        UUID REFERENCES campanhasmarketingdigital."BusinessSegment"(id),
  tenant_id         UUID,
  system_prompt     TEXT,
  user_prompt       TEXT NOT NULL,
  max_tokens        INTEGER DEFAULT 2000,
  temperature       DECIMAL(3,2) DEFAULT 0.7,
  response_format   VARCHAR(20) DEFAULT 'json',
  response_schema   JSONB,
  name              VARCHAR(150),
  description       TEXT,
  placeholders      JSONB NOT NULL DEFAULT '[]',
  example_input     JSONB,
  example_output    TEXT,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW(),
  created_by        UUID,
  notes             TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_prompt_code_scope_version
  ON campanhasmarketingdigital."PromptTemplate"(code, COALESCE(segment_id::text, ''), COALESCE(tenant_id::text, ''), version);

CREATE INDEX IF NOT EXISTS idx_prompt_lookup
  ON campanhasmarketingdigital."PromptTemplate"(code, is_active);

-- 4. Benchmarks por segmento/tenant
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."Benchmark" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id      UUID REFERENCES campanhasmarketingdigital."BusinessSegment"(id),
  tenant_id       UUID,
  metric_code     VARCHAR(40) NOT NULL,
  metric_label    VARCHAR(100),
  critical_below  DECIMAL,
  warning_below   DECIMAL,
  target_min      DECIMAL,
  target_max      DECIMAL,
  warning_above   DECIMAL,
  critical_above  DECIMAL,
  invert_logic    BOOLEAN DEFAULT false,
  unit            VARCHAR(20),
  notes           TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_benchmark_scope_metric
  ON campanhasmarketingdigital."Benchmark"(COALESCE(segment_id::text, ''), COALESCE(tenant_id::text, ''), metric_code);

CREATE INDEX IF NOT EXISTS idx_benchmark_segment
  ON campanhasmarketingdigital."Benchmark"(segment_id, metric_code);

-- 5. Seed de segmentos iniciais (idempotente)
INSERT INTO campanhasmarketingdigital."BusinessSegment" (code, name, vocabulary, funnel_stages, creative_taxonomy, primary_kpis, sort_order)
VALUES
  ('real_estate', 'Imobiliário', '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, 1),
  ('health',      'Saúde',       '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, 2),
  ('education',   'Educação',    '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, 3),
  ('services',    'Serviços',    '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, 4),
  ('commerce',    'Comércio',    '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, 5),
  ('generic',     'Genérico',    '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, 99)
ON CONFLICT (code) DO NOTHING;
```

> Os JSONBs vazios serão preenchidos por seeds separados (um `.sql` por segmento) para manter os arquivos legíveis.

---

## 10. Conclusão da Fundação

### 10.1. Síntese das Correções

| Premissa Errada | Premissa Correta |
|---|---|
| Plataforma serve apenas mercado imobiliário | Plataforma é **multi-segmento** — imobiliário é apenas o primeiro |
| Prompts hardcoded em código são aceitáveis | **Toda inteligência LLM é configurável** via banco |
| Benchmarks universais (CTR, CPL, etc) | Benchmarks são **específicos por segmento** e overridáveis por tenant |
| Vocabulário ("imóvel", "visita") no código | Vocabulário vem de `BusinessSegment.vocabulary`, injetado via placeholders |
| Segmento = tenant | Segmento é dimensão independente — um tenant pode atender vários segmentos |

### 10.2. Sequência Correta de Implementação

```
        FASE 0 (3 sem)              FASE 1 (4 sem)              FASE 2+ ...
   ┌──────────────────────┐    ┌──────────────────────┐
   │ Multi-Segment        │    │ Campaign State       │
   │ + Prompt Management  │ ──▶│   Machine            │ ──▶ ...
   │ + Benchmark dinâmico │    │ + Funnel + Wasted    │
   └──────────────────────┘    └──────────────────────┘

   SEM esta fase 0, todas as fases seguintes herdam o hardcode
   e ficamos amarrados ao segmento imobiliário.
```

### 10.3. Diferencial Competitivo Reforçado

Plataformas concorrentes hoje:
- **Single-segment**: especializadas em ecommerce ou imobiliário
- **Multi-segment com prompts genéricos**: análises rasas, não capturam vocabulário

Nossa plataforma após Fase 0:
- ✅ **Multi-segment com inteligência especializada**: prompts otimizados por vertical
- ✅ **Customizável por tenant**: grandes clientes podem refinar prompts próprios
- ✅ **Versionável e auditável**: experimentação A/B de prompts
- ✅ **Sem deploy para evoluir IA**: equipe de produto edita prompts via UI

Isso transforma o produto de **"plataforma com IA"** para **"plataforma de inteligência configurável"**, dificultando muito a replicação por concorrentes.

---

*Documento gerado em 25/05/2026. Estabelece a fundação multi-segment e gestão de prompts antes de qualquer outra evolução do módulo.*
