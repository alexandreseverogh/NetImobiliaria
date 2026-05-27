# Plano de Ação: Multi-Segment + Prompt Management

> **Documento de planejamento. Nada será alterado até autorização explícita.**
>
> Substitui as propostas anteriores que assumiram criação de novas tabelas para segmentos.
> Agora o plano respeita a infraestrutura existente (`system_segments` e padrão `system_*` + `tenant_*_overrides`).

> ## ✅ Decisões Confirmadas (após validação)
>
> 1. **Prompts são segmento-only** — não há override por tenant. Todos os tenants do mesmo segmento usam os mesmos prompts. Justificativa: consistência de produto, expertise centralizada no time de produto, zero risco de tenant quebrar próprio prompt.
>
> 2. **Benchmarks são segmento + override por tenant** — porque o **número** que define "bom" varia comercialmente entre tenants do mesmo segmento (imobiliária de luxo vs popular têm CPL ideal opostos).
>
> 3. **Toda gestão de prompts e benchmarks vive dentro da UI de segmento** — não há páginas standalone `/admin/master/prompts` ou `/admin/master/benchmarks`. Ficam como abas do editor de segmento.
>
> 4. **Tenant admin tem visualização read-only de prompts e provider LLM editável + benchmark overrides**.

---

## Sumário

1. [Descobertas da Investigação](#1-descobertas-da-investigação)
2. [Correções Arquiteturais](#2-correções-arquiteturais)
3. [Adições Necessárias no Banco](#3-adições-necessárias-no-banco)
4. [Estrutura de Código (a planejar)](#4-estrutura-de-código-a-planejar)
5. [UI/UX — Master Platform (Super-Admin)](#5-uiux--master-platform-super-admin)
6. [UI/UX — Tenant Admin](#6-uiux--tenant-admin)
7. [UI/UX — Impacto no Dashboard Operacional](#7-uiux--impacto-no-dashboard-operacional)
8. [Fluxos End-to-End](#8-fluxos-end-to-end)
9. [Cronograma e Dependências](#9-cronograma-e-dependências)
10. [Critérios de Aceite](#10-critérios-de-aceite)

---

## 1. Descobertas da Investigação

### 1.1. Tabela `system_segments` (já existe)

```
Coluna         Tipo                       Default
─────────────  ─────────────────────────  ────────────────────────
id             uuid (PK)                  gen_random_uuid()
name           varchar(255) NOT NULL
slug           varchar(100) UNIQUE NOT NULL
description    text
icon           varchar(50)
color_theme    varchar(50)                '#2563eb'
is_active      boolean                    true
created_at     timestamptz                now()
updated_at     timestamptz                now()
```

### 1.2. Dados Atuais (5 segmentos)

| name | slug | descrição |
|---|---|---|
| Geral | geral | Segmento padrão para novos negócios |
| Imobiliário | imobiliaria | Gestão de imóveis, leads e corretores |
| Master Platform | master | Controle supremo da infraestrutura |
| Saúde Digital | saude | Prontuários e gestão de clínicas |
| Venda de Carros | carros | Venda de Carros |

> **Observação:** "Educação" ainda não existe. Será adicionado quando houver tenant educacional.

### 1.3. Relacionamentos Existentes

```
   ┌────────────────┐
   │ system_segments│
   └────┬───────────┘
        │
        ├──── system_segment_blueprints ──── system_features
        │     (define features padrão por segmento)
        │
        ├──── system_segment_modules ──── system_modules
        │     (define módulos disponíveis por segmento)
        │
        └──── tenants.segment_id
              (cada tenant pertence a 1 segmento)

   ┌────────────────┐
   │   clientes     │  ← NÃO tem segment_id
   │                │     herda do tenant pai
   └────────────────┘
```

### 1.4. Padrão Estabelecido: `system_*` + `tenant_*_overrides`

O projeto **já usa** esse padrão para features. Exemplo:
- `system_features` — definição global
- `tenant_feature_overrides` — override por tenant (com `skill_config JSONB`)

**Nossos novos recursos devem seguir o mesmo padrão.**

### 1.5. Implicação Arquitetural Crítica

```
1 TENANT  =  1 SEGMENTO  =  N CLIENTES (todos do mesmo segmento)
```

Não é possível um tenant ter clientes de segmentos diferentes. Isso **simplifica** a resolução:

```typescript
// Resolução final do segmento ativo
const segmentId = tenant.segment_id;
// Não há override por cliente, não há fallback complexo
```

Isso descarta a complexidade que tinha proposto antes (`override_segment_id`, `client.segment_id`).

---

## 2. Correções Arquiteturais

### 2.1. O que muda em relação ao documento anterior

| Proposta anterior (incorreta) | Plano correto |
|---|---|
| Criar tabela `BusinessSegment` nova | Usar `public.system_segments` existente |
| `clientes.segment_id` | **Não criar.** Cliente herda do tenant. |
| `tenants.default_segment_id` | **Não criar.** Já existe `tenants.segment_id`. |
| `Settings.override_segment_id` | **Não criar.** Sem necessidade. |
| Tabela `BenchmarkProfile` | Renomear para `system_benchmarks` + `tenant_benchmark_overrides` |
| Tabela `PromptTemplate` no schema marketing | Renomear para `system_prompt_templates`. **Em `public.`** (recurso transversal). |
| Tabela `tenant_prompt_overrides` | **❌ NÃO CRIAR.** Prompts são segmento-only. |
| Páginas `/admin/master/prompts` e `/admin/master/benchmarks` standalone | **❌ NÃO CRIAR.** Tornam-se abas do editor de segmento. |
| Páginas `/admin/campanhas/inteligencia/prompts` (tenant edit prompts) | **❌ NÃO CRIAR.** Tenant apenas visualiza. |

### 2.2. Decisão de Schema (a validar)

```
ALTERNATIVA A: public.*
  ├── Prompt templates podem ser usados por OUTROS módulos no futuro
  │   (ex: CRM, atendimento, geração de imóveis com IA)
  └── Mantém consistência com system_features/system_modules

ALTERNATIVA B: campanhasmarketingdigital.*
  └── Mantém isolamento do módulo de campanhas
```

**Recomendação:** **Alternativa A (public.\*)**. Prompts são recurso transversal — qualquer módulo que use LLM pode reutilizar a infra.

---

## 3. Adições Necessárias no Banco

### 3.1. ALTER em `system_segments` (4 novas colunas JSONB)

```sql
-- A SER EXECUTADO QUANDO AUTORIZADO
ALTER TABLE public.system_segments
  ADD COLUMN vocabulary         JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN funnel_stages      JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN creative_taxonomy  JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN primary_kpis       JSONB NOT NULL DEFAULT '[]';
```

**Justificativa de cada coluna:**

| Coluna | Conteúdo | Onde é consumida |
|---|---|---|
| `vocabulary` | Termos do segmento ("imóvel"/"consulta"/"curso", persona do especialista, intent do lead) | Substituição de placeholders nos prompts LLM |
| `funnel_stages` | Definição customizada das etapas do funil (TOF/MOF/BOF + estágios pós-lead) | Classificação de campanhas, dashboard de funil |
| `creative_taxonomy` | Ângulos, hooks e formatos específicos do segmento | Creative Intelligence Layer (análise de criativos) |
| `primary_kpis` | Lista ordenada dos KPIs mais relevantes do segmento | Ordem de exibição no dashboard, foco do briefing |

### 3.2. Nova tabela `system_prompt_templates`

```sql
-- A SER EXECUTADO QUANDO AUTORIZADO
CREATE TABLE public.system_prompt_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              VARCHAR(60) NOT NULL,
  segment_id        UUID REFERENCES public.system_segments(id) ON DELETE CASCADE,
  version           INTEGER NOT NULL DEFAULT 1,
  is_active         BOOLEAN NOT NULL DEFAULT true,

  name              VARCHAR(150),
  description       TEXT,

  system_prompt     TEXT,
  user_prompt       TEXT NOT NULL,
  max_tokens        INTEGER DEFAULT 2000,
  temperature       DECIMAL(3,2) DEFAULT 0.7,
  response_format   VARCHAR(20) DEFAULT 'json',
  response_schema   JSONB,

  placeholders      JSONB NOT NULL DEFAULT '[]',
  example_input     JSONB,
  example_output    TEXT,

  created_at        TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by        UUID,
  notes             TEXT,

  UNIQUE (code, segment_id, version)
);

CREATE INDEX idx_prompt_template_lookup
  ON public.system_prompt_templates(code, is_active, segment_id);
```

**Regra de resolução:**
- `segment_id = NULL` → template **global** (fallback universal)
- `segment_id = X` → template específico do segmento X
- Múltiplas `version` permitidas → maior versão ativa vence

### 3.3. ~~Nova tabela `tenant_prompt_overrides`~~ — REMOVIDA do plano

Conforme decisão registrada no topo do documento, **prompts são segmento-only**.
Não existirá essa tabela.

Resolução final de prompt em runtime:
```
1º busca system_prompt_templates(segment_id = tenant.segment_id, code = X)
2º busca system_prompt_templates(segment_id = NULL, code = X)   ← fallback global
3º erro: template não cadastrado
```

### 3.4. Nova tabela `system_benchmarks`

```sql
-- A SER EXECUTADO QUANDO AUTORIZADO
CREATE TABLE public.system_benchmarks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id      UUID REFERENCES public.system_segments(id) ON DELETE CASCADE,

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
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE (segment_id, metric_code)
);
```

### 3.5. Nova tabela `tenant_benchmark_overrides`

```sql
-- A SER EXECUTADO QUANDO AUTORIZADO
CREATE TABLE public.tenant_benchmark_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  metric_code     VARCHAR(40) NOT NULL,

  critical_below  DECIMAL,
  warning_below   DECIMAL,
  target_min      DECIMAL,
  target_max      DECIMAL,
  warning_above   DECIMAL,
  critical_above  DECIMAL,
  notes           TEXT,

  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE (tenant_id, metric_code)
);
```

### 3.6. Resumo do Impacto no Banco

```
ALTERAÇÕES EM TABELAS EXISTENTES
┌────────────────────────────────────────────────────┐
│ public.system_segments                              │
│   + vocabulary         JSONB                        │
│   + funnel_stages      JSONB                        │
│   + creative_taxonomy  JSONB                        │
│   + primary_kpis       JSONB                        │
└────────────────────────────────────────────────────┘

NOVAS TABELAS
┌────────────────────────────────────────────────────┐
│ public.system_prompt_templates                      │
│ public.system_benchmarks                            │
│ public.tenant_benchmark_overrides                   │
└────────────────────────────────────────────────────┘

TOTAL
- 1 ALTER em tabela existente (4 colunas, todas com default → não quebra nada)
- 3 CREATE TABLE novos
- 0 mudanças destrutivas
- 0 modificações nas tabelas do schema campanhasmarketingdigital (por enquanto)
```

---

## 4. Estrutura de Código (a planejar)

> **Apenas referência. Nada será criado até autorização.**

### 4.1. Novos Arquivos a Serem Criados

```
src/lib/intelligence/                  (novo diretório transversal)
  ├── segmentResolver.ts               → resolve segmento a partir do tenantId
  ├── promptResolver.ts                → busca template (segmento → global)
  ├── promptRenderer.ts                → substitui placeholders {{var}}
  ├── benchmarkResolver.ts             → resolve benchmark (tenant override → segmento)
  └── llmInvoker.ts                    → wrapper unificado: resolve + renderiza + chama LLM

src/app/admin/master/                  (novo, área super-admin)
  └── segmentos/
      ├── page.tsx                     → lista de segmentos
      └── [id]/page.tsx                → editor com 7 abas
                                         (Geral, Vocabulário, Funil, Taxonomia,
                                          KPIs, Prompts, Benchmarks)

src/app/admin/campanhas/inteligencia/  (novo, tenant admin)
  ├── page.tsx                         → "Inteligência da Conta" (visão geral)
  └── benchmarks/page.tsx              → overrides numéricos de benchmark

src/app/api/admin/master/              (novo)
  └── segments/
      ├── [id]/route.ts                → GET/PUT segmento
      ├── [id]/prompts/route.ts        → CRUD templates do segmento
      └── [id]/benchmarks/route.ts     → CRUD benchmarks do segmento

src/app/api/admin/intelligence/        (novo)
  └── benchmarks/route.ts              → GET/PUT overrides do tenant
```

> **Removido em relação ao plano anterior:**
> - `/admin/master/prompts/*` (vira aba do segmento)
> - `/admin/master/benchmarks/*` (vira aba do segmento)
> - `/admin/campanhas/inteligencia/prompts/*` (tenant não edita prompts)

### 4.2. Refatorações em Arquivos Existentes

```
src/lib/marketing/services/strategicBriefing.ts
  ▶ Substituir buildPrompt() hardcoded por chamada ao llmInvoker
  ▶ Manter fallback rule-based

src/lib/marketing/services/agentDecisor.ts
  ▶ enrichWithClaude() passa a usar template "agent_enrichment"

src/lib/marketing/services/aiInsights.ts
  ▶ Thresholds das 6 regras lidos de benchmarkResolver
  ▶ (Lógica das regras permanece em código por simplicidade)

src/app/api/admin/campanhas/settings/llm/test/route.ts
  ▶ Usar template "connection_test" em vez de string fixa
```

---

## 5. UI/UX — Master Platform (Super-Admin)

> Área `/admin/master/*` acessível apenas a usuários do segmento "Master Platform".

### 5.1. Tela: `/admin/master/segmentos` — Lista de Segmentos

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  Master Platform  ›  Segmentos                                               ║
║                                                                              ║
║  Gerencie os segmentos de negócio da plataforma.                             ║
║  Cada tenant pertence a um segmento.                                         ║
║                                                                              ║
║  ┌────────────────────────────────────────────────────────────────────────┐  ║
║  │ 🔍 Buscar...                              [+ Novo Segmento]            │  ║
║  └────────────────────────────────────────────────────────────────────────┘  ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │ Segmento          Tenants  Templates  Benchmarks  Status   Ações     │    ║
║  ├──────────────────────────────────────────────────────────────────────┤    ║
║  │ 🏠 Imobiliário    2       12 / 13     8 / 10      ✅ Ativo  [Editar] │    ║
║  │ 🏥 Saúde Digital  0       9 / 13      5 / 10      ✅ Ativo  [Editar] │    ║
║  │ 🚗 Venda Carros   0       7 / 13      3 / 10      ✅ Ativo  [Editar] │    ║
║  │ 🎓 Educação       0       0 / 13      0 / 10      ⏸ Rascun [Editar] │    ║
║  │ 📦 Geral          1       13 / 13     10 / 10     ✅ Ativo  [Editar] │    ║
║  │ ⚙ Master Platform 1       —           —           ✅ Ativo           │    ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
║  Legenda: "12 / 13" = templates configurados / total de códigos esperados    ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

**Funcionalidades:**
- Busca por nome/slug
- Contadores visuais (templates configurados vs esperados, benchmarks vs métricas)
- Indicador de saúde do segmento (verde = completo, amarelo = parcial, vermelho = rascunho)
- Botão "+ Novo Segmento" abre modal com campos: nome, slug, ícone, cor

### 5.2. Tela: `/admin/master/segmentos/[id]` — Editor de Segmento (7 abas)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ← Voltar    Segmentos  ›  Imobiliário                       [💾 Salvar]    ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │ Geral │ Vocabulário │ Funil │ Taxonomia │ KPIs │ Prompts │ Benchmarks│    ║
║  └────┬─────────────────────────────────────────────────────────────────┘    ║
║       │                                                                      ║
║       ▼                                                                      ║
║  ╔══════════════════════════════════════════════════════════════════════╗    ║
║  ║                                                                      ║    ║
║  ║  ABA "Geral" (selecionada)                                           ║    ║
║  ║                                                                      ║    ║
║  ║  Nome ………………………… [Imobiliário                              ]       ║    ║
║  ║  Slug ………………………… [imobiliaria]  (não editável)                     ║    ║
║  ║  Descrição ……………… [Gestão de imóveis, leads e corretores]           ║    ║
║  ║                                                                      ║    ║
║  ║  Ícone …………………… [🏠]   Cor tema …… [#7c3aed]  ▓                     ║    ║
║  ║  Status …………… (●) Ativo  ( ) Rascunho                                ║    ║
║  ║                                                                      ║    ║
║  ║  ───────────────────────────────────────────────────────             ║    ║
║  ║  Estatísticas                                                        ║    ║
║  ║                                                                      ║    ║
║  ║  • 2 tenants vinculados a este segmento                              ║    ║
║  ║  • Última edição: 2026-05-25 por Admin Master                        ║    ║
║  ║  • Templates: 12 de 13 códigos configurados                          ║    ║
║  ║  • Benchmarks: 8 de 10 métricas com referência                       ║    ║
║  ║                                                                      ║    ║
║  ╚══════════════════════════════════════════════════════════════════════╝    ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ABA "Vocabulário" — edita system_segments.vocabulary (JSONB)                ║
║                                                                              ║
║  Termos básicos do segmento usados nos prompts LLM via {{placeholders}}.    ║
║                                                                              ║
║  ┌───────────────────────────────────────────────────────────────────────┐   ║
║  │ Chave                  │ Valor                                        │   ║
║  ├────────────────────────┼──────────────────────────────────────────────┤   ║
║  │ product_singular        │ imóvel                                      │   ║
║  │ product_plural          │ imóveis                                     │   ║
║  │ lead_intent             │ interessado em imóvel                       │   ║
║  │ conversion_event        │ agendamento de visita                       │   ║
║  │ expert_persona          │ especialista sênior em tráfego pago...     │   ║
║  │ buyer_journey           │ [awareness, consideration, visit, ...]      │   ║
║  │ common_objections       │ [preço, localização, financiamento, ...]    │   ║
║  └────────────────────────┴──────────────────────────────────────────────┘   ║
║  [+ Adicionar Chave]                                                         ║
║                                                                              ║
║  💡 Pré-visualização do uso:                                                 ║
║  ┌───────────────────────────────────────────────────────────────────────┐   ║
║  │ Trecho do prompt "briefing_morning":                                  │   ║
║  │                                                                       │   ║
║  │   Você é {{expert_persona}}.                                          │   ║
║  │   Analise leads ({{lead_intent}})...                                  │   ║
║  │                                                                       │   ║
║  │ Será renderizado como:                                                │   ║
║  │                                                                       │   ║
║  │   Você é especialista sênior em tráfego pago...                       │   ║
║  │   Analise leads (interessado em imóvel)...                            │   ║
║  └───────────────────────────────────────────────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ABA "Funil"  — edita system_segments.funnel_stages (JSONB)                  ║
║                                                                              ║
║  Defina as etapas do funil deste segmento. Drag-and-drop para reordenar.    ║
║                                                                              ║
║  ┌────────────────────────────────────────────────────────────────────┐      ║
║  │ ⋮⋮  TOF — Descoberta                                       [Edit]  │      ║
║  │     Métricas: impressions, reach, ctr                              │      ║
║  ├────────────────────────────────────────────────────────────────────┤      ║
║  │ ⋮⋮  MOF — Consideração                                     [Edit]  │      ║
║  │     Métricas: clicks, engagement                                   │      ║
║  ├────────────────────────────────────────────────────────────────────┤      ║
║  │ ⋮⋮  BOF — Lead WhatsApp                                    [Edit]  │      ║
║  │     Métricas: leads, cpl                                            │      ║
║  ├────────────────────────────────────────────────────────────────────┤      ║
║  │ ⋮⋮  VISIT — Visita Agendada                                [Edit]  │      ║
║  │     Métricas: visit_count, cost_per_visit                          │      ║
║  ├────────────────────────────────────────────────────────────────────┤      ║
║  │ ⋮⋮  DEAL — Proposta                                        [Edit]  │      ║
║  │     Métricas: proposals, deals_closed                              │      ║
║  └────────────────────────────────────────────────────────────────────┘      ║
║  [+ Adicionar Etapa]                                                         ║
║                                                                              ║
║  Visualização do funil:                                                      ║
║  ┌────────────────────────────────────────────────────────────────────┐      ║
║  │ TOF  ──▶  MOF  ──▶  BOF  ──▶  VISIT  ──▶  DEAL                     │      ║
║  └────────────────────────────────────────────────────────────────────┘      ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ABA "Taxonomia Criativos" — edita system_segments.creative_taxonomy        ║
║                                                                              ║
║  Catálogo de ângulos, hooks e formatos típicos do segmento.                  ║
║  Usado pelo Creative Intelligence Layer ao classificar criativos.            ║
║                                                                              ║
║  ┌─ Ângulos ─────────────────────────────────────────────────────────┐       ║
║  │ [aspiracional ×] [investimento ×] [primeiro_imovel ×]              │       ║
║  │ [luxo ×] [familia ×] [localizacao ×]                              │       ║
║  │ [+ Adicionar ângulo: __________]                                  │       ║
║  └───────────────────────────────────────────────────────────────────┘       ║
║                                                                              ║
║  ┌─ Hooks ───────────────────────────────────────────────────────────┐       ║
║  │ [seguranca ×] [urgencia_estoque ×] [preco_diferenciado ×]         │       ║
║  │ [transformacao_vida ×] [futuro_familia ×]                         │       ║
║  │ [+ Adicionar hook: __________]                                    │       ║
║  └───────────────────────────────────────────────────────────────────┘       ║
║                                                                              ║
║  ┌─ Formatos prioritários (ordem importa) ───────────────────────────┐       ║
║  │ 1. ⋮⋮ video_ugc                                          [×]      │       ║
║  │ 2. ⋮⋮ carrossel_imoveis                                  [×]      │       ║
║  │ 3. ⋮⋮ video_aereo                                        [×]      │       ║
║  │ 4. ⋮⋮ static_planta                                      [×]      │       ║
║  └───────────────────────────────────────────────────────────────────┘       ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ABA "KPIs" — edita system_segments.primary_kpis                             ║
║                                                                              ║
║  Defina a ordem de prioridade dos KPIs deste segmento.                       ║
║  Afeta a ordem dos cards no Dashboard e o foco do briefing LLM.              ║
║                                                                              ║
║  ┌────────────────────────────────────────────────────────────────────┐      ║
║  │ 1. ⋮⋮ cpl                  R$ custo por lead         [Editar][×]  │      ║
║  │ 2. ⋮⋮ lead_to_visit        % leads → visita          [Editar][×]  │      ║
║  │ 3. ⋮⋮ visit_to_proposal    % visita → proposta       [Editar][×]  │      ║
║  │ 4. ⋮⋮ frequency             média de exposição        [Editar][×]  │      ║
║  │ 5. ⋮⋮ ctr                   % cliques sobre views     [Editar][×]  │      ║
║  └────────────────────────────────────────────────────────────────────┘      ║
║  [+ Adicionar KPI]                                                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 5.3. Aba "Prompts" dentro do Segmento

Lista todos os códigos de prompt esperados pelo sistema, mostrando se há override
específico do segmento ou se está herdando do global.

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  Editando: 🏠 Imobiliário  ›  Aba "Prompts"                                  ║
║                                                                              ║
║  Templates LLM usados pelo sistema para este segmento.                       ║
║  Tenants do segmento NÃO podem editar — apenas o time de produto.            ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │ Código                      Origem ativa            Versão  Ações    │    ║
║  ├──────────────────────────────────────────────────────────────────────┤    ║
║  │ briefing_morning            ⭐ Override Imobiliário  v1     [Editar] │    ║
║  │ briefing_closing            🌐 Herda do Global       v3     [Customizar]│ ║
║  │ briefing_manual             🌐 Herda do Global       v2     [Customizar]│ ║
║  │ agent_enrichment            ⭐ Override Imobiliário  v2     [Editar] │    ║
║  │ creative_analysis_vision    🌐 Herda do Global       v1     [Customizar]│ ║
║  │ creative_analysis_copy      🌐 Herda do Global       v1     [Customizar]│ ║
║  │ creative_concept_generator  ⚠ Não cadastrado         —      [Criar]  │    ║
║  │ audit_report_monthly        🌐 Herda do Global       v1     [Customizar]│ ║
║  │ funnel_diagnosis            🌐 Herda do Global       v1     [Customizar]│ ║
║  │ wasted_spend_explanation    🌐 Herda do Global       v1     [Customizar]│ ║
║  │ lifecycle_transition_reason 🌐 Herda do Global       v1     [Customizar]│ ║
║  │ connection_test             🌐 Herda do Global       v1     [Customizar]│ ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
║  ⭐ Override Imobiliário = template específico deste segmento                ║
║  🌐 Herda do Global      = usa fallback global (recomendado se ok)           ║
║  ⚠ Não cadastrado        = código esperado mas sem template ainda            ║
║                                                                              ║
║  [📚 Gerenciar Templates Globais →]                                          ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

> **Templates Globais**: acessados por link no canto direito. Abre página
> separada `/admin/master/prompts-globais` (única exceção fora do segmento)
> com a mesma UI, mas para registros com `segment_id IS NULL`.

### 5.4. Modal/Drawer: Editor de Template de Prompt

Aberto ao clicar "Editar" ou "Customizar" em qualquer linha da aba Prompts.

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ← Voltar    Prompts  ›  briefing_morning  •  🏠 Imobiliário  v1            ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │ Editor  │  Preview  │  Testar  │  Histórico (3)  │  Schema           │    ║
║  └────┬─────────────────────────────────────────────────────────────────┘    ║
║       ▼                                                                      ║
║                                                                              ║
║  Nome ………………………… [Briefing Matinal — Imobiliário]                          ║
║  Descrição ……………… [Override para imobiliário com ênfase em CPL e visita]   ║
║                                                                              ║
║  ┌─ System Prompt ─────────────────────────────────────────────────────┐     ║
║  │ Você é {{expert_persona}}.                                          │     ║
║  │ Sua missão é gerar um briefing estratégico matinal acionável        │     ║
║  │ a partir dos dados das campanhas.                                   │     ║
║  │ Foque especialmente em CPL e taxa lead→visita.                      │     ║
║  │ Sempre responda APENAS com JSON válido no schema fornecido.         │     ║
║  └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                              ║
║  ┌─ User Prompt ───────────────────────────────────────────────────────┐     ║
║  │ ## Dados das Campanhas (últimos {{period_days}} dias)               │     ║
║  │                                                                     │     ║
║  │ {{campaigns_json}}                                                  │     ║
║  │                                                                     │     ║
║  │ ## Totais do Período                                                │     ║
║  │ - Gasto total: R${{totals.spend}}                                   │     ║
║  │ - Cliques: {{totals.clicks}}                                        │     ║
║  │ - Leads ({{conversion_event}}): {{totals.leads}}                    │     ║
║  │ ...                                                                 │     ║
║  └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                              ║
║  ┌─ Configurações ─────────────────────────────────────────────────────┐     ║
║  │ Max Tokens …… [2000]   Temperature …… [0.7]                         │     ║
║  │ Formato …… (●) JSON ( ) Texto ( ) Markdown                          │     ║
║  └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                              ║
║  ┌─ Placeholders Esperados ────────────────────────────────────────────┐     ║
║  │ ✅ expert_persona     ✅ conversion_event    ✅ period_days          │     ║
║  │ ✅ campaigns_json     ✅ totals.spend        ✅ totals.clicks        │     ║
║  │ ✅ totals.leads       ⚠ rule_insights        (não usado no prompt) │     ║
║  └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                              ║
║  [💾 Salvar como nova versão]  [↩ Restaurar v1]  [🗑 Desativar]              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ABA "Preview" — vê o prompt renderizado com dados de exemplo                ║
║                                                                              ║
║  Selecione exemplo de input:                                                 ║
║  [ Exemplo padrão Imobiliário ▾ ]   [ Editar exemplo ]                       ║
║                                                                              ║
║  ┌─ Resultado Renderizado ─────────────────────────────────────────────┐     ║
║  │ Você é especialista sênior em tráfego pago para o mercado          │     ║
║  │ imobiliário brasileiro.                                             │     ║
║  │                                                                     │     ║
║  │ Sua missão é gerar um briefing estratégico matinal acionável...    │     ║
║  │                                                                     │     ║
║  │ ## Dados das Campanhas (últimos 7 dias)                             │     ║
║  │ [                                                                   │     ║
║  │   { "campaignName": "Lançamento Aurora", "spend": 480, ... },       │     ║
║  │   ...                                                               │     ║
║  │ ]                                                                   │     ║
║  │                                                                     │     ║
║  │ ## Totais do Período                                                │     ║
║  │ - Gasto total: R$1.450                                              │     ║
║  │ ...                                                                 │     ║
║  └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                              ║
║  Tokens estimados: 1.247 / 200.000 (modelo: claude-sonnet-4-6)               ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ABA "Testar" — dispara LLM real com exemplo                                 ║
║                                                                              ║
║  ⚠ Esta operação consumirá tokens da API. Custo estimado: ~$0.05            ║
║                                                                              ║
║  Provider/Modelo (usa config do tenant Master):                              ║
║  [ Anthropic — claude-sonnet-4-6 ]                                           ║
║                                                                              ║
║  [▶ Executar teste]                                                          ║
║                                                                              ║
║  ──────────────────────────────────────────────────────────────────          ║
║                                                                              ║
║  Resposta do LLM:                                                            ║
║  ┌─────────────────────────────────────────────────────────────────────┐     ║
║  │ {                                                                   │     ║
║  │   "urgentAlerts": [                                                 │     ║
║  │     "Campanha 'Aurora' gastou R$480 sem leads — pausar"             │     ║
║  │   ],                                                                │     ║
║  │   "performanceSummary": "Investimento de R$1.450 gerando 23 leads..│     ║
║  │   ...                                                               │     ║
║  │ }                                                                   │     ║
║  └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                              ║
║  Validação do schema:                                                        ║
║  ✅ JSON válido                                                              ║
║  ✅ Todos os campos obrigatórios presentes                                   ║
║  ✅ Tipos corretos                                                           ║
║                                                                              ║
║  Tempo: 4.2s  |  Tokens entrada: 1.247  |  Saída: 384  |  Custo: $0.042     ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ABA "Histórico" — versões anteriores                                        ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │ Versão  Data         Autor          Notas             Ações         │    ║
║  ├──────────────────────────────────────────────────────────────────────┤    ║
║  │ v1 ★    2026-05-25   Admin Master   (versão atual)    [Ver][Diff]   │    ║
║  │ v0      2026-05-20   Admin Master   Versão inicial    [Ver][Reativar]│   ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
║  Diff v1 vs v0:                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │ - Você é um consultor de tráfego pago.                              │    ║
║  │ + Você é {{expert_persona}}.                                         │    ║
║  │                                                                     │    ║
║  │ - Foque em ROI.                                                     │    ║
║  │ + Foque especialmente em CPL e taxa lead→visita.                    │    ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 5.5. Aba "Benchmarks" dentro do Segmento

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  Editando: 🏠 Imobiliário  ›  Aba "Benchmarks"                               ║
║                                                                              ║
║  Valores de referência usados pelo motor de regras e pela IA.                ║
║  Tenants do segmento PODEM sobrescrever individualmente em suas contas.      ║
║                                                                              ║
║  [+ Novo Benchmark]                                                          ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │ Métrica      Crítico ↓  Atenção ↓  Meta       Atenção ↑  Crítico ↑  │    ║
║  ├──────────────────────────────────────────────────────────────────────┤    ║
║  │ CTR (%)      < 0.5      < 1.0      1.5 – 3.0   —          —        │    ║
║  │ CPL (R$)     —          —          10 – 25     > 40       > 60     │    ║
║  │ Frequência   —          —          1.5 – 3.0   > 3.5      > 4.5    │    ║
║  │ CPC (R$)     —          —          — – 2.5     > 4.0      > 6.0    │    ║
║  │ CPM (R$)     —          —          — – 25      > 35       > 50     │    ║
║  │ Hook Rate(%) < 10       < 15       25 – 50     —          —        │    ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
║  💡 Estes valores são usados pelo motor de regras para gerar alertas.        ║
║     Tenants podem fazer override individual.                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 5.6. Modal: Editor de Benchmark (aberto a partir da aba Benchmarks)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  Editar Benchmark  ›  CPL  •  🏠 Imobiliário                       [X]      ║
║                                                                              ║
║  Métrica ………………… [cpl]                Label … [Custo por Lead (R$)]        ║
║  Unidade ………………… (●) R$ ( ) %  ( ) Razão                                    ║
║  Lógica invertida . [✓] (menor = melhor)                                     ║
║                                                                              ║
║  ┌─ Limiares ──────────────────────────────────────────────────────────┐     ║
║  │                                                                     │     ║
║  │  Crítico ↓    Atenção ↓    Meta              Atenção ↑   Crítico ↑  │     ║
║  │     —            —       [10] — [25]          [40]         [60]     │     ║
║  │                                                                     │     ║
║  └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                              ║
║  ┌─ Visualização da escala ────────────────────────────────────────────┐     ║
║  │                                                                     │     ║
║  │  ▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓        │     ║
║  │  10        25                  40                  60   ∞           │     ║
║  │  meta_min  meta_max         atenção            crítico              │     ║
║  │                                                                     │     ║
║  └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                              ║
║  Notas: [Baseado em benchmark de campanhas BR 2024 em lead gen imobiliário] ║
║                                                                              ║
║  [💾 Salvar]                                                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 6. UI/UX — Tenant Admin

> Área `/admin/campanhas/inteligencia/*` acessível ao admin de qualquer tenant.

### 6.1. Tela: `/admin/campanhas/inteligencia` — Visão Geral

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  Campanhas  ›  Inteligência da Conta                                         ║
║                                                                              ║
║  Configurações de IA aplicadas à sua conta                                   ║
║                                                                              ║
║  ┌─ Segmento ──────────────────────────────────────────────────────────┐     ║
║  │ Você está no segmento 🏠 Imobiliário                                │     ║
║  │ Definido pelo super-admin. Determina vocabulário, funil, KPIs       │     ║
║  │ e os prompts da IA. Apenas o time de produto pode alterá-los.       │     ║
║  │                                  [Ver detalhes do segmento (read)]  │     ║
║  └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                              ║
║  ┌─ Provider LLM (editável) ──────────────────────────────────────────┐     ║
║  │ Anthropic — claude-sonnet-4-6   ✅ Conectado                        │     ║
║  │                                                  [Trocar Provider]  │     ║
║  └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │  📝 Prompts da IA                                                    │    ║
║  │                                                                      │    ║
║  │  13 prompts ativos para o seu segmento (somente leitura)             │    ║
║  │  ├── 11 padrão Imobiliário                                           │    ║
║  │  └── 2 herdados do Global                                            │    ║
║  │                                                                      │    ║
║  │  Para customizar, fale com o time de produto.                        │    ║
║  │                                              [Visualizar Prompts →]  │    ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │  📊 Benchmarks numéricos (editável)                                  │    ║
║  │                                                                      │    ║
║  │  10 métricas configuradas para seu segmento                          │    ║
║  │  ├── 8 usando padrão Imobiliário                                     │    ║
║  │  └── 2 com sua customização (CPL, CTR)                               │    ║
║  │                                                                      │    ║
║  │  Ajuste valores para refletir sua realidade comercial.               │    ║
║  │                                       [Gerenciar Benchmarks →]       │    ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │  📈 Estatísticas de Uso (últimos 30 dias)                            │    ║
║  │                                                                      │    ║
║  │  • Briefings gerados: 60                                             │    ║
║  │  • Insights LLM consumidos: 142                                       │    ║
║  │  • Custo total estimado: $4.20                                        │    ║
║  │  • Modelo mais usado: claude-sonnet-4-6 (89%)                        │    ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 6.2. Tela: Visualizar Prompts (read-only, modal ou drawer)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  Inteligência  ›  Prompts ativos para Imobiliário          (somente leitura) ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │ Código                       Origem ativa                            │    ║
║  ├──────────────────────────────────────────────────────────────────────┤    ║
║  │ briefing_morning             🏠 Padrão Imobiliário v1     [Ver]      │    ║
║  │ briefing_closing             🌐 Padrão Global v3          [Ver]      │    ║
║  │ briefing_manual              🏠 Padrão Imobiliário v2     [Ver]      │    ║
║  │ agent_enrichment             🏠 Padrão Imobiliário v2     [Ver]      │    ║
║  │ creative_analysis_vision     🌐 Padrão Global v1          [Ver]      │    ║
║  │ ...                                                                  │    ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
║  💡 Os prompts são curados pelo time de produto para garantir consistência   ║
║     de qualidade entre todos os tenants do segmento.                         ║
║     Sugestões de melhoria: contate suporte.                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

Clique em [Ver] abre o prompt completo em modal read-only — sem botões de
edição, apenas conteúdo + placeholders esperados + exemplo.

### 6.3. Tela: `/admin/campanhas/inteligencia/benchmarks` — Overrides

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  Inteligência  ›  Meus Benchmarks                                            ║
║                                                                              ║
║  Métricas com valores diferentes do padrão do segmento Imobiliário.          ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐    ║
║  │ Métrica   Padrão Segmento          Meu Valor          Status        │    ║
║  ├──────────────────────────────────────────────────────────────────────┤    ║
║  │ CPL       Meta 10-25 / Crít 60     Meta 8-20 / Crít 50 [Editar][↩] │    ║
║  │ CTR       Meta 1.5-3.0 / Crít 0.5  Meta 2.0-4.0 / 0.8  [Editar][↩] │    ║
║  │ Freq      Meta 1.5-3.0             (sem override)      [Customizar]│    ║
║  │ CPC       Meta -– 2.5              (sem override)      [Customizar]│    ║
║  │ ...                                                                  │    ║
║  └──────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
║  💡 Customizações tornam alertas do agente mais agressivos ou tolerantes.    ║
║     Por exemplo, baixar o CPL crítico de R$60 para R$50 faz o agente        ║
║     pausar campanhas mais cedo.                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### 6.5. Modal: Customizar Benchmark

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  Customizar Benchmark  ›  CPL                                  [X]          ║
║                                                                              ║
║  ┌─ Padrão do Segmento Imobiliário ────────────────────────────────────┐     ║
║  │ Meta: R$ 10 – R$ 25     Atenção: > R$ 40     Crítico: > R$ 60      │     ║
║  └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                              ║
║  ┌─ Meu valor para esta conta ─────────────────────────────────────────┐     ║
║  │                                                                     │     ║
║  │  Meta min:    [8]                                                   │     ║
║  │  Meta max:    [20]                                                  │     ║
║  │  Atenção ↑:   [35]                                                  │     ║
║  │  Crítico ↑:   [50]                                                  │     ║
║  │                                                                     │     ║
║  └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                              ║
║  ┌─ Comparação visual ─────────────────────────────────────────────────┐     ║
║  │ Padrão:  ▓▓▓░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓               │     ║
║  │          10–25                 40           60                       │     ║
║  │                                                                     │     ║
║  │ Meu:    ▓▓░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                          │     ║
║  │          8–20             35       50                                │     ║
║  └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                              ║
║  Notas: [Equipe trabalha com leads premium, exige CPL mais agressivo]       ║
║                                                                              ║
║  [Cancelar]                                          [💾 Salvar]             ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 7. UI/UX — Impacto no Dashboard Operacional

### 7.1. Dashboard com Vocabulário do Segmento

```
ANTES (hardcoded "imóvel"):
"Total de leads interessados em imóvel: 23"

DEPOIS (vocabulário injetado):
- Tenant imobiliário:  "Total de leads interessados em imóvel: 23"
- Tenant saúde:        "Total de leads interessados em consulta: 23"
- Tenant educação:     "Total de leads interessados em curso: 23"
```

### 7.2. Cards de KPI Reordenados por Segmento

```
ANTES (ordem fixa):
[Gasto] [Impressões] [Alcance] [Cliques] [CTR] [CPC] [CPM] [Conversões] [Leads] [CPL]

DEPOIS (ordem do primary_kpis do segmento):
- Imobiliário (cpl primeiro): [CPL] [Lead→Visita%] [Visita→Proposta%] [Freq] [CTR] ...
- Saúde:                       [CPL] [Lead→Consulta%] [Freq] [CTR] ...
- Educação:                    [Custo/Matrícula] [CPL] [Lead→Trial%] [Trial→Matrícula%] ...
```

### 7.3. Alertas (Cards Insights) com Benchmarks do Segmento

```
ANTES (threshold fixo):
"CTR baixo: 0.6% (regra disparou em < 1%)"

DEPOIS (threshold do segmento, com override do tenant):
"CTR baixo: 0.6%
 Esperado: > 1.5% (padrão Imobiliário)
 Seu limiar: > 1.5% (sem override)
 Status: Crítico"
```

### 7.4. Briefing — Cabeçalho com Identificação

```
*BRIEFING MATINAL — 26/05/2026*
🏠 Imobiliário  •  claude-sonnet-4-6  •  Prompt: customização v2

*ALERTAS URGENTES*
...
```

### 7.5. Funil Personalizado por Segmento

```
IMOBILIÁRIO:
   TOF → MOF → BOF (Lead WhatsApp) → VISIT (Visita Agendada) → DEAL (Proposta)
   ▲                ▲                                            ▲
   awareness        leads                                        decision

SAÚDE:
   TOF → MOF (Pesquisa Sintoma) → BOF (Lead) → SCHEDULED (Consulta Agendada)

EDUCAÇÃO:
   TOF → MOF (Comparação) → BOF (Lead) → TRIAL (Aula Demo) → ENROLLED (Matrícula)
```

---

## 8. Fluxos End-to-End

### 8.1. Fluxo 1: Master cria novo segmento "Educação"

```
ATOR: Super-Admin
OBJETIVO: Adicionar suporte ao segmento de educação

┌──────────────────────────────────────────────────────────────────────┐
│ 1. Master acessa /admin/master/segmentos                              │
│ 2. Clica em "+ Novo Segmento"                                         │
│ 3. Preenche:                                                          │
│    • Nome: Educação                                                   │
│    • Slug: educacao                                                   │
│    • Ícone: 🎓                                                       │
│    • Cor: #f59e0b                                                     │
│    • Status: Rascunho (não está ativo ainda)                          │
│ 4. Salva → registro criado em system_segments                         │
│                                                                       │
│ 5. Master entra no editor do segmento, aba "Vocabulário":             │
│    • product_singular: curso                                          │
│    • product_plural: cursos                                           │
│    • lead_intent: interessado em curso                                │
│    • conversion_event: matrícula                                      │
│    • expert_persona: especialista sênior em tráfego pago para...     │
│                                                                       │
│ 6. Aba "Funil": adiciona estágios TOF, MOF, BOF, TRIAL, ENROLLED      │
│                                                                       │
│ 7. Aba "Taxonomia Criativos": adiciona ângulos e hooks específicos    │
│                                                                       │
│ 8. Aba "KPIs": ordena cost_per_enrollment > cpl > lead_to_trial > ... │
│                                                                       │
│ 9. Master volta para /admin/master/prompts                            │
│ 10. Identifica prompts com 🌐 Global e cria overrides para Educação:  │
│     • briefing_morning para Educação (ajusta tom para "alunos")       │
│     • creative_analysis_vision para Educação (adiciona "depoimento") │
│                                                                       │
│ 11. Master vai para /admin/master/benchmarks                          │
│ 12. Adiciona benchmarks específicos:                                  │
│     • cost_per_enrollment: meta 80-150, crítico > 300                 │
│     • lead_to_trial: meta 20-40%, atenção < 10%                       │
│                                                                       │
│ 13. Master ativa o segmento (muda status para Ativo)                  │
│                                                                       │
│ 14. (Mais tarde) Master cria novo tenant "Faculdade ABC"              │
│     associando ao segment_id = educacao                               │
└──────────────────────────────────────────────────────────────────────┘

SAÍDA:
- 1 segmento configurado
- N templates de prompt overridable para o segmento
- M benchmarks definidos
- Tenants podem ser criados imediatamente
```

### 8.2. Fluxo 2: Master ajusta prompt do segmento Imobiliário

```
ATOR: Super-Admin (Master Platform)
OBJETIVO: Melhorar o prompt do briefing matinal de Imobiliário com base em
          feedback agregado de múltiplos tenants do segmento.

┌──────────────────────────────────────────────────────────────────────┐
│ 1. Master acessa /admin/master/segmentos                              │
│ 2. Clica em "Imobiliário"                                             │
│ 3. Vai para aba "Prompts"                                             │
│                                                                       │
│ 4. Lista mostra os 13 códigos:                                        │
│    briefing_morning   🌐 Herda do Global       v3       [Customizar] │
│    briefing_closing   🌐 Herda do Global       v1       [Customizar] │
│    ...                                                                │
│                                                                       │
│ 5. Clica "Customizar" em briefing_morning                             │
│    → abre editor com sistema/user prompt e configs                    │
│    → pré-preenchido com conteúdo do template Global como ponto inicial│
│                                                                       │
│ 6. Master edita o system_prompt:                                      │
│    "Você é {{expert_persona}}.                                        │
│     Foque especialmente em CPL e taxa lead→visita.                    │
│     Use linguagem direta e acionável para corretores de imóveis."    │
│                                                                       │
│ 7. Aba "Preview": vê prompt renderizado com exemplo                   │
│                                                                       │
│ 8. Aba "Testar": clica ▶ Executar teste                               │
│    → Sistema chama LLM real com dados de exemplo                      │
│    → Valida resposta contra response_schema                           │
│    → Mostra: ✅ JSON válido, todos os campos presentes                ║
│    → Mostra: 4.2s, 1.247 tokens in, 384 tokens out, $0.042            │
│                                                                       │
│ 9. Master adiciona nota: "v1 — foco em CPL e lead→visita"            │
│                                                                       │
│ 10. Clica "💾 Salvar como nova versão"                               │
│     → Registro criado em system_prompt_templates                      │
│       (code='briefing_morning', segment_id=imobiliaria_uuid, version=1)│
│                                                                       │
│ 11. Volta para lista — briefing_morning agora mostra:                 │
│     ⭐ Override Imobiliário v1   [Editar]                            │
│                                                                       │
│ 12. Próximo cron 8h: TODOS os tenants do segmento Imobiliário         │
│     recebem briefing usando este novo prompt automaticamente.          │
└──────────────────────────────────────────────────────────────────────┘
```

> **Tenants do segmento NÃO precisam fazer nada.** A melhoria do prompt
> beneficia todos automaticamente. Esse é o princípio "consistência de
> produto" que justifica segmento-only para prompts.

### 8.3. Fluxo 3: Tenant ajusta benchmark de CPL

```
ATOR: Admin de "Imobiliária XYZ"
SITUAÇÃO: Equipe trabalha com imóveis de alto padrão; CPL ideal deles
          é mais baixo que o padrão do segmento.

┌──────────────────────────────────────────────────────────────────────┐
│ 1. Admin acessa /admin/campanhas/inteligencia/benchmarks              │
│ 2. Vê padrão Imobiliário: CPL meta R$10-25, crítico > R$60            │
│                                                                       │
│ 3. Clica "Customizar" em CPL                                          │
│                                                                       │
│ 4. Modal mostra padrão vs área de input:                              │
│    "Padrão do Segmento: 10-25 / >40 / >60                            │
│     Meu valor:          [8]-[20] / [>35] / [>50]"                     │
│                                                                       │
│ 5. Comparação visual mostra que seus valores são mais agressivos      │
│                                                                       │
│ 6. Admin adiciona nota: "Trabalhamos com leads premium, exigem CPL    │
│    mais agressivo para sustentar margem"                              │
│                                                                       │
│ 7. Salva → tenant_benchmark_overrides recebe registro                 │
│                                                                       │
│ 8. Próxima execução do agente:                                        │
│    benchmarkResolver retorna valores do override                      │
│    Regra "CPL acima do ideal" dispara com threshold mais baixo        │
│    Campanha com CPL R$45 (antes "OK") agora gera alerta              │
│                                                                       │
│ 9. Briefing inclui essa campanha no item "urgentAlerts"               │
└──────────────────────────────────────────────────────────────────────┘
```

### 8.4. Fluxo 4: Resolução de Prompt em Runtime

```
EVENTO: Cron 8h dispara briefing matinal para tenant XYZ

┌──────────────────────────────────────────────────────────────────────┐
│ 1. agentMonitor.ts → getActiveTenants() retorna tenant XYZ           │
│                                                                       │
│ 2. strategicBriefing.generateStrategicBriefing('morning', XYZ)        │
│                                                                       │
│ 3. NOVA chamada: llmInvoker.invoke({                                  │
│       code: 'briefing_morning',                                       │
│       tenantId: 'XYZ',                                                │
│       vars: { period_days: 7, campaigns_json: [...], ... }            │
│    })                                                                 │
│                                                                       │
│ 4. Dentro de llmInvoker:                                              │
│                                                                       │
│    a) segmentResolver.resolve('XYZ')                                  │
│       → SELECT segment_id FROM tenants WHERE id='XYZ'                 │
│       → retorna segment_id='imobiliaria-uuid'                         │
│                                                                       │
│    b) promptResolver.resolve('briefing_morning', 'imob-uuid')         │
│       Ordem de busca (apenas 2 camadas — não há tenant override):    │
│       i.  system_prompt_templates(segment='imob-uuid', code=...)      │
│           → encontrou? Sim! Usa este. STOP.                           │
│       ii. system_prompt_templates(segment=NULL, code=...)             │
│           → fallback global                                            │
│       iii. Erro: template não cadastrado                              │
│                                                                       │
│    c) Carrega segmento.vocabulary para popular {{expert_persona}}    │
│                                                                       │
│    d) promptRenderer.render(template.user_prompt, allVars)            │
│       Substitui {{var}} por valores                                   │
│                                                                       │
│    e) getLlmClient('XYZ') (factory existente)                         │
│       → llm.complete(systemPrompt + userPrompt, maxTokens)            │
│                                                                       │
│    f) Valida resposta contra template.response_schema                 │
│       → Se inválida, retry 1x, depois fallback rule-based             │
│                                                                       │
│ 5. Resultado é persistido em StrategicBriefing.content                │
│                                                                       │
│ 6. notifyWhatsApp() formata e envia                                   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 9. Cronograma e Dependências

### 9.1. Sequenciamento

```
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 1: Banco de Dados (1-2 dias)                              │
│   • SQL idempotente: ALTER + CREATE TABLES                       │
│   • Seeds dos JSONBs do segmento Imobiliário (existente)         │
│   • Seeds de templates globais (migrar prompts atuais)           │
│   • Seeds de benchmarks padrão para Imobiliário                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 2: Camada de Serviços (3-5 dias)                          │
│   • segmentResolver.ts                                           │
│   • promptResolver.ts                                            │
│   • promptRenderer.ts                                            │
│   • benchmarkResolver.ts                                         │
│   • llmInvoker.ts                                                │
│   • Testes unitários cobrindo 4 camadas de resolução             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 3: Refatoração dos Pontos LLM (2-3 dias)                  │
│   • strategicBriefing.ts → usa llmInvoker                       │
│   • agentDecisor.enrichWithClaude → usa llmInvoker              │
│   • settings/llm/test → usa llmInvoker                          │
│   • aiInsights → usa benchmarkResolver                           │
│   • Manter fallback rule-based em todos                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 4: APIs Administrativas (2-3 dias)                        │
│   • /api/admin/master/segments/[id]                              │
│   • /api/admin/master/segments/[id]/prompts/*                    │
│   • /api/admin/master/segments/[id]/benchmarks/*                 │
│   • /api/admin/master/prompts-globais/*                          │
│   • /api/admin/intelligence/benchmarks/*  (tenant overrides)     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 5: UI Master Platform (4-5 dias)                          │
│   • Lista de segmentos                                           │
│   • Editor de segmento com 7 abas                                │
│     (Geral, Vocab, Funil, Taxonomia, KPIs, Prompts, Benchmarks)  │
│   • Modal editor de prompt (preview/teste/histórico/diff)        │
│   • Modal editor de benchmark                                    │
│   • Página separada: prompts globais (fallback)                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 6: UI Tenant Admin (2 dias — bem reduzida)                │
│   • Inteligência da Conta (visão geral)                          │
│   • Visualizar Prompts (read-only)                               │
│   • Editar overrides de benchmark                                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 7: Sidebar e Permissões (1 dia)                           │
│   • Adicionar itens em sidebar_menu_items                        │
│   • Criar/atualizar features em system_features                  │
│   • Configurar role-based access (Master vs Tenant Admin)        │
└─────────────────────────────────────────────────────────────────┘

TOTAL ESTIMADO: 14-19 dias úteis (reduzido de 17-24 dias)

Redução de ~3-5 dias por:
- Eliminação de tenant_prompt_overrides (tabela, API, UI, fluxo)
- Eliminação de UIs standalone de prompt e benchmark no Master
  (consolidadas em abas do segmento)
- Tenant UI simplificada (sem editor de prompt)
```

### 9.2. Dependências Externas

- Nenhuma. Tudo é interno ao projeto.

### 9.3. Quem Pode Trabalhar em Paralelo

- ETAPAS 4 e 5 podem ser feitas em paralelo (uma vez ETAPAS 1-3 prontas)
- ETAPA 6 depende parcialmente de 4 (APIs do tenant)
- ETAPA 7 só após todas as outras

---

## 10. Critérios de Aceite

### 10.1. Funcional

```
✅ Super-admin consegue criar/editar segmento via UI
✅ Super-admin consegue editar vocabulário, funil, taxonomia, KPIs
✅ Super-admin consegue criar template global de prompt
✅ Super-admin consegue criar override de prompt por segmento
✅ Super-admin consegue testar prompt antes de salvar
✅ Super-admin consegue ver histórico e fazer rollback de versão
✅ Tenant admin visualiza (read-only) os prompts ativos do seu segmento
✅ Tenant admin consegue customizar valores numéricos de benchmark
✅ Tenant admin consegue restaurar benchmark para padrão (deletar override)
✅ Briefing é gerado usando template resolvido na ordem:
   segmento → global (sem camada de tenant para prompts)
✅ Insights de regras usam benchmarks do segmento + override tenant
✅ Dashboard exibe KPIs na ordem do segmento ativo
✅ Vocabulário do segmento aparece nos textos da UI
✅ Todos os tenants do mesmo segmento usam exatamente o mesmo prompt
✅ Mudança de prompt do segmento beneficia todos os tenants
   automaticamente (sem migração)
```

### 10.2. Técnico

```
✅ Nenhum prompt fica hardcoded em código fonte
✅ Nenhum benchmark numérico fica hardcoded
✅ Adicionar novo segmento NÃO requer deploy
✅ Cache em memória reduz queries de resolução (TTL 5min)
✅ Invalidação de cache ocorre ao editar via UI
✅ Logs estruturados para cada chamada LLM:
   • template usado (id, version, scope)
   • placeholders preenchidos
   • tokens entrada/saída
   • custo estimado
✅ Validação JSON Schema na resposta do LLM
✅ Fallback rule-based mantido em todos os pontos
```

### 10.3. UX

```
✅ Master enxerga claramente o escopo de cada template (global/segmento/tenant)
✅ Tenant admin enxerga claramente a origem do prompt em uso
✅ Editor de prompt tem syntax highlight para {{placeholders}}
✅ Preview renderiza com dados de exemplo
✅ Teste executa LLM real e mostra resposta + custo
✅ Confirmações antes de operações destrutivas (deletar override, rollback)
✅ Mensagens claras quando template está faltando placeholder
✅ Indicadores visuais de saúde por segmento na lista mestre
```

---

## 11. Riscos Identificados

| # | Risco | Mitigação |
|---|---|---|
| 1 | Migração de prompts hardcoded para banco quebra fluxos atuais | Seed completo dos prompts atuais antes de refatorar código; testar lado-a-lado antes de remover hardcode |
| 2 | Tenant cria override quebrado e fica sem briefing | Validação em pre-save (placeholders, schema); fallback rule-based mantido |
| 3 | Performance: muitas queries de resolução por chamada | Cache em memória com TTL 5min; invalidação por evento de update |
| 4 | UI master complexa demais para super-admin não-técnico | Wizard guiado para criar segmento + templates inicialmente |
| 5 | Vocabulário inconsistente entre prompts | Validação CI: todos os templates de um `code` recebem mesmos placeholders |
| 6 | Custo de LLM aumenta com botão "Testar" usado em excesso | Quota por usuário por dia; aviso de custo antes de cada teste |
| 7 | Master Platform sem perfil de acesso já configurado | Verificar `system_role_tags` e adicionar role "platform_admin" se necessário |

---

## 12. Itens Fora deste Plano

> Para evitar escopo creep, **NÃO entram nesta etapa**:

- Campaign State Machine (vai depois)
- Creative Intelligence Layer (vai depois)
- Tracking Health Monitor (vai depois)
- Audit Report estruturado (vai depois)
- Wasted Spend Quantification (vai depois)
- Video Metrics / Hook Rate (vai depois)
- PDF Export
- Google Ads integration

A fundação multi-segment + prompt management é **pré-requisito** para todas essas — sem ela, qualquer feature nova herda hardcode.

---

*Documento de planejamento gerado em 25/05/2026.*
*Nenhuma alteração foi feita no código ou banco de dados. Aguardando autorização para iniciar a Etapa 1.*
