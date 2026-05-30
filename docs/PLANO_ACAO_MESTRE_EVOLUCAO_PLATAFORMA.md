# PLANO DE AÇÃO MESTRE — Evolução da Plataforma de Tráfego Pago

> **Documento de referência única.** Consolida todas as decisões arquiteturais
> e de produto discutidas. Substitui (logicamente) os planos anteriores.
>
> Os documentos `ANALISE_ADOCAO_AI_ADS_AUDITOR.md`, `FUNDACAO_MULTISEGMENT_E_PROMPT_MANAGEMENT.md`,
> `PLANO_ACAO_MULTISEGMENT_PROMPT_MANAGEMENT.md` e `BENEFICIOS_FINANCEIROS_E_LEAD_QUALIDADE.md`
> servem como apêndices de aprofundamento.
>
> **Nada será alterado no código ou banco até autorização explícita por fase.**
>
> **▶ REVISÃO 2026-05-28 — Centralização do LLM de Campanhas.** Decisão de produto
> que altera quem escolhe/paga o modelo de IA dos insights do módulo de Campanhas:
> deixa de ser self-service (e pago) por tenant e passa a ser **um modelo ÚNICO e global
> da plataforma** (um provider, um modelo, uma chave) para todos os tenants, guardado
> numa linha global da tabela `Settings` (`tenant_id IS NULL`). **Sem tabela nova, sem
> coluna nova e sem campo no CRUD de Tenants** (a ideia inicial de `tenants.llm_trafego_pago`
> foi cancelada). Ver
> [seção 1.5](#15-decisão-arquitetural-rev-2026-05-28--centralização-do-modelo-llm-de-campanhas).
> Impacta retroativamente as FASES 0–3 (e qualquer fase futura que invoque LLM).
>
> **▶ REVISÃO 2026-05-29 — Camada Operacional de Lançamento de Campanhas.** Análise de
> discrepância entre os campos da página `iniciativas/nova` + `CampaignWizard` e os campos
> realmente exigidos/oferecidos pelas redes (Meta hoje; Google/YouTube/LinkedIn/TikTok na
> FASE 11). Define a fronteira **automático↔manual** do lançamento, a regra de alocação
> (JSONB / atributo de tabela / UI), o mapa `network_defaults` por **segmento×rede** e os
> **3 "lares de dado"** a criar como pré-requisito. **Conclusão: nenhuma fase nova** — os
> gaps se acomodam em colunas/JSONB que a FASE 1 já criou + curadoria por segmento da
> FASE 0. Ver [seção 1.6](#16-camada-operacional-de-lançamento-de-campanhas-rev-2026-05-29).
> Mescla com FASES 1, 5 e 11 (notas pontuais nessas fases). Apenas planejamento.

---

## Sumário

1. [Visão Geral e Princípios](#1-visão-geral-e-princípios)
   - 1.5 [Centralização do modelo LLM de Campanhas](#15-decisão-arquitetural-rev-2026-05-28--centralização-do-modelo-llm-de-campanhas)
   - 1.6 [Camada Operacional de Lançamento de Campanhas](#16-camada-operacional-de-lançamento-de-campanhas-rev-2026-05-29) *(revisão 2026-05-29)*
2. [Arquitetura de Dados Consolidada](#2-arquitetura-de-dados-consolidada)
3. [Mapa das 11 Fases de Execução](#3-mapa-das-11-fases-de-execução)
4. [FASE 0 — Fundação Multi-Segment](#fase-0--fundação-multi-segment-e-prompt-management)
5. [FASE 1 — Multi-Network Foundation](#fase-1--multi-network-foundation)
6. [FASE 2 — Marketing Initiatives](#fase-2--marketing-initiatives)
7. [FASE 3 — Wasted Spend Quantification](#fase-3--wasted-spend-quantification)
8. [FASE 4 — Campaign State Machine](#fase-4--campaign-state-machine)
9. [FASE 5 — Video Metrics + Hook Rate](#fase-5--video-metrics--hook-rate)
10. [FASE 6 — Creative Intelligence Layer](#fase-6--creative-intelligence-layer)
11. [FASE 7 — Funnel Stage Classification](#fase-7--funnel-stage-classification)
12. [FASE 8 — Tracking Health Monitor](#fase-8--tracking-health-monitor)
13. [FASE 9 — Audit Report Estruturado](#fase-9--audit-report-estruturado)
14. [FASE 10 — Portfolio Dashboard + Cross-Pollination](#fase-10--portfolio-dashboard--cross-pollination)
15. [FASE 11 — Implementações de Outras Redes](#fase-11--implementações-de-outras-redes)
16. [Fluxos End-to-End](#16-fluxos-end-to-end)
17. [Catálogo Completo de UIs](#17-catálogo-completo-de-uis)
18. [Riscos Transversais e Mitigações](#18-riscos-transversais-e-mitigações)
19. [Critérios Globais de Aceite](#19-critérios-globais-de-aceite)

---

## 1. Visão Geral e Princípios

### 1.1. O Que Estamos Construindo

Uma **Autonomous Paid Media Operating System** — plataforma SaaS que:
- Gerencia campanhas em **múltiplas redes** (Meta, Google, LinkedIn, TikTok)
- Atende **múltiplos segmentos de negócio** (imobiliário, saúde, educação, comércio, etc.)
- Suporta **agências multi-cliente** (1 tenant gerencia N clientes de segmentos diversos)
- **IA especializada por segmento** atua como consultor sênior, não calculadora
- **Agente autônomo** decide e executa ações, com aprovação via WhatsApp
- Mede e prova **valor financeiro** (wasted spend recuperado, CPL reduzido, leads qualificados)

### 1.2. Princípios Não-Negociáveis

```
1. ZERO HARDCODE de lógica de negócio
   ├── Prompts no banco (system_prompt_templates)
   ├── Benchmarks no banco (system_benchmarks)
   ├── Vocabulário no banco (system_segments.vocabulary)
   ├── Taxonomia de criativos no banco
   ├── ▶ LISTAS DE SEGMENTOS sempre vêm de public.system_segments
   ├── ▶ LISTAS DE REDES sempre vêm de public.ad_networks (FASE 1+)
   └── ▶ LISTAS DE PROVIDERS LLM sempre vêm de campanhasmarketingdigital."LlmModel"
       (rev. 2026-05-28: para CAMPANHAS o modelo é ÚNICO e global da plataforma —
        linha global da Settings (tenant_id IS NULL); não há seleção por tenant — ver 1.5)

   REGRA UNIVERSAL: TODO selector/dropdown/radio que liste recursos
   do domínio (segmentos, redes, providers, métricas, etc.) DEVE ser
   populado dinamicamente do banco. NUNCA listar opções em código.

2. RESOLUÇÃO HIERÁRQUICA com fallback
   ├── Cliente override → Tenant override → Segmento → Global
   └── Sempre existe fallback funcional (nenhum ponto de falha único)

3. RULE-BASED + LLM (não LLM puro)
   ├── Regras determinísticas são a base (consistência)
   ├── LLM enriquece e narra (intelligence)
   └── LLM nunca decide ações executivas sozinho

4. CADA REDE TEM SEU PRÓPRIO BUDGET
   ├── Não há rateio automático
   ├── Iniciativa = agrupador lógico (não compartilha budget)
   └── Cada campanha é tied a UMA rede

5. SEGMENTO ESTÁ NO CLIENTE, NÃO NO TENANT
   ├── 1 tenant pode atender N clientes
   ├── Cada cliente pode ser de segmento diferente
   └── Tenant tem default_segment para campanhas "próprias"

6. APROVAÇÃO HUMANA PARA AÇÕES OFENSIVAS
   ├── PAUSE (defensivo) → executa automaticamente
   ├── SCALE (ofensivo) → pede aprovação via WhatsApp
   └── ALERT/OPTIMIZE → apenas notifica

7. APENAS MUDANÇAS ADITIVAS NO SCHEMA
   ├── Nenhuma DROP COLUMN
   ├── Novas colunas sempre com DEFAULT
   └── Migrations idempotentes
```

### 1.3. Padrão Obrigatório: Selectors Sempre Data-Driven

> **Regra reforçada pelo gestor do projeto.** Todo lugar que precise mostrar
> uma lista de **segmentos**, **redes**, **providers**, **métricas**, etc.
> para o usuário escolher, **MUST** popular essa lista dinamicamente do banco.

#### Endpoints obrigatórios (apenas leitura) para popular UIs

```
GET /api/system/segments              → lista system_segments (is_active=true)
GET /api/system/ad-networks           → lista ad_networks (is_active=true) [FASE 1+]
GET /api/system/metrics-catalog       → lista métricas conhecidas com label/unit
GET /api/admin/campanhas/settings/llm/models  → já existe (LlmModel)
```

#### Padrão de implementação nos componentes React

```typescript
// ❌ ERRADO — hardcoded
const SEGMENTS = [
  { value: 'real_estate', label: 'Imobiliário' },
  { value: 'health', label: 'Saúde' },
  ...
];

// ✅ CERTO — data-driven com cache
const { data: segments } = useQuery('segments', fetchSegments, {
  staleTime: 5 * 60 * 1000,  // cache 5min
});

return (
  <select>
    {segments?.map(s => (
      <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
    ))}
  </select>
);
```

#### Onde isso se aplica (lista exaustiva)

```
SELECTORS DE SEGMENTO
  ├── Cadastro/edição de Cliente (segment_id do cliente)
  ├── Cadastro/edição de Tenant (default_segment_id)
  ├── Editor Master Platform (lista de segmentos para editar)
  ├── Filtros do Portfolio Dashboard (filtrar por segmento)
  ├── Filtros do Master (filtrar prompts/benchmarks por segmento)
  └── Lista "Vincular segmento" em qualquer outro lugar futuro

SELECTORS DE REDE [FASE 1+]
  ├── Step 0 do CampaignWizard (escolher Meta/Google/LinkedIn/TikTok)
  ├── Cadastro de credenciais por rede
  ├── Filtros do Dashboard (filtrar por rede)
  ├── Wizard de Iniciativa (quais redes incluir)
  └── Comparativo entre redes

SELECTORS DE PROVIDER LLM
  ├── (rev. 2026-05-28) Modelo de campanhas: ÚNICO e global da plataforma
  │   (linha global da Settings, tenant_id IS NULL) — definido 1x pelo Master, sem por-tenant
  ├── Self-service do tenant em /campanhas/configuracoes: mantido na UI porém IGNORADO
  └── ai_config do tenant (groq/gemini/preferred_model): inalterado (outros módulos)

SELECTORS DE MÉTRICAS
  ├── Editor de Benchmark (qual métrica está sendo configurada)
  ├── Filtros de relatórios
```

#### Caching e atualização

```
TTL recomendado em cache de frontend:
  Segmentos:          5 minutos
  Redes:              5 minutos
  Providers/Modelos:  10 minutos
  Métricas:           10 minutos

Invalidação:
  • Após CRUD via UI Master, invalidar cache no client
  • React Query refetch ou SWR mutate
  • Não usar cache "stale-while-revalidate" sem fallback
```

#### Consequência prática

Quando o Master Admin criar o segmento **"Educação"** via UI:
1. INSERT em `system_segments`
2. Próxima request a `/api/system/segments` retorna 6 segmentos
3. **Todas as telas de seleção** passam a mostrar Educação **sem deploy**
4. Tenant pode atribuir "Educação" a um cliente imediatamente

Esta é a **razão de ser** da fundação: agilidade para adicionar
segmentos sem mexer em código.

### 1.4. Multi-Segmento × Multi-Cliente × Multi-Rede (cenário real)

```
EXEMPLO COMPLETO:

Tenant: "Agência Digital ABC"
  default_segment_id: geral (para campanhas próprias da agência)

  ├── Cliente A: Imobiliária Premium Luxo
  │   segment_id: real_estate
  │   benchmark CPL override: meta R$80-150
  │
  │   ├── Iniciativa: "Lançamento Aurora Maio 2026"
  │   │   ├── Campaign Meta    | budget R$8k | external_id=fb_123
  │   │   ├── Campaign Google  | budget R$4k | external_id=g_456
  │   │   └── Campaign LinkedIn | budget R$3k | external_id=li_789
  │   │
  │   └── Iniciativa: "Sempre-on Imobiliário"
  │       └── Campaign Meta | budget R$5k/mês
  │
  ├── Cliente B: Clínica Dental Brilho
  │   segment_id: health
  │   benchmark CPL: usa padrão do segmento (sem override)
  │   └── Campaign Meta (avulsa, sem iniciativa) | budget R$3k
  │
  └── Cliente C: Auto Center Veloz
      segment_id: cars
      benchmark CTR override: meta 1.5-3% (mais agressivo)
      └── Iniciativa: "Black Friday 2026"
          ├── Campaign Meta    | budget R$10k
          └── Campaign Google  | budget R$5k
```

---

## 1.5. DECISÃO ARQUITETURAL (rev. 2026-05-28) — Centralização do Modelo LLM de Campanhas

### 1.5.1. A mudança de produto

**Antes (plano original v1.0):** cada tenant configurava o provider/modelo/chave de
LLM usados para os insights de IA do módulo de Campanhas, via self-service em
`/admin/campanhas/configuracoes`, e **arcava com o custo** da própria chave de API.

**Agora (v1.2):** a **própria plataforma centraliza** a utilização do modelo, de forma
**única e global** — **um só provider, um só modelo, uma só chave** para todos os tenants:
- **Quem escolhe** o modelo: a plataforma (Master), **uma única vez** — não há escolha por tenant.
- **Quem paga**: a plataforma, com **uma chave de API centralizada**.
- O tenant **não** configura mais o LLM de campanhas (a UI de self-service permanece
  visível, porém **ignorada** pelo resolver — decisão do gestor; ver 1.5.5).

> **Motivação:** reduzir complexidade técnica e operacional do onboarding de tenants
> (não dependem de obter/gerir chave própria) e dar à plataforma controle de custo,
> qualidade e padronização do modelo usado nos insights.

> **▶ CANCELA a ideia inicial.** A instrução original previa coluna `tenants.llm_trafego_pago`
> + campo no CRUD de Tenants para escolher modelo **por tenant**. Decidiu-se por **modelo
> ÚNICO para toda a plataforma** (2026-05-28). Logo: **NÃO há nova coluna, NÃO há novo
> campo no CRUD de Tenants e NÃO há tabela nova.**

### 1.5.2. Banco de Dados — SEM tabela e SEM coluna novas

A config central reaproveita a tabela existente `Settings` (schema
`campanhasmarketingdigital`), que já tem `tenant_id` **nullable** e as colunas
`llmProvider` / `llmModel` / `llmApiKey`. Usa-se **uma linha global** com `tenant_id IS NULL`:

```
Settings (tenant_id IS NULL)  ← LINHA GLOBAL ÚNICA DA PLATAFORMA
  llmProvider = 'anthropic'          (provider único)
  llmModel    = 'claude-sonnet-4-6'  (modelo único de campanhas)
  llmApiKey   = '****'               (chave da plataforma — quem paga)

Settings (tenant_id = <uuid>)  ← linhas por tenant: PASSAM A SER IGNORADAS
                                  pelo resolver de campanhas (ver 1.5.5)
```

> **Nota de implementação:** no Postgres um `UNIQUE` permite múltiplos `NULL`, então a
> unicidade da linha global é garantida por lógica de app (sempre `WHERE tenant_id IS NULL
> LIMIT 1`) ou por índice único parcial `CREATE UNIQUE INDEX ... WHERE tenant_id IS NULL`.
> Alternativa considerada e descartada: `.env` (menos prático para editar por UI).

### 1.5.3. Onde o Master define o modelo central

- **Não** é no CRUD de Tenants (a ideia foi cancelada — ver 1.5.1).
- A linha global da `Settings` é editada por uma **UI de nível Master** dedicada —
  página **"IA da Plataforma"**, especificada em **1.5.9** (e no catálogo da seção 17).
  Na 1ª carga pode ser semeada via SQL; a edição corrente é feita por essa UI.
- O campo **`ai_config`** (groq_key / gemini_key / preferred_model) que **já existe** no
  CRUD de Tenants **permanece intacto** — é o "outro campo de LLM" citado pelo gestor e
  serve a outros módulos (ex.: brainstorming/CRM), **não** aos insights de campanhas.

### 1.5.4. Resolução do LLM (núcleo da mudança)

Arquivos: `src/lib/marketing/services/llmClient.ts` e `src/lib/intelligence/llmInvoker.ts`.

```
ANTES — getLlmClient(tenantId):
  lê Settings WHERE tenant_id = <tenant>  (provider/modelo/chave do tenant)
  fallback → ANTHROPIC_API_KEY (.env)

DEPOIS — getLlmClientForCampaigns():
  1. lê Settings WHERE tenant_id IS NULL LIMIT 1   (linha global única)
  2. provider/model/apiKey vêm dessa linha
  3. baseUrl → LlmModel (provider, model_id)   [inalterado]
  4. monta LlmClient (anthropic nativo | OpenAI-compatible)  [inalterado]
  ▶ NÃO recebe mais tenantId para fins de seleção de modelo
  ▶ NÃO lê mais a linha por-tenant da Settings
  ▶ fallback: .env (ANTHROPIC_API_KEY) se a linha global não existir
  ▶ fallback rule-based mantido em todos os pontos
```

Todos os pontos de uso de LLM do módulo de campanhas passam a usar o cliente
centralizado, **sem alterar suas interfaces** (`client.complete(prompt)`):

```
PONTO 1  Briefing Estratégico   strategicBriefing.ts (morning/closing/manual)
PONTO 2  Enriquecimento Agente   agentDecisor.ts → enrichWithClaude()
PONTO 3  Teste de Conexão        settings/llm/test/route.ts  (passa a ser ação do Master)
+ FASE 0 llmInvoker.invoke()     (resolve modelo global em vez da Settings do tenant)
+ FASE 2 initiative_consolidated_briefing
+ FASE 3 wasted_spend_explanation
+ FASE 6 Creative Vision LLM / FASE 7 funnel_diagnosis (herdam o cliente central)
```

### 1.5.5. Página `configuracoes` do Tenant — comportamento

Decisão do gestor: **manter editável, porém ignorado** pelo resolver.
- A seção "Engenharia de IA" / "Salvar IA" / "Testar Conexão" em
  `/admin/campanhas/configuracoes` **permanece como está visualmente** (grava na linha
  por-tenant da `Settings`).
- O resolver de campanhas **não lê** mais essa linha por-tenant — usa só a linha global.
- *Observação (não bloqueante):* isso pode gerar confusão ("salvei o modelo e nada mudou").
  Sugestão opcional para implementação: um aviso discreto "O modelo de IA dos insights é
  definido pela plataforma" — a ser decidido na fase de implementação.

### 1.5.6. Impacto retroativo por fase

```
FASE 0 (concluída) — Fundação
  • Princípio "providers vêm de LlmModel": MANTIDO. Mas não há mais selector de modelo
    por tenant — a seleção é única e global (linha global da Settings).
  • llmInvoker.ts: trocar getLlmClient(tenant) por getLlmClientForCampaigns()
    (resolve a linha global da Settings, sem tenantId).
  • UI 0.5.4 "Inteligência da Conta": card "Provider LLM (editável)" → READ-ONLY
    ("Modelo definido pela plataforma").

FASE 1 (concluída) — Multi-Network
  • Impacto NULO no LLM. Credenciais de REDE (tenant_network_credentials) são
    independentes da chave de LLM. Nada muda.

FASE 2 (concluída) — Initiatives
  • initiative_consolidated_briefing passa a usar o cliente central. Sem mudança de UI.

FASE 3 (concluída) — Wasted Spend
  • wasted_spend_explanation passa a usar o cliente central. Sem mudança de UI.

FASES 4–11 (futuras)
  • Qualquer novo ponto LLM já nasce usando getLlmClientForCampaigns().
  • FASE 6 (Creative Vision) e FASE 7 (funnel_diagnosis) herdam o modelo central.
```

### 1.5.7. Plano de migração (rev.)

```
1. Garantir a linha global da Settings (tenant_id IS NULL) com provider/model/apiKey
   da plataforma — via seed SQL ou ponto de config Master.
   (Opcional) índice único parcial p/ garantir 1 só linha global.
2. Implementar getLlmClientForCampaigns() (sem tenantId) lendo a linha global.
3. Repontar llmInvoker + os 3 pontos LLM (briefing, agente, teste) para o cliente central.
4. Implementar a UI Master "IA da Plataforma" (1.5.9) + endpoints GET/PUT/test,
   com guard de nível Master.
5. Rodar em paralelo 1 sprint (flag), comparar saídas, então cortar a leitura
   da linha por-tenant nos fluxos de campanha.
   ▶ Nenhuma DROP COLUMN: as colunas llm* por-tenant da Settings continuam existindo
     (ficam apenas ignoradas pelo módulo de campanhas).
```

### 1.5.8. Critérios de aceite — Centralização LLM

```
✅ Existe UMA linha global na Settings (tenant_id IS NULL) com provider/model/chave da plataforma
✅ getLlmClientForCampaigns() resolve a linha global (sem depender de tenantId)
✅ Briefing, agente e demais pontos LLM de campanhas usam o modelo global único
✅ Tenant NÃO consegue mais alterar (efetivamente) o modelo de insights de campanhas
✅ CRUD de Tenants NÃO ganhou campo de LLM de campanhas (decisão revista)
✅ ai_config (groq/gemini/preferred_model) do tenant permanece intacto p/ outros módulos
✅ Sem tabela nova e sem coluna nova; fallback rule-based mantido
✅ Existe UI Master "IA da Plataforma" (1.5.9) p/ editar provider/modelo/chave globais + testar conexão
```

### 1.5.9. UI de Configuração (Master) — "IA da Plataforma"

Onde o Master edita o provider/modelo/chave únicos dos insights de campanhas
(a linha global da `Settings`, `tenant_id IS NULL`).

```
Rota: /admin/master/ia-plataforma        (área Master; protegida por guard Master)

╔══════════════════════════════════════════════════════════════════╗
║  Master › IA da Plataforma — Insights de Campanhas               ║
║                                                                  ║
║  Provider:  [ Anthropic ▾ ]        (dropdown data-driven)        ║
║  Modelo:    [ claude-sonnet-4-6 ▾ ] (filtra modelos do provider) ║
║  API Key:   [ •••••••••••••••• ]   (mascarada; vazio = manter)   ║
║                                                                  ║
║  [ Testar Conexão ]              [ Salvar ]                       ║
║  Status: ✅ Conectado · modelo claude-sonnet-4-6 · editado 28/05 ║
╚══════════════════════════════════════════════════════════════════╝
```

Comportamento:
- **Provider** e **Modelo**: dropdowns populados de
  `GET /api/admin/campanhas/settings/llm/models` (tabela `LlmModel`) — zero hardcode
  (Princípio 1). Ao trocar o provider, a lista de modelos é refiltrada.
- **API Key**: input `password`; se enviada vazia no PUT, **mantém** a chave atual
  (não sobrescreve). A UI nunca exibe a chave em claro (só "definida: sim/não").
- **Testar Conexão**: reaproveita a lógica de `settings/llm/test`, agora apontada para
  a **config global** (faz um `complete()` curto e valida resposta).
- **Salvar**: faz upsert da linha global da `Settings`.

APIs:
```
GET /api/admin/master/ia-plataforma   → { provider, model, apiKeySet: boolean, updatedAt }
PUT /api/admin/master/ia-plataforma   → upsert linha global (provider, model, apiKey?)
POST /api/admin/master/ia-plataforma/test → testa a config global e retorna {success,...}
GET /api/admin/campanhas/settings/llm/models → já existe (catálogo de modelos)
```

Permissão: ação **exclusiva do Master** (is_system_role / segmento master).
Proteger a página e os endpoints com guard de nível Master.

---

## 1.6. CAMADA OPERACIONAL DE LANÇAMENTO DE CAMPANHAS (rev. 2026-05-29)

### 1.6.1. Contexto e distinção arquitetural

Esta seção resolve a pergunta: *"quais campos do lançamento são preenchidos automaticamente
e quais o operador digita?"* — e por que isso **não exige fases novas**.

> **Distinção que evita confusão:** a página `iniciativas/nova` cria a **Iniciativa**
> (agrupador estratégico: nome, cliente, objetivo de negócio, budget planejado, datas, KPI).
> Ela **NÃO lança** nada nas redes. O **lançamento real** (Campaign → AdSet → Ad → API da
> rede) é do **`CampaignWizard`** via `metaAdsAdapter` (e, na FASE 11, os adapters de cada
> rede). Os campos desta seção referem-se ao **lançamento real**.

A análise comparou os campos do `CampaignWizard`/adapter com os campos realmente
exigidos/oferecidos pelo Meta Ads. **Os "vasos" para os campos faltantes já existem** (FASE 1
aplicada: `Campaign/AdSet/Ad.network_metadata`, `tenant_network_credentials.credentials`,
`ad_networks.capabilities`; FASE 0: `system_segments` com `vocabulary`/`funnel_stages`).
Logo, a evolução é **aditiva** (Princípio 7) e se distribui pelas FASES 1, 5, 8 e 11.

### 1.6.2. Regra de alocação — 3 mecanismos

Todo campo do lançamento cai em **exatamente um** mecanismo:

```
JSONB           → dado específico de rede ou muito variável (não vale virar coluna)
ATRIBUTO        → dado estável, reutilizável e que se consulta/filtra
UI DE LANÇAMENTO → decisão da campanha; não existe dado prévio que a determine
```

### 1.6.3. Os dois baldes (fronteira automático↔manual)

**Automático — puxado de dado já armazenado (o operador NÃO digita):**

```
DO SEGMENTO (system_segments, resolvido por campanha — ver 1.6.4)
  • special_ad_category          (ex.: imobiliário → HOUSING; saúde → NONE)
  • objective / optimization_goal / billing_event (default do funil do segmento)
  • funnel_stage
  • custom_event_type            (qual evento = "lead qualificado" — ver 1.6.5)
  • KPI primário / benchmarks    (p/ validação e insights LLM)

DA CONTA/CREDENCIAIS (tenant_network_credentials)
  • page_id, instagram_actor_id, pixel_id, ad_account_id, moeda, fuso
  • bid_strategy / buying_type / attribution_spec / placements (defaults sãos)

DO REGISTRO (tenant/cliente)
  • site de destino (atributo website) → vira default do linkUrl na UI
  • WhatsApp de destino → SEMPRE do tenant (WhatsAppConfig), nunca por cliente

DERIVADO
  • url_tags (UTMs) montados de Settings.publicDomain + ids da campanha
  • cta_type default pelo objetivo
```

**Manual — digitado na UI de lançamento (cada campanha):**

```
  • Nome da campanha
  • Geo / áreas de veiculação
  • Faixa etária, gênero, interesses (estratégia de público da campanha)
  • Orçamento (diário/total) e período (datas)
  • Criativo (imagem/vídeo selecionado)
  • Copy (texto/headline) — a IA pode RASCUNHAR (FASE 6), humano aprova
  • URL de destino — vem PRÉ-PREENCHIDA do site (1.6.2), editável p/ landing específica
```

> Não há camada "semi" autônoma: ou o campo vem do dado, ou é digitado. A única assistência
> é a IA rascunhando a copy e o pré-preenchimento da URL (que continua editável na UI).

### 1.6.4. Resolução por campanha (cliente → tenant) — defaults NUNCA moram no tenant

Como **uma mesma tenant atende N clientes de segmentos distintos ao mesmo tempo** (Princípio 5),
o default de lançamento tem de ser resolvido **no momento da campanha**, pelo segmento do alvo —
reusando o `segmentResolver` da FASE 0:

```typescript
function resolveSegmentForCampaign(campaign): segment_id {
  if (campaign.client_id) return clientes[campaign.client_id].segment_id; // campanha de cliente
  return tenants[campaign.tenant_id].default_segment;                      // campanha própria
}
```

Consequência desejável: a mesma tenant lança, no mesmo dia, uma campanha **HOUSING** (cliente
imobiliário) e uma **NONE** (cliente clínica), cada uma pegando o default certo — sem redigitar
o segmento. O segmento é informado **uma vez no cadastro** (tenant e cada cliente), não a cada
lançamento.

### 1.6.5. `network_defaults` por segmento×rede (curadoria 1x pelo Master)

Acrescentar um JSONB **chaveado por rede** em `system_segments`. O `vocabulary` já guarda o
**conceito humano** (`conversion_event = "agendamento de visita"`); o `network_defaults` guarda
o **código da API** correspondente, por rede:

```jsonc
// system_segments.network_defaults — exemplo (imobiliário)
{
  "meta":     { "special_ad_category": ["HOUSING"], "custom_event_type": "SCHEDULE",
                "default_objective": "OUTCOME_LEADS", "default_optimization_goal": "LEAD_GENERATION" },
  "google":   { "restricted_category": "housing", "default_conversion_action": "schedule_visit" },
  "youtube":  { /* herda google — ver 1.6.7 */ },
  "tiktok":   { "custom_event_type": "FORM" },
  "linkedin": { "objective": "LEAD_GENERATION" }
}
```

- O **`custom_event_type`** alimenta o `promoted_object = { pixel_id (da conta), custom_event_type
  (do segmento) }` do AdSet — é o que destrava **otimização por conversão / lead qualificado**.
- O **Master** preenche isso **1x ao criar/editar o segmento** (editor de segmentos da FASE 0).
  Segmento novo = preencher linha → funciona p/ todos os tenants/clientes daquele segmento, **sem deploy**.

### 1.6.6. Tabela de alocação dos campos faltantes

| Item | Mecanismo | Onde |
|---|---|---|
| `page_id`, `instagram_actor_id`, `pixel_id` | JSONB | `tenant_network_credentials.credentials` |
| `promoted_object` (pixel + custom_event) | JSONB | `AdSet.network_metadata` |
| `bid_strategy`, `budget_mode` (CBO/ABO), `spend_cap`, placements, `frequency_cap`, `attribution_spec`, `lifetime_budget` | JSONB | `Campaign/AdSet.network_metadata` |
| `network_defaults` (special_ad_category, custom_event_type, objetivo/opt_goal) | JSONB | `system_segments.network_defaults` (+ UI Master) |
| **Site/URL de destino** | Atributo + UI | `clientes.website` (default) → campo editável na UI |
| Métricas de ROI (leads, cost_per_lead, roas, purchase_value, quality rankings, link_clicks, landing_page_views, action_breakdowns) | Atributo | colunas em `Insight` (FASE 5 estendida) |
| Nome, geo, idade, gênero, interesses, orçamento, período, criativo, copy | UI | wizard de lançamento |
| `special_ad_category`, `optimization_goal`, `billing_event`, `adset_schedule`, interesses | já existem | apenas **expor/enviar** (pré-preenchido do segmento, editável) |

### 1.6.7. Multi-rede desde já (keyed por rede) + decisão YouTube

Todo o desenho acima é **chaveado por rede** de propósito, para generalizar à FASE 11 sem
retrabalho: adicionar rede = semear `ad_networks` + preencher `network_defaults[rede]` por
segmento + 1 adapter (`AdNetworkService`) + linhas de field-schema. **Sem wizard novo codado
à mão nem alteração nas telas existentes.**

> **Decisão de produto — YouTube.** YouTube Ads é veiculado **pela API do Google Ads** (canal
> dentro do Google, mesmas credenciais). **Recomendado:** modelar YouTube como **canal/objetivo
> sob a rede `google`**, expondo-o como **opção distinta na UI** ("Google Search" / "YouTube" /
> "Display"). NÃO criar linha `youtube` separada em `ad_networks` (duplicaria credencial/lógica).
> Decisão a confirmar no início da FASE 11.

### 1.6.8. Os 3 "lares de dado" a criar (pré-requisitos do lançamento automático)

Sem estes, parte do balde "automático" cai como manual por **falta de armazenamento**:

```
1. IDENTIDADE/MEDIÇÃO DO META  → page_id, instagram_actor_id, pixel_id
   em tenant_network_credentials.credentials (JSONB; sem coluna nova).
   Destrava: criação de creative (bug do page_id), entrega no Instagram, otimização por conversão.

2. MAPA SEGMENTO→CÓDIGO         → system_segments.network_defaults (JSONB) + UI Master.
   Destrava: special_ad_category, custom_event, objetivo/opt_goal automáticos por segmento×rede.

3. SITE DE DESTINO + POPULAÇÃO  → atributo website (confirmar se já não existe em clientes/tenants
   antes de criar) + garantir clientes.segment_id / tenants.default_segment / Settings.publicDomain
   PREENCHIDOS (não só existentes).
```

### 1.6.9. Hotfixes pré-fase (bugs que comprometem o lançamento HOJE)

Não dependem de schema; valem corrigir antes mesmo das fases:

```
• BUG page_id: metaAdsAdapter usa adAccountId como page_id no object_story_spec
  → creative falha. Trocar pelo page_id real (vindo de 1.6.8 item 1).
• adset_schedule NÃO enviado: scheduleDays/scheduleTimeSlots já PERSISTIDOS mas
  descartados no adapter → enviar como adset_schedule (dayparting).
• Interesses com IDs FALSOS: catálogo local gera IDs inválidos no Meta
  → usar searchTargeting/searchInterests (já existe) para IDs reais.
```

### 1.6.10. Mescla com as fases existentes (sem fase nova)

```
HOTFIX pré-fase        → bug page_id, envio do adset_schedule, IDs de interesse reais
FASE 1 (expandir)      → expor no wizard os campos cujas colunas já existem
                         (special_ad_category, optimization_goal, billing_event);
                         adotar network_metadata como repositório canônico por rede;
                         enriquecer credentials com page_id/ig/pixel
FASE 5 (renomear)      → "Video Metrics" → "Video + Conversão/ROI Metrics":
                         + colunas de ROI em Insight (leads, cost_per_lead, roas,
                         purchase_value, quality rankings, link_clicks, landing_page_views)
FASE 8 (absorver)      → config de pixel/Conversion API (já checa "pixel configurado")
FASE 11 (só consome)   → cada rede: ad_networks + network_defaults[rede] + adapter + field-schema
NOVA (opcional/aditiva)→ tabela tenant_audiences (custom/lookalike reutilizáveis)
HIGIENE                → regenerar schema.marketing.prisma (está DESATUALIZADO: não reflete
                         network_id/external_id/network_metadata que já existem no banco)
```

### 1.6.11. Fallback gracioso (obrigatório, multi-segment)

Segmento recém-criado pode ainda **não ter** `network_defaults`. O sistema **não pode quebrar**:
- assume `special_ad_category = NONE` e **não** otimiza por conversão (cai p/ tráfego/lead form);
- mostra o campo na UI para o operador decidir;
- sinaliza ao Master "segmento X sem network_defaults configurado".

### 1.6.12. Critérios de aceite — Camada de Lançamento

```
✅ Todo campo de lançamento tem mecanismo definido (JSONB / atributo / UI) — zero hardcode
✅ Defaults resolvidos por campanha (cliente→tenant), nunca a partir do tenant isoladamente
✅ network_defaults é keyed por rede (meta/google/youtube/linkedin/tiktok) desde já
✅ page_id/ig/pixel armazenados em credentials e usados pelo adapter (bug page_id corrigido)
✅ promoted_object montado de pixel (conta) + custom_event (segmento)
✅ adset_schedule enviado ao Meta (dados já persistidos)
✅ Interesses usam IDs reais do Meta (searchTargeting)
✅ Site default vem do registro; URL editável na UI; WhatsApp sempre do tenant
✅ Métricas de ROI persistidas em Insight (leads/cpl/roas/valor) p/ os insights LLM
✅ Segmento sem network_defaults → fallback NONE + aviso (não quebra)
✅ Adicionar rede/segmento = inserir dado, sem deploy (Princípio 1)
```

---

### 1.6.13. Fronteira do "on-the-fly": o que é dado x o que é código irredutível

> **Pergunta que esta subseção responde:** *"se a API/MCP de uma mídia mudar, vamos precisar
> implantar algo aqui, ou a plataforma absorve sozinha e o usuário continua operando?"*
> **Veredito honesto: NÃO é 100% on-the-fly.** Atingimos ~85–90% de dinamismo nos *campos*
> de uma rede já integrada; mas a **tradução payload→API** é uma camada de código que
> versiona e atualiza junto com a mídia. Nenhuma arquitetura honesta elimina isso.

**O que FICA on-the-fly (operável pelo usuário, sem deploy):**

```
✅ Adicionar / remover / reordenar campos de uma rede JÁ integrada
   (tipos conhecidos: texto, número, select, multiselect, data, toggle)
✅ Mudar opções, defaults, validações e rótulos desses campos
✅ Curadoria por segmento (network_defaults): novo segmento / categoria / objetivo
✅ Valores vivos da própria API: interesses, geolocalização, públicos (searchTargeting)
✅ Credenciais por tenant/cliente: page_id, pixel_id, instagram_actor_id, tokens
```

**O que NÃO fica on-the-fly (exige desenvolvimento + deploy):**

| Mudança na mídia                                                   | On-the-fly? | Motivo                                            |
|--------------------------------------------------------------------|:-----------:|---------------------------------------------------|
| Novo campo simples (ex.: novo `optimization_goal`)                 | ✅          | field schema renderiza; payload canônico carrega  |
| Nova **estrutura aninhada** (ex.: novo formato de criativo)        | ❌          | o adapter precisa saber montar essa árvore JSON   |
| **Bump de versão** com breaking change (v21 → v22)                 | ❌          | endpoint/contrato muda no código                  |
| **Rede nova** (Google, YouTube, TikTok, LinkedIn)                  | ❌          | cada uma exige um adapter (é a FASE 11)           |
| Novo **escopo de OAuth** / fluxo de auth                           | ❌          | fluxo de credenciais é código                     |
| Regra de **negócio/semântica** (ex.: segmento exige HOUSING)       | ⚠️ Parcial  | dado em `network_defaults`, mas a *decisão* é humana |

**Sobre "MCP":** hoje a integração Meta NÃO passa por MCP — passa pelo adapter chamando a
Graph API direto. Se no futuro um MCP oficial expuser um *tool schema* tipado, dá para
**derivar o field schema automaticamente desse schema** (melhor caminho para empurrar o
on-the-fly perto de 100% *nos campos*). Mesmo assim, a tradução **payload canônico → chamada
do MCP** continua sendo código nosso: o MCP descreve *o que* existe, não *como* a plataforma
monta a requisição.

**Estratégia para MAXIMIZAR o dinamismo (a definir na FASE 1):**

```
1. Field schema servido COMO DADO por rede (não hardcoded no front).
   → idealmente derivável do tool schema do MCP/SDK quando existir.
2. Camada de "campo desconhecido" com FALLBACK GENÉRICO:
   → qualquer campo novo que a mídia introduza é renderizado como input bruto
     e gravado em network_metadata SEM quebrar o fluxo.
   → cobre o caso "a Meta adicionou um campo e ninguém atualizou nada aqui ainda":
     o usuário ainda consegue operar, com graciosidade.
3. Adapter mantém um mapCanonicalToNetwork() versionado por versão de API.
   → mudança estrutural = atualizar este ponto único, não a UI inteira.
```

**Critérios de aceite — fronteira on-the-fly:**

```
✅ Front renderiza o wizard a partir de field schema (dado), não de campos fixos no código
✅ Campo desconhecido cai em fallback genérico → não quebra o lançamento
✅ Mudança estrutural de API isolada no adapter (mapCanonicalToNetwork), não espalhada na UI
✅ Documentado para o usuário: o que ele mesmo configura x o que pede atualização técnica
```

---

## 1.7. THRESHOLDS DA STATE MACHINE CONFIGURÁVEIS POR ENV (pendente — 2026-05-30)

### Problema

Os thresholds de inferência automática de lifecycle estão hardcoded em `src/lib/marketing/services/campaignStateMachine.ts`:

| Constante | Valor atual | Linha |
|-----------|-------------|-------|
| Frequência máxima antes de FATIGUED | `3.5` | 206 |
| Queda de CTR mínima para FATIGUED | `30%` (`0.30`) | 207 |
| Dias mínimos em LEARNING para STABLE | `7` | 219 |
| Conversões mínimas para sair de LEARNING | `50` | 219 |

### Solução planejada

Mover para variáveis de ambiente com defaults razoáveis:

```ts
// campaignStateMachine.ts — topo do arquivo
const FATIGUE_MAX_FREQUENCY     = parseFloat(process.env.LIFECYCLE_FATIGUE_FREQUENCY    || '3.5');
const FATIGUE_MIN_CTR_DROP      = parseFloat(process.env.LIFECYCLE_FATIGUE_CTR_DROP     || '0.30');
const LEARNING_MIN_DAYS         = parseInt  (process.env.LIFECYCLE_LEARNING_DAYS        || '7');
const LEARNING_MIN_CONVERSIONS  = parseInt  (process.env.LIFECYCLE_LEARNING_CONVERSIONS || '50');
```

Substituir literais nas condições de `inferLifecycleStatus()` pelas constantes acima.

### Escopo

- [ ] Extrair 4 constantes no topo de `campaignStateMachine.ts`
- [ ] Substituir literais hardcoded pelas constantes
- [ ] Documentar as 4 vars em `.env.example`
- [ ] Testar: ajustar threshold via env e confirmar que a inferência muda

### Prioridade

Baixa/média — não bloqueia nada. Útil antes de colocar em produção para calibrar sem deploy.

---

## 2. Arquitetura de Dados Consolidada

### 2.1. Diagrama ER (visão final)

```
┌─────────────────────────┐
│ public.system_segments  │ (+ 4 colunas JSONB na FASE 0)
│   id PK                 │ vocabulary, funnel_stages,
│   slug, name            │ creative_taxonomy, primary_kpis
└──────┬──────────────────┘
       │
       │ FK (segment_id)
       │
       ├──────────────────────────┐
       │                          │
┌──────▼─────────────┐    ┌───────▼────────────┐
│ public.tenants     │    │ public.clientes    │ (+segment_id FASE 0)
│   id PK            │    │   uuid PK          │
│   segment_id (já)  │    │   tenant_id        │
└────────┬───────────┘    │   segment_id (NEW) │
         │                └─────────┬──────────┘
         │                          │
         │     ┌────────────────────┘
         │     │
         ▼     ▼
   ┌─────────────────────────┐
   │  Campaign (existente,    │
   │  com adições FASES 1+)   │
   │   id PK                  │
   │   tenant_id              │
   │   client_id              │
   │   network_id (FASE 1)    │
   │   initiative_id (FASE 2) │
   │   lifecycle_status (F4)  │
   │   funnel_stage (FASE 7)  │
   │   external_id (FASE 1)   │
   │   metaCampaignId (legacy)│
   └─────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  NOVAS TABELAS POR FASE                                          │
├──────────────────────────────────────────────────────────────────┤
│  FASE 0  system_prompt_templates                                 │
│          system_benchmarks                                       │
│          tenant_benchmark_overrides                              │
│          client_benchmark_overrides                              │
│                                                                  │
│  FASE 1  ad_networks                                             │
│          tenant_network_credentials                              │
│                                                                  │
│  FASE 2  MarketingInitiative                                     │
│                                                                  │
│  FASE 4  CampaignLifecycleEvent                                  │
│                                                                  │
│  FASE 6  CreativeAnalysis                                        │
│                                                                  │
│  FASE 8  TrackingHealthCheck                                     │
│                                                                  │
│  FASE 9  AuditReport                                             │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2. Cascata de Resolução (regras-chave)

#### 2.2.1. Resolução de Segmento

```typescript
function resolveSegmentForCampaign(campaign): segment_id {
  if (campaign.client_id) {
    return clientes[campaign.client_id].segment_id;
  }
  return tenants[campaign.tenant_id].segment_id;
}
```

#### 2.2.2. Resolução de Prompt

```
Para um código de prompt X e contexto (tenant_id, segment_id):
  1. system_prompt_templates(code=X, segment_id=segmento_ativo, is_active=true)
     → encontrou? usa.
  2. system_prompt_templates(code=X, segment_id=NULL, is_active=true)
     → fallback global.
  3. Erro: template não cadastrado.

NÃO há override por tenant ou cliente (prompts = segment-only).
```

#### 2.2.3. Resolução de Benchmark

```
Para uma métrica M e contexto (tenant_id, client_id, segment_id):
  1. client_benchmark_overrides(client_id=X, metric_code=M)
     → mais específico
  2. tenant_benchmark_overrides(tenant_id=Y, metric_code=M)
     → override do tenant (campanhas próprias)
  3. system_benchmarks(segment_id=segmento_ativo, metric_code=M)
     → padrão do segmento
  4. system_benchmarks(segment_id=NULL, metric_code=M)
     → fallback global
  5. Erro: métrica não cadastrada.
```

---

## 3. Mapa das 11 Fases de Execução

```
╔══════════════════════════════════════════════════════════════════════╗
║ FASE  TÍTULO                                  DURAÇÃO   PRÉ-REQ      ║
╠══════════════════════════════════════════════════════════════════════╣
║   0   Fundação Multi-Segment + Prompts        3 sem     —            ║
║   1   Multi-Network Foundation                2 sem     0            ║
║   2   Marketing Initiatives                   2 sem     1            ║
║   3   Wasted Spend Quantification             1-2 sem   0            ║
║   4   Campaign State Machine                  2 sem     0            ║
║   5   Video Metrics + Hook Rate               1 sem     0            ║
║   6   Creative Intelligence Layer             4-5 sem   0,5           ║
║   7   Funnel Stage Classification             1 sem     0            ║
║   8   Tracking Health Monitor                 1-2 sem   0            ║
║   9   Audit Report Estruturado                2 sem     3,7          ║
║  10   Portfolio Dashboard + Cross-Pollination 3 sem     0,3,6        ║
║  11   Implementação de Outras Redes           varia     1            ║
║       ├── TikTok (mais similar ao Meta)      2-3 sem                 ║
║       ├── Google Ads (mais complexo)          3-6 sem                 ║
║       └── LinkedIn (B2B, validar demanda)    2-4 sem                 ║
╠══════════════════════════════════════════════════════════════════════╣
║  TOTAL (fases 0-10, sem rede adicional):      22-26 semanas          ║
║  TOTAL com 1 rede adicional (TikTok):         24-29 semanas          ║
║  TOTAL com Google Ads também:                 27-35 semanas          ║
╚══════════════════════════════════════════════════════════════════════╝
```

### 3.1. Grafo de Dependências

```
                      ┌────────────────────────────────┐
                      │  FASE 0 — Fundação              │
                      │  (multi-segment + prompts)      │
                      └──┬─────────────────────────────┘
                         │
       ┌─────────────────┼─────────────────────┬───────────────────┐
       │                 │                     │                   │
       ▼                 ▼                     ▼                   ▼
┌──────────────┐  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ FASE 1       │  │ FASE 3       │    │ FASE 4       │    │ FASE 5       │
│ Multi-Network│  │ Wasted Spend │    │ State Machine│    │ Video Metrics│
└──────┬───────┘  └──────────────┘    └──────────────┘    └──────────────┘
       │                                                          │
       ▼                                                          │
┌──────────────┐                                                  │
│ FASE 2       │                                                  │
│ Initiatives  │                                                  │
└──────────────┘                                                  │
                                                                  │
┌──────────────┐  ┌──────────────┐    ┌──────────────┐            │
│ FASE 7       │  │ FASE 8       │    │ FASE 6       │◄───────────┘
│ Funnel       │  │ Tracking H.  │    │ Creative IL  │
└──────────────┘  └──────────────┘    └──────────────┘
       │                                      │
       └──────┬───────────────────────────────┘
              ▼
       ┌──────────────┐
       │ FASE 9       │
       │ Audit Report │
       └──────────────┘
              │
              ▼
       ┌──────────────┐
       │ FASE 10      │
       │ Portfolio    │
       └──────────────┘

FASE 11 (outras redes) — após FASE 1 completa
```

---

## FASE 0 — Fundação Multi-Segment e Prompt Management

**Duração estimada: 3 semanas | Prioridade: CRÍTICA (bloqueadora)**

### 0.1. Objetivo

Eliminar todo hardcode de lógica de negócio. Habilitar customização de prompts,
benchmarks e vocabulário **por segmento**, com override de benchmarks por
**tenant** e por **cliente**.

### 0.2. Mudanças no Banco de Dados

#### Alteração em tabelas existentes

```sql
-- Enriquecer system_segments com 4 colunas JSONB
ALTER TABLE public.system_segments
  ADD COLUMN vocabulary         JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN funnel_stages      JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN creative_taxonomy  JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN primary_kpis       JSONB NOT NULL DEFAULT '[]';

-- Adicionar segment_id em clientes (cada cliente tem segmento próprio)
ALTER TABLE public.clientes
  ADD COLUMN segment_id UUID REFERENCES public.system_segments(id);

CREATE INDEX idx_clientes_segment ON public.clientes(segment_id);
```

#### Novas tabelas

```sql
-- Templates de prompt LLM (segmento-only, sem tenant override)
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

-- Benchmarks padrão por segmento
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

-- Override de benchmark por tenant (para campanhas próprias do tenant)
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

-- Override de benchmark por cliente (mais específico — luxo vs popular)
CREATE TABLE public.client_benchmark_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  client_id       UUID NOT NULL REFERENCES public.clientes(uuid) ON DELETE CASCADE,
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
  UNIQUE (client_id, metric_code)
);

CREATE INDEX idx_client_benchmark_client ON public.client_benchmark_overrides(client_id);
CREATE INDEX idx_client_benchmark_tenant ON public.client_benchmark_overrides(tenant_id);
```

#### Seeds iniciais (entram no mesmo arquivo SQL)

```sql
-- Vocabulário do segmento Imobiliário (already exists com id 92e5ddd3-...)
UPDATE public.system_segments
SET
  vocabulary = '{
    "product_singular": "imóvel",
    "product_plural": "imóveis",
    "lead_intent": "interessado em imóvel",
    "conversion_event": "agendamento de visita",
    "expert_persona": "especialista sênior em tráfego pago para o mercado imobiliário brasileiro",
    "buyer_journey": ["awareness","consideration","visit_scheduled","proposal","deal"],
    "common_objections": ["preço","localização","financiamento","documentação"]
  }'::jsonb,
  funnel_stages = '[
    {"code":"TOF","name":"Descoberta","metrics":["impressions","reach","ctr"]},
    {"code":"MOF","name":"Consideração","metrics":["clicks","engagement"]},
    {"code":"BOF","name":"Lead WhatsApp","metrics":["leads","cpl"]},
    {"code":"VISIT","name":"Visita Agendada","metrics":["visit_count","cost_per_visit"]},
    {"code":"DEAL","name":"Proposta","metrics":["proposals","deals_closed"]}
  ]'::jsonb,
  creative_taxonomy = '{
    "angles": ["aspiracional","investimento","primeiro_imovel","luxo","familia","localizacao"],
    "hooks": ["seguranca","urgencia_estoque","preco_diferenciado","transformacao_vida","futuro_familia"],
    "formats_priority": ["video_ugc","carrossel_imoveis","video_aereo","static_planta"]
  }'::jsonb,
  primary_kpis = '["cpl","lead_to_visit","visit_to_proposal","frequency","ctr"]'::jsonb
WHERE slug = 'imobiliaria';

-- Seeds equivalentes para saude, carros, geral...
-- (1 arquivo SQL por segmento para legibilidade)

-- Benchmarks padrão Imobiliário
INSERT INTO public.system_benchmarks (segment_id, metric_code, metric_label, critical_below, warning_below, target_min, target_max, warning_above, critical_above, invert_logic, unit)
SELECT id, 'ctr', 'CTR (%)', 0.5, 1.0, 1.5, 3.0, NULL, NULL, false, 'percent' FROM public.system_segments WHERE slug='imobiliaria'
UNION ALL
SELECT id, 'cpl', 'CPL (R$)', NULL, NULL, 10, 25, 40, 60, true, 'currency_brl' FROM public.system_segments WHERE slug='imobiliaria'
UNION ALL
SELECT id, 'frequency', 'Frequência', NULL, NULL, 1.5, 3.0, 3.5, 4.5, true, 'ratio' FROM public.system_segments WHERE slug='imobiliaria'
-- etc
;

-- Templates globais de prompt (migração dos prompts hardcoded atuais)
INSERT INTO public.system_prompt_templates (code, segment_id, version, name, system_prompt, user_prompt, placeholders, response_format, response_schema)
VALUES
  ('briefing_morning', NULL, 1, 'Briefing Matinal (Global)',
   '...migração do prompt atual...',
   '...migração do prompt atual...',
   '["expert_persona","product_singular","lead_intent","period_days","campaigns_json","totals","deltas","rule_insights"]'::jsonb,
   'json',
   '{"type":"object","required":["urgentAlerts","performanceSummary","campaignAnalysis"]}'::jsonb
  ),
  ('briefing_closing', NULL, 1, 'Briefing Fechamento (Global)', ...),
  ('briefing_manual', NULL, 1, 'Briefing Manual (Global)', ...),
  ('agent_enrichment', NULL, 1, 'Enriquecimento de Insight (Global)', ...),
  ('connection_test', NULL, 1, 'Teste de Conexão (Global)', ...);
```

### 0.3. Mudanças no Código

#### Novos arquivos

```
src/lib/intelligence/                  (novo diretório)
  ├── segmentResolver.ts                → resolveSegmentForCampaign()
  │                                       resolveSegmentForTenant()
  │                                       resolveSegmentForClient()
  ├── promptResolver.ts                 → resolvePromptTemplate(code, segmentId)
  ├── promptRenderer.ts                 → renderPrompt(template, vars)
  │                                       validatePlaceholders(template, vars)
  ├── benchmarkResolver.ts              → resolveBenchmark(metric, ctx)
  │                                       (4 camadas: client→tenant→segment→global)
  └── llmInvoker.ts                     → invoke({code, ctx, vars}) →
                                          resolve+render+call+validate
   ▶ rev. 2026-05-28: a chamada usa getLlmClientForCampaigns() (sem tenantId), que
     resolve o modelo/chave da linha global da Settings (tenant_id IS NULL) — ver 1.5
```

#### Refatorações em código existente

```
src/lib/marketing/services/strategicBriefing.ts
  ▶ buildPrompt() → usa llmInvoker.invoke({code: 'briefing_<type>', ...})
  ▶ Manter fallback rule-based

src/lib/marketing/services/agentDecisor.ts
  ▶ enrichWithClaude() → usa llmInvoker.invoke({code: 'agent_enrichment', ...})

src/lib/marketing/services/aiInsights.ts
  ▶ Thresholds das 6 regras leem de benchmarkResolver.resolve()
  ▶ Estrutura das regras permanece em código

src/app/api/admin/campanhas/settings/llm/test/route.ts
  ▶ Usa llmInvoker.invoke({code: 'connection_test', ...})
```

#### Cache em memória

```typescript
// Adicionar cache com TTL de 5min nos resolvers
// Invalidação por evento de UPDATE nas tabelas system_* e *_overrides
// Reduz queries de resolução por chamada LLM
```

### 0.4. Novas APIs

```
GET    /api/admin/master/segments
GET    /api/admin/master/segments/[id]
PUT    /api/admin/master/segments/[id]
GET    /api/admin/master/segments/[id]/prompts
POST   /api/admin/master/segments/[id]/prompts
PUT    /api/admin/master/segments/[id]/prompts/[promptId]
POST   /api/admin/master/segments/[id]/prompts/[promptId]/test
GET    /api/admin/master/segments/[id]/benchmarks
POST   /api/admin/master/segments/[id]/benchmarks
PUT    /api/admin/master/segments/[id]/benchmarks/[bmId]

GET    /api/admin/master/prompts-globais        (fallback templates sem segmento)
POST   /api/admin/master/prompts-globais

GET    /api/admin/intelligence/benchmarks       (tenant: lista padrões do segmento + meus overrides)
POST   /api/admin/intelligence/benchmarks       (criar override do tenant)
DELETE /api/admin/intelligence/benchmarks/[id]  (remover override → volta para padrão)

GET    /api/admin/intelligence/clients/[clientId]/benchmarks   (overrides do cliente)
POST   /api/admin/intelligence/clients/[clientId]/benchmarks
DELETE /api/admin/intelligence/clients/[clientId]/benchmarks/[id]

PUT    /api/admin/clients/[clientId]            (incluir segment_id no payload)
```

### 0.5. UI/UX

#### 0.5.1. Master Platform — Lista de Segmentos

```
/admin/master/segmentos

╔══════════════════════════════════════════════════════════════════╗
║  Master Platform › Segmentos                                     ║
║                                                                  ║
║  [+ Novo Segmento]                                               ║
║                                                                  ║
║  Lista: nome, slug, ícone, tenants, clientes vinculados,         ║
║  templates configurados, benchmarks configurados, status         ║
╚══════════════════════════════════════════════════════════════════╝
```

#### 0.5.2. Master Platform — Editor de Segmento (7 abas)

```
/admin/master/segmentos/[id]

Abas:
  1. Geral          (nome, slug, ícone, cor, descrição, status)
  2. Vocabulário    (chaves-valores do JSONB vocabulary)
  3. Funil          (drag-drop dos estágios em funnel_stages)
  4. Taxonomia      (tags de ângulos, hooks, formatos)
  5. KPIs           (ordem dos primary_kpis)
  6. Prompts        (lista dos 13+ códigos; ⭐ override segmento ou 🌐 herda global)
  7. Benchmarks     (tabela de métricas com limiares)
```

#### 0.5.3. Master Platform — Editor de Prompt (modal dentro da aba)

```
Modal aberto ao clicar Editar/Customizar:

Tabs internas:
  • Editor       (system_prompt, user_prompt, configs, placeholders)
  • Preview      (renderiza com input de exemplo)
  • Testar       (chama LLM real, valida schema, mostra custo)
  • Histórico    (versões, diff entre versões, rollback)
```

#### 0.5.4. Tenant Admin — Inteligência da Conta

```
/admin/campanhas/inteligencia

Cards:
  • Segmento ativo (do tenant — read-only)
  • Provider LLM (rev. 2026-05-28: READ-ONLY — "Modelo definido pela plataforma";
    modelo ÚNICO global, definido 1x pelo Master na linha global da Settings)
  • Prompts (read-only, link "Visualizar")
  • Benchmarks próprios (link "Gerenciar")
  • Estatísticas de uso
  • [Novo] Gerenciar por cliente (link)
```

#### 0.5.5. Tenant Admin — Gerenciar Benchmarks por Cliente

```
/admin/campanhas/inteligencia/clientes

Lista de clientes:
  Cliente            | Segmento | Overrides    | Ações
  Imob. Cardoso      | Imob.    | 0            | [Gerenciar]
  Imob. Premium Luxo | Imob.    | 2 (CPL,CTR)  | [Gerenciar]
  Clínica Dental     | Saúde    | 0            | [Gerenciar]

Ao clicar Gerenciar → tabela de benchmarks com:
  Métrica | Padrão Segmento | Override Cliente | Ações
  CPL     | R$10-25 / >R$60 | R$80-150 / >R$200| [Editar][↩]
```

#### 0.5.6. Tenant Admin — Cadastro de Cliente (atualizado)

```
/admin/clientes/[id]/edit

Adicionar seção:

  Segmento de Negócio:
  ┌──────────────────────────────────────────────────────────┐
  │ [Selecione ▾]                                             │
  │                                                           │
  │ Opções carregadas dinamicamente de:                       │
  │   GET /api/system/segments  (is_active=true, ordenado)    │
  │                                                           │
  │ Renderizadas como:                                        │
  │   🏠 Imobiliário                                          │
  │   🏥 Saúde Digital                                        │
  │   🎓 Educação        (se cadastrada)                      │
  │   🚗 Venda de Carros                                      │
  │   📦 Geral                                                │
  │   ... + qualquer novo segmento criado pelo Master         │
  └──────────────────────────────────────────────────────────┘

  ⚠ Aviso: mudar o segmento afeta vocabulário, benchmarks e
    funil de TODAS as campanhas deste cliente.

  ⚠ IMPLEMENTAÇÃO: ZERO valores hardcoded. Lista vem do banco.
    Adicionar segmento via Master Platform = aparece aqui sem deploy.
```

### 0.6. Critérios de Aceite — FASE 0

```
FUNCIONAL
✅ Super-admin consegue editar vocabulário/funil/KPIs/taxonomia de segmento
✅ Super-admin consegue criar/editar/testar template de prompt
✅ Tenant admin consegue customizar benchmark próprio
✅ Tenant admin consegue customizar benchmark por cliente
✅ Cliente tem segment_id ao ser cadastrado
✅ Briefing matinal usa template do segmento do cliente da campanha
✅ Briefing usa vocabulário correto (imóvel/consulta/curso/carro)
✅ Regras do aiInsights usam thresholds do benchmark resolvido
✅ Adicionar novo segmento NÃO requer deploy

TÉCNICO
✅ Zero prompts hardcoded no código
✅ Cache em memória reduz queries de resolução
✅ Logs estruturados em cada invocação LLM
✅ Fallback rule-based mantido em todos os pontos
✅ Migrations idempotentes

UX
✅ Editor de prompt com syntax highlight para placeholders
✅ Preview com dados de exemplo
✅ Teste real do LLM antes de salvar
✅ Versionamento + diff visível
```

### 0.7. Riscos e Mitigações — FASE 0

| Risco | Mitigação |
|---|---|
| Migração de prompts hardcoded quebra briefings | Seed completo ANTES de refatorar código; testar lado-a-lado |
| Template novo quebra schema validation | Validação Zod + retry 1x + fallback rule-based |
| Performance: muitas queries de resolução | Cache 5min + invalidação por evento UPDATE |
| Cliente sem segment_id (legados) | Migration script: clientes sem segment_id herdam segmento do tenant |
| Override de cliente esquecido ao trocar segmento | Aviso forte na UI + opção de "limpar overrides" |

---

## FASE 1 — Multi-Network Foundation

**Duração estimada: 2 semanas | Pré-requisito: FASE 0**

> **▶ REVISÃO 2026-05-29 (ver seção 1.6):** esta fase ganha escopo aditivo — além dos
> "vasos" JSONB já criados, deve **expor no wizard** os campos cujas colunas já existem,
> criar os 3 "lares de dado" (page_id/instagram_actor_id/pixel_id em `credentials`,
> `system_segments.network_defaults`, atributo `website`) e aplicar os **hotfixes pré-fase**
> (bug do `page_id`, envio de `adset_schedule`, IDs de interesse reais). Detalhe em 1.6.10.

### 1.1. Objetivo

Refatorar o modelo para suportar múltiplas redes de anúncios (Meta, Google, LinkedIn,
TikTok) sem multiplicar colunas. Preparar terreno para implementações específicas
sem dívida técnica.

### 1.2. Mudanças no Banco

```sql
-- Catálogo de redes suportadas
CREATE TABLE public.ad_networks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(20) UNIQUE NOT NULL,    -- 'meta', 'google', 'linkedin', 'tiktok'
  name            VARCHAR(100) NOT NULL,
  icon            VARCHAR(50),
  color           VARCHAR(20),
  api_base_url    VARCHAR(255),
  is_active       BOOLEAN DEFAULT true,
  capabilities    JSONB NOT NULL DEFAULT '{}',   -- formatos, objetivos, targeting
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Credenciais por rede e por tenant
CREATE TABLE public.tenant_network_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  network_id      UUID NOT NULL REFERENCES public.ad_networks(id),
  credentials     JSONB NOT NULL,        -- estrutura varia por rede
                                          -- meta: {access_token, app_id, app_secret, expires_at}
                                          -- google: {refresh_token, developer_token, customer_id}
                                          -- linkedin: {access_token, account_id}
                                          -- tiktok: {access_token, advertiser_id}
  account_id      VARCHAR(100),           -- ID da conta de anúncios na rede
  display_name    VARCHAR(150),           -- nome amigável
  is_active       BOOLEAN DEFAULT true,
  expires_at      TIMESTAMP,
  last_validated  TIMESTAMP,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (tenant_id, network_id)
);

-- Adicionar network_id em Campaign
ALTER TABLE campanhasmarketingdigital."Campaign"
  ADD COLUMN network_id      UUID REFERENCES public.ad_networks(id),
  ADD COLUMN external_id     VARCHAR(100),  -- substitui metaCampaignId para novos registros
  ADD COLUMN network_metadata JSONB DEFAULT '{}';  -- payload específico da rede

-- Idem AdSet e Ad
ALTER TABLE campanhasmarketingdigital."AdSet"
  ADD COLUMN external_id     VARCHAR(100),
  ADD COLUMN network_metadata JSONB DEFAULT '{}';

ALTER TABLE campanhasmarketingdigital."Ad"
  ADD COLUMN external_id     VARCHAR(100),
  ADD COLUMN network_metadata JSONB DEFAULT '{}';

-- Backfill: campanhas existentes recebem network_id = 'meta'
UPDATE campanhasmarketingdigital."Campaign"
SET network_id = (SELECT id FROM public.ad_networks WHERE code = 'meta'),
    external_id = "metaCampaignId"
WHERE network_id IS NULL AND "metaCampaignId" IS NOT NULL;

-- Seed das redes
INSERT INTO public.ad_networks (code, name, icon, color, api_base_url, capabilities, sort_order)
VALUES
  ('meta',     'Meta Ads',     'meta',     '#1877f2', 'https://graph.facebook.com/v21.0',
   '{"formats":["IMAGE","VIDEO","CAROUSEL"],"objectives":["OUTCOME_TRAFFIC","OUTCOME_LEADS","OUTCOME_SALES","OUTCOME_AWARENESS","OUTCOME_ENGAGEMENT"],"targeting":["interests","lookalike","custom_audience","geo","demographics"]}'::jsonb, 1),
  ('google',   'Google Ads',   'google',   '#4285f4', 'https://googleads.googleapis.com',
   '{"formats":["TEXT","RESPONSIVE_SEARCH","SHOPPING","PMAX"],"objectives":["SALES","LEADS","WEBSITE_TRAFFIC","BRAND_AWARENESS"],"targeting":["keywords","audiences","topics","placements"]}'::jsonb, 2),
  ('linkedin', 'LinkedIn Ads', 'linkedin', '#0a66c2', 'https://api.linkedin.com/v2',
   '{"formats":["SINGLE_IMAGE","VIDEO","CAROUSEL","TEXT"],"objectives":["BRAND_AWARENESS","WEBSITE_VISITS","LEAD_GENERATION","JOB_APPLICANTS"],"targeting":["job_titles","companies","skills","seniority"]}'::jsonb, 3),
  ('tiktok',   'TikTok Ads',   'tiktok',   '#000000', 'https://business-api.tiktok.com/open_api/v1.3',
   '{"formats":["VIDEO","TOPVIEW","BRANDED_EFFECT"],"objectives":["REACH","TRAFFIC","VIDEO_VIEW","LEAD_GENERATION","CONVERSIONS"],"targeting":["hashtags","interests","similar_audience","geo"]}'::jsonb, 4);
```

### 1.3. Mudanças no Código

```
src/lib/marketing/networks/                (novo diretório)
  ├── types.ts                              → interface AdNetworkService
  ├── factory.ts                            → getNetworkService(code, credentials)
  ├── meta/
  │   ├── metaAdsService.ts                 → refatorado de marketing/services/metaAds.ts
  │   └── metaPayloadBuilder.ts             → constrói payloads Meta
  ├── google/                               (placeholder, FASE 11)
  ├── linkedin/                             (placeholder, FASE 11)
  └── tiktok/                               (placeholder, FASE 11)
```

**Interface:**

```typescript
export interface AdNetworkService {
  network: 'meta' | 'google' | 'linkedin' | 'tiktok';

  validateCredentials(): Promise<{ valid: boolean; error?: string }>;

  uploadCreative(creative: CreativeInput): Promise<UploadResult>;

  createCampaign(payload: CreateCampaignInput): Promise<{
    externalId: string;
    externalAdSetId?: string;
    externalAdId?: string;
    networkMetadata: Record<string, any>;
  }>;

  updateCampaignStatus(externalId: string, status: 'ACTIVE' | 'PAUSED'): Promise<void>;

  fetchInsights(externalId: string, dateRange: DateRange): Promise<NetworkInsight[]>;

  searchTargeting(type: string, query: string): Promise<TargetingResult[]>;
}
```

### 1.4. UI/UX

#### 1.4.1. Cadastro/edição de credenciais por rede

```
/admin/campanhas/configuracoes/redes

╔══════════════════════════════════════════════════════════════════╗
║  Configurações › Redes de Anúncios                               ║
║                                                                  ║
║  ┌─ Meta Ads ─────────────────────────────────────────┐         ║
║  │ Status: ✅ Conectado | Conta: ad_account_123        │         ║
║  │ Expira em: 60 dias  [Reconectar] [Desativar]        │         ║
║  └──────────────────────────────────────────────────────┘         ║
║                                                                  ║
║  ┌─ Google Ads ───────────────────────────────────────┐         ║
║  │ Status: ❌ Não conectado     [Conectar via OAuth]   │         ║
║  └──────────────────────────────────────────────────────┘         ║
║                                                                  ║
║  ┌─ LinkedIn Ads ─────────────────────────────────────┐         ║
║  │ Status: ❌ Não conectado     [Conectar via OAuth]   │         ║
║  └──────────────────────────────────────────────────────┘         ║
║                                                                  ║
║  ┌─ TikTok Ads ───────────────────────────────────────┐         ║
║  │ Status: ❌ Não conectado     [Conectar via OAuth]   │         ║
║  └──────────────────────────────────────────────────────┘         ║
╚══════════════════════════════════════════════════════════════════╝
```

#### 1.4.2. Wizard de Campanha — Step 0 (NOVO): Rede

```
╔══════════════════════════════════════════════════════════════════╗
║  Nova Campanha › Passo 1: Rede de Anúncios                       ║
║                                                                  ║
║  Em qual rede esta campanha será veiculada?                      ║
║                                                                  ║
║  ┌─────────────┐ ┌──────────────┐ ┌────────────┐ ┌─────────────┐ ║
║  │   META      │ │   GOOGLE     │ │ LINKEDIN   │ │   TIKTOK    │ ║
║  │  Conectado  │ │ Não conect.  │ │ Não conect.│ │ Não conect. │ ║
║  │   [✓]       │ │    [—]       │ │    [—]     │ │     [—]     │ ║
║  └─────────────┘ └──────────────┘ └────────────┘ └─────────────┘ ║
║                                                                  ║
║  💡 Cada rede tem objetivos, formatos e targeting próprios.     ║
║     Selecione uma rede para ver os steps específicos.            ║
║                                                                  ║
║  [Próximo →]                                                     ║
╚══════════════════════════════════════════════════════════════════╝
```

A partir da seleção, os steps subsequentes carregam dinamicamente o wizard
específico daquela rede. Por ora, apenas Meta funciona. As outras ficam
"placeholder" até FASE 11.

### 1.5. Critérios de Aceite — FASE 1

```
✅ Campanha existente continua funcionando (backfill OK)
✅ Nova campanha Meta usa network_id + external_id
✅ MetaAdsService implementa AdNetworkService interface
✅ Wizard pede rede no Step 0
✅ Sync de insights respeita network_id
✅ Tela de conexão de credenciais por rede funciona (Meta apenas)
✅ Outras redes aparecem como "Não conectado / em breve"
```

### 1.6. Riscos — FASE 1

| Risco | Mitigação |
|---|---|
| Backfill quebra campanhas Meta existentes | UPDATE em transação + verificação pós-update |
| metaCampaignId vs external_id conflito | Manter ambos por 90 dias; código usa external_id se preenchido |
| Credenciais Meta no formato antigo (tenants.meta_token) | Script de migração copia para tenant_network_credentials |

---

## FASE 2 — Marketing Initiatives

**Duração estimada: 2 semanas | Pré-requisito: FASE 1**

### 2.1. Objetivo

Habilitar o conceito de "Iniciativa de Marketing" — agrupador lógico de campanhas
que podem rodar em **múltiplas redes** com **budgets independentes**, mas com
**objetivo de negócio compartilhado**.

### 2.2. Mudanças no Banco

```sql
CREATE TABLE campanhasmarketingdigital."MarketingInitiative" (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  client_id           UUID REFERENCES public.clientes(uuid) ON DELETE SET NULL,

  name                VARCHAR(200) NOT NULL,
  description         TEXT,
  goal_description    TEXT,
  total_budget_planned DECIMAL(12,2),
  start_date          DATE,
  end_date            DATE,
  status              VARCHAR(20) DEFAULT 'PLANNED',
                      -- PLANNED, IN_PROGRESS, COMPLETED, CANCELLED

  primary_kpi         VARCHAR(40),       -- ex: 'leads', 'cost_per_visit'
  primary_kpi_target  DECIMAL,

  created_at          TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by          UUID
);

CREATE INDEX idx_initiative_tenant ON "MarketingInitiative"(tenant_id, status);
CREATE INDEX idx_initiative_client ON "MarketingInitiative"(client_id);

-- Adicionar initiative_id em Campaign (opcional)
ALTER TABLE campanhasmarketingdigital."Campaign"
  ADD COLUMN initiative_id UUID REFERENCES "MarketingInitiative"(id) ON DELETE SET NULL;

CREATE INDEX idx_campaign_initiative ON "Campaign"(initiative_id);
```

### 2.3. UI/UX

#### 2.3.1. Lista de Iniciativas

```
/admin/campanhas/iniciativas

╔══════════════════════════════════════════════════════════════════╗
║  Iniciativas de Marketing                          [+ Nova]      ║
║                                                                  ║
║  Filtros: [Cliente ▾] [Status ▾] [Período ▾]                    ║
║                                                                  ║
║  ┌────────────────────────────────────────────────────────────┐  ║
║  │ Nome                Cliente       Redes   Spend/Plano       │  ║
║  ├────────────────────────────────────────────────────────────┤  ║
║  │ Lançamento Aurora   Imob.Cardoso  3 redes  R$11.3k/R$15k    │  ║
║  │ EM_PROGRESSO        152/200 leads (76%)              [Ver] │  ║
║  │                                                             │  ║
║  │ Sempre-On Cardoso   Imob.Cardoso  1 rede   R$4.2k/-         │  ║
║  │ EM_PROGRESSO        ...                              [Ver] │  ║
║  │                                                             │  ║
║  │ Black Friday Veloz  Auto Center   2 redes  R$0/R$15k        │  ║
║  │ PLANEJADA          (inicia 25/11/2026)               [Ver] │  ║
║  └────────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════╝
```

#### 2.3.2. Visão Consolidada de uma Iniciativa

```
/admin/campanhas/iniciativas/[id]

╔══════════════════════════════════════════════════════════════════╗
║  Iniciativa › Lançamento Aurora — Maio 2026                      ║
║                                                                  ║
║  Cliente: Imobiliária Cardoso (🏠 Imobiliário)                   ║
║  Período: 01/05 → 31/05/2026  |  Status: EM_PROGRESSO            ║
║  Objetivo: 200 leads qualificados                                ║
║                                                                  ║
║  ┌──── Progresso Geral ─────────────────────────────────┐        ║
║  │  Budget:  R$ 11.300 / R$ 15.000 (75%)                │        ║
║  │  Leads:   152 / 200 (76%)                            │        ║
║  │  CPL:     R$ 74 (segmento meta: R$80-150 → ótimo)    │        ║
║  └──────────────────────────────────────────────────────┘        ║
║                                                                  ║
║  ┌──── Campanhas por Rede ──────────────────────────────┐        ║
║  │ 🔵 Meta     | R$6.2k/R$8k  | 98 leads | CPL R$63    │        ║
║  │ 🟡 Google   | R$3.1k/R$4k  | 41 leads | CPL R$75    │        ║
║  │ 🔷 LinkedIn | R$2.0k/R$3k  | 13 leads | CPL R$153   │        ║
║  └──────────────────────────────────────────────────────┘        ║
║                                                                  ║
║  ┌──── Briefing Consolidado AI ─────────────────────────┐        ║
║  │  (gerado por prompt 'initiative_consolidated_briefing')│       ║
║  │                                                       │        ║
║  │  Performance acima da meta. Meta e Google estão       │        ║
║  │  equilibrados em CPL. LinkedIn tem CPL alto mas       │        ║
║  │  esperado para B2B — leads devem ter ticket maior.    │        ║
║  │                                                       │        ║
║  │  Recomendação: aumentar 20% no budget Meta nos        │        ║
║  │  últimos 5 dias do período.                           │        ║
║  └──────────────────────────────────────────────────────┘        ║
╚══════════════════════════════════════════════════════════════════╝
```

#### 2.3.3. Wizard — Caminho "Criar via Iniciativa"

```
/admin/campanhas/iniciativas/nova

Step 1: Dados da Iniciativa
  Nome, descrição, cliente, datas, budget total, objetivo (qual KPI?)

Step 2: Redes
  ☑ Meta    ☑ Google   ☐ LinkedIn   ☐ TikTok
  Para cada rede selecionada: budget proposto

Step 3: Briefing Compartilhado
  Mensagem central, público-alvo conceitual, ângulo

Step 4-N: Wizard específico de cada rede selecionada
  (mas com briefing pré-preenchido vindo do Step 3)

Step Final: Revisão
  Visualiza N campanhas que serão criadas (uma por rede)
  [Criar Iniciativa + N Campanhas]
```

### 2.4. Novos Prompts (FASE 2)

```sql
INSERT INTO public.system_prompt_templates (code, segment_id, ...)
VALUES (
  'initiative_consolidated_briefing', NULL, 1, ...
  -- Recebe dados agregados de TODAS as campanhas da iniciativa
  -- Analisa: balanceamento entre redes, alocação de budget,
  -- qual rede está performando melhor, recomendação de ajuste
);
```

### 2.5. Critérios de Aceite — FASE 2

```
✅ Criar iniciativa standalone (sem campanhas inicialmente)
✅ Vincular campanhas existentes a iniciativa
✅ Criar iniciativa + N campanhas em um único wizard
✅ Visão consolidada mostra agregados corretos
✅ Briefing consolidado é gerado via LLM com prompt específico
✅ Status da iniciativa atualiza automaticamente baseado em datas
✅ Campanhas continuam funcionando sem iniciativa (opcional)
```

---

## FASE 3 — Wasted Spend Quantification

**Duração estimada: 1-2 semanas | Pré-requisito: FASE 0**

### 3.1. Objetivo

Calcular e tornar **visível** o desperdício de budget — argumento comercial direto
("R$ 1.247 perdidos este mês"). **Não requer schema novo**, apenas serviço e UI.

### 3.2. Categorias Calculadas

```
ZERO_LEADS_SPEND    → spend em campanhas com 0 leads em > 7 dias
HIGH_CPL_SPEND      → spend com CPL acima do limiar crítico do benchmark
FATIGUED_CONTINUE   → spend em campanhas com freq > limiar
LOW_HOOK_VIDEO      → (após FASE 5) spend em vídeo com hook rate < 10%
LEARNING_LIMITED    → spend em ad set que nunca sai de aprendizado
TRACKING_BROKEN     → (após FASE 8) spend quando tracking estava off
```

### 3.3. Novo Serviço

```typescript
// src/lib/marketing/services/wastedSpendService.ts

export interface WastedSpendReport {
  tenantId: string;
  clientId?: string;
  period: { start: Date; end: Date };
  totalWasted: number;
  byCategory: {
    [category: string]: {
      amount: number;
      campaigns: { id: string; name: string; wasted: number }[];
      explanation: string;
    };
  };
  recoveryPlan: string[];
}

export async function calculateWastedSpend(
  tenantId: string,
  clientId?: string,
  periodDays = 30
): Promise<WastedSpendReport>;
```

### 3.4. Novo Prompt

```sql
INSERT INTO system_prompt_templates (code, ...)
VALUES (
  'wasted_spend_explanation', NULL, 1, ...
  -- Recebe report rule-based; gera narrativa executiva
  -- "R$ 1.247 desperdiçados em campanhas que..."
  -- Sugere plano de recuperação concreto
);
```

### 3.5. UI

#### 3.5.1. Widget no Dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│  💸 Wasted Spend (últimos 30 dias)                               │
│                                                                  │
│  R$ 1.247,00                                                     │
│  ├── R$ 540 em campanhas sem leads (Aurora, Solar)               │
│  ├── R$ 480 em CPL acima do limiar (Boa Vista BOF)               │
│  └── R$ 227 em fadiga não atuada (Edifício Marina)               │
│                                                                  │
│  [📋 Ver Plano de Recuperação]    [🔍 Detalhamento]               │
└──────────────────────────────────────────────────────────────────┘
```

#### 3.5.2. Página de Detalhamento

```
/admin/campanhas/desperdicio

╔══════════════════════════════════════════════════════════════════╗
║  Wasted Spend  ›  Detalhamento                                   ║
║                                                                  ║
║  Período: [30d ▾]  Cliente: [Todos ▾]                            ║
║                                                                  ║
║  Total perdido: R$ 1.247                                          ║
║  Recuperável imediatamente (com ação): R$ 1.020                   ║
║                                                                  ║
║  ─── Por Categoria ───                                            ║
║                                                                  ║
║  🔴 Sem leads (R$ 540)                                            ║
║     Lançamento Aurora    R$ 480 em 14 dias sem 1 lead             ║
║     Edifício Solar       R$ 60 em 8 dias                          ║
║     [Ações: Pausar Aurora] [Pausar Solar]                         ║
║                                                                  ║
║  🟡 CPL alto (R$ 480)                                             ║
║     Boa Vista BOF        CPL R$ 67 (limiar: R$ 40)               ║
║     [Ações: Ver detalhe] [Solicitar análise IA]                  ║
║                                                                  ║
║  🟠 Fadiga ignorada (R$ 227)                                      ║
║     Marina                Freq 4.8x sem renovação criativo        ║
║     [Ações: Pausar e renovar]                                    ║
║                                                                  ║
║  ─── Narrativa IA ───                                             ║
║  (geradas via prompt 'wasted_spend_explanation')                  ║
║  "Você está perdendo R$ 1.247 principalmente em..."               ║
╚══════════════════════════════════════════════════════════════════╝
```

### 3.6. Critérios de Aceite — FASE 3

```
✅ Cálculo de wasted spend funciona para qualquer tenant
✅ Filtros por cliente e período funcionam
✅ Widget no dashboard exibe valor total e top 3 categorias
✅ Página de detalhamento permite ações diretas
✅ Narrativa IA explica o desperdício em linguagem executiva
✅ Cliente vê o cálculo usando benchmarks específicos do seu segmento
```

---

## FASE 4 — Campaign State Machine

**Duração estimada: 2 semanas | Pré-requisito: FASE 0**

### 4.1. Objetivo

Migrar status binário (ACTIVE/PAUSED) para **8 estados** com transições
controladas. Permite decisões contextualizadas pelo agente e visibilidade do
ciclo de vida.

### 4.2. Estados e Transições

```
DRAFT → READY → LEARNING → STABLE → SCALING / FATIGUED / PAUSED → KILLED
```

(Detalhamento completo do diagrama no documento `ANALISE_ADOCAO_AI_ADS_AUDITOR.md` §3.1.3.)

### 4.3. Mudanças no Banco

```sql
ALTER TABLE campanhasmarketingdigital."Campaign"
  ADD COLUMN lifecycle_status      VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN lifecycle_changed_at  TIMESTAMP DEFAULT NOW(),
  ADD COLUMN learning_started_at   TIMESTAMP,
  ADD COLUMN stable_since          TIMESTAMP;

CREATE INDEX idx_campaign_lifecycle ON "Campaign"(lifecycle_status, tenant_id);

-- Backfill: existing campaigns
UPDATE "Campaign" SET lifecycle_status = CASE
  WHEN status = 'ACTIVE'  THEN 'STABLE'
  WHEN status = 'PAUSED'  THEN 'PAUSED'
  ELSE 'DRAFT'
END;

CREATE TABLE campanhasmarketingdigital."CampaignLifecycleEvent" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES "Campaign"(id) ON DELETE CASCADE,
  tenant_id       UUID,
  from_status     VARCHAR(20),
  to_status       VARCHAR(20) NOT NULL,
  trigger_source  VARCHAR(20) NOT NULL,    -- AGENT, MANUAL, SYNC, CRON
  reason          TEXT,
  metrics_snapshot JSONB,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lifecycle_event ON "CampaignLifecycleEvent"(campaign_id, created_at DESC);
```

### 4.4. Novo Serviço

```typescript
// src/lib/marketing/services/campaignStateMachine.ts
export type LifecycleStatus = 'DRAFT' | 'READY' | 'LEARNING' | 'STABLE'
                            | 'SCALING' | 'FATIGUED' | 'PAUSED' | 'KILLED';

export const VALID_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = { ... };

export async function transitionCampaign(
  campaignId: string, toStatus: LifecycleStatus,
  source, reason, snapshot?
): Promise<void>;

export async function inferLifecycleStatus(campaignId: string): Promise<LifecycleStatus>;
```

### 4.5. Integração com Agente

Atualizar `agentDecisor.ts`: ao decidir PAUSE/SCALE, chamar `transitionCampaign()`.
Atualizar `agentMonitor.syncMetrics()`: após sync, rodar `inferLifecycleStatus()` em todas as campanhas ACTIVE.

### 4.6. UI

#### Dashboard — Campaign Card com Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│  Lançamento Aurora                                  [⋯]          │
│  🔴 FATIGUED desde 23/05 (2 dias)                                │
│                                                                  │
│  Histórico:                                                      │
│  • DRAFT → READY (15/04, manual)                                │
│  • READY → LEARNING (15/04, manual)                              │
│  • LEARNING → STABLE (21/04, agente: "50+ conversões em 7d")    │
│  • STABLE → FATIGUED (23/05, agente: "freq=4.2x, CTR caiu 41%") │
│                                                                  │
│  Spend: R$ 1.247 (últ 7 dias)                                   │
│  Status sugerido pelo agente: PAUSAR e renovar criativo          │
│  [Aprovar pausa] [Manter rodando] [Ver detalhes]                 │
└──────────────────────────────────────────────────────────────────┘
```

### 4.7. Critérios de Aceite — FASE 4

```
✅ Todas as campanhas existentes têm lifecycle_status válido (backfill)
✅ Agente detecta FATIGUED automaticamente após sync
✅ Histórico de transições é persistido
✅ Dashboard mostra status com histórico expansível
✅ Transição inválida é rejeitada (ex: DRAFT → SCALING direto)
✅ Manual override por usuário admin é permitido com aviso
```

---

## FASE 5 — Video Metrics + Hook Rate

**Duração estimada: 1 semana | Pré-requisito: FASE 0**

> **▶ REVISÃO 2026-05-29 (ver seção 1.6):** esta fase passa a ser **"Video + Conversão/ROI
> Metrics"**. Além das métricas de vídeo, estende `Insight` para capturar os sinais de ROI
> (leads, cost_per_lead, roas, purchase_value, quality/engagement/conversion rankings,
> link_clicks, landing_page_views, action_breakdowns) — guardados crus em
> `Insight.breakdowns` e promovidos a colunas sob demanda. Detalhe em 1.6.10.

### 5.1. Objetivo

Capturar métricas de vídeo (não capturadas hoje) e adicionar regra "Hook Rate"
ao `aiInsights.ts`.

### 5.2. Mudanças no Banco

```sql
ALTER TABLE campanhasmarketingdigital."Insight"
  ADD COLUMN video_views_3s      INTEGER DEFAULT 0,
  ADD COLUMN video_views_15s     INTEGER DEFAULT 0,
  ADD COLUMN video_views_25_pct  INTEGER DEFAULT 0,
  ADD COLUMN video_views_50_pct  INTEGER DEFAULT 0,
  ADD COLUMN video_views_75_pct  INTEGER DEFAULT 0,
  ADD COLUMN video_views_100_pct INTEGER DEFAULT 0,
  ADD COLUMN thruplay_views      INTEGER DEFAULT 0;
```

### 5.3. Mudanças no Código

```
src/lib/marketing/networks/meta/metaAdsService.ts
  ▶ fetchInsights() inclui campos de vídeo:
    fields: 'impressions,reach,clicks,spend,cpc,cpm,ctr,actions,frequency,' +
            'video_play_actions,video_p25_watched_actions,...'

src/lib/marketing/services/agentMonitor.ts
  ▶ syncMetrics() persiste novos campos

src/lib/marketing/services/aiInsights.ts
  ▶ Nova regra: video_hook_weak
    if format='video' && hookRate < benchmark.critical_below
    && daysRunning >= 3
    → type: 'PAUSE', confidence: 0.85
```

### 5.4. Novos Benchmarks por Segmento

```sql
INSERT INTO system_benchmarks (segment_id, metric_code, ...)
VALUES
  (real_estate, 'hook_rate', 10, 15, 25, 50, NULL, NULL, false, 'percent'),
  (health,      'hook_rate', 12, 18, 28, 55, NULL, NULL, false, 'percent'),
  ...;
```

### 5.5. UI

Dashboard — novo KPI "Hook Rate" (visível apenas quando há vídeos):

```
[Spend][Impr][Cliques][CTR][CPC][CPM][CPL][Hook Rate][Frequência]
                                              ▲ NOVO
```

Cards de insights de vídeo:

```
🔴 Hook Fraco | Lançamento Aurora | Vídeo "Família"
   Apenas 8% das pessoas assistiram 3+ segundos.
   Hook não está prendendo atenção.
   Recomendação: trocar primeiros 3 segundos do vídeo.
   Confiança: 85%
```

### 5.6. Critérios de Aceite — FASE 5

```
✅ Sync Meta traz métricas de vídeo
✅ Hook rate calculado corretamente (video_views_3s / impressions)
✅ Nova regra dispara quando hook < limiar do segmento
✅ Dashboard mostra Hook Rate quando há vídeos
✅ Benchmarks de hook_rate cadastrados para todos os segmentos
```

---

## FASE 6 — Creative Intelligence Layer

**Duração estimada: 4-5 semanas | Pré-requisito: FASES 0 + 5**

### 6.1. Objetivo

Analisar **conteúdo** dos criativos (imagem/vídeo/texto) via Vision LLM e
correlacionar com performance. **Maior diferencial competitivo do produto.**

### 6.2. Mudanças no Banco

```sql
CREATE TABLE campanhasmarketingdigital."CreativeAnalysis" (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id                 UUID REFERENCES "Ad"(id) ON DELETE CASCADE,
  creative_source_path  TEXT,
  format                VARCHAR(20),

  -- Estrutura
  has_people            BOOLEAN,
  has_property          BOOLEAN,
  has_text_overlay      BOOLEAN,
  is_ugc_style          BOOLEAN,
  is_corporate_style    BOOLEAN,

  -- Narrativa (LLM)
  hook_type             VARCHAR(30),
  emotional_tone        VARCHAR(30),
  angle                 VARCHAR(50),
  cta_style             VARCHAR(20),

  -- Copy
  body_word_count       INTEGER,
  headline_word_count   INTEGER,
  has_emoji             BOOLEAN,
  has_price             BOOLEAN,
  has_urgency_words     BOOLEAN,

  -- Meta
  analyzed_at           TIMESTAMP DEFAULT NOW(),
  llm_model_used        VARCHAR(50),
  llm_confidence        DECIMAL(3,2),
  raw_analysis          JSONB,
  tenant_id             UUID
);

CREATE INDEX idx_creative_ad ON "CreativeAnalysis"(ad_id);
CREATE INDEX idx_creative_pattern ON "CreativeAnalysis"(hook_type, is_ugc_style, format);

-- View que correlaciona padrão × performance
CREATE OR REPLACE VIEW campanhasmarketingdigital.vw_creative_patterns AS
SELECT
  ca.tenant_id,
  ca.hook_type,
  ca.is_ugc_style,
  ca.angle,
  ca.format,
  COUNT(DISTINCT ad.id) as ads_count,
  AVG(i.ctr)   as avg_ctr,
  AVG(i.cpc)   as avg_cpc,
  SUM(i.spend) as total_spend,
  (SELECT COUNT(*) FROM "Lead" l JOIN "Ad" a ON a.id = l."adId"
   WHERE a.id IN (SELECT id FROM "Ad" WHERE id = ca.ad_id)) as leads
FROM "CreativeAnalysis" ca
JOIN "Ad" ad ON ad.id = ca.ad_id
JOIN "AdSet" ads ON ads.id = ad."adSetId"
JOIN "Insight" i ON i."campaignId" = ads."campaignId"
GROUP BY ca.tenant_id, ca.hook_type, ca.is_ugc_style, ca.angle, ca.format
HAVING COUNT(DISTINCT ad.id) >= 2;
```

### 6.3. Novos Prompts

```sql
INSERT INTO system_prompt_templates (code, segment_id, ...)
VALUES
  ('creative_analysis_vision', NULL, 1, ...),
   -- Vision LLM: descreve imagem/frame, classifica estrutura
  ('creative_analysis_copy', NULL, 1, ...),
   -- Text LLM: analisa body, headline
  ('creative_concept_generator', NULL, 1, ...);
   -- Recebe padrões vencedores, gera 5 conceitos novos
```

Para cada segmento (real_estate, health, etc), criar **override** do
`creative_concept_generator` com vocabulário e ângulos do segmento.

### 6.4. Processo Assíncrono

```
Novo criativo é cadastrado/upload
  → enfileira job "analyze_creative"
  → worker chama creative_analysis_vision (claude vision)
  → worker chama creative_analysis_copy
  → consolida e salva em CreativeAnalysis
  → invalida cache de vw_creative_patterns
```

### 6.5. UI

#### 6.5.1. Galeria de Criativos com Tags

```
/admin/campanhas/criativos

Cada criativo agora exibe tags de classificação:
  [UGC] [Hook: urgência] [Ângulo: investimento] [Pessoa no frame]

Filtros por:
  Hook type | Ângulo | Formato | Estilo (UGC/Corporate)
```

#### 6.5.2. Página "Padrões Vencedores"

```
/admin/campanhas/criativos/padroes

╔══════════════════════════════════════════════════════════════════╗
║  Padrões Vencedores  •  Cliente: Imob. Cardoso (🏠)              ║
║                                                                  ║
║  Padrões com 2+ criativos rodados, ordenados por CPL ascendente: ║
║                                                                  ║
║  ┌────────────────────────────────────────────────────────────┐  ║
║  │ 🥇 UGC vertical + Hook urgência + Pessoa no frame           │  ║
║  │    8 criativos | CTR médio 2.8% | CPL médio R$ 18           │  ║
║  │    Exemplos: [thumb] [thumb] [thumb]                        │  ║
║  │    [📋 Gerar conceitos similares com IA]                    │  ║
║  └────────────────────────────────────────────────────────────┘  ║
║                                                                  ║
║  ┌────────────────────────────────────────────────────────────┐  ║
║  │ 🥈 Carrossel + Ângulo investimento                          │  ║
║  │    4 criativos | CTR médio 1.9% | CPL médio R$ 28           │  ║
║  └────────────────────────────────────────────────────────────┘  ║
║                                                                  ║
║  ┌────────────────────────────────────────────────────────────┐  ║
║  │ ❌ Static corporativo (perdedor)                             │  ║
║  │    5 criativos | CTR médio 0.7% | CPL médio R$ 67           │  ║
║  │    💡 Recomendação: pausar todos                            │  ║
║  └────────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════╝
```

#### 6.5.3. Gerador de Conceitos

```
Modal aberto ao clicar "Gerar conceitos similares":

┌─────────────────────────────────────────────────────────────┐
│  IA gerou 5 conceitos baseados no padrão vencedor           │
│                                                             │
│  1. [Vídeo 15s] Casal jovem visitando apto                 │
│     Hook: "Vai sair do aluguel esse ano?"                  │
│     CTA: "Conheça nosso lançamento"                        │
│                                                             │
│  2. [Vídeo 15s] Mãe arrumando quarto da filha              │
│     Hook: "Sua filha cresceu, e o espaço?"                 │
│     ...                                                    │
│                                                             │
│  [Salvar todos como rascunho] [Selecionar quais salvar]    │
└─────────────────────────────────────────────────────────────┘
```

### 6.6. Critérios de Aceite — FASE 6

```
✅ Criativos novos são analisados automaticamente
✅ Análise leva < 30 segundos por criativo
✅ Tags aparecem na galeria
✅ Página de padrões mostra correlações reais
✅ Gerador de conceitos retorna sugestões coerentes com segmento
✅ Custo de LLM < $1/mês por tenant
✅ Análise é cacheada (não re-roda em criativos já analisados)
```

---

## FASE 7 — Funnel Stage Classification

**Duração estimada: 1 semana | Pré-requisito: FASE 0**

### 7.1. Objetivo

Classificar cada campanha em estágio do funil (TOF/MOF/BOF/+) baseado no funil
definido no segmento. Habilita diagnóstico de gargalo.

### 7.2. Mudanças no Banco

```sql
ALTER TABLE campanhasmarketingdigital."Campaign"
  ADD COLUMN funnel_stage VARCHAR(20) DEFAULT 'TOF';

CREATE INDEX idx_campaign_funnel ON "Campaign"(funnel_stage, tenant_id);

-- Auto-classificação inicial baseada em objective
UPDATE "Campaign" SET funnel_stage = CASE
  WHEN objective IN ('OUTCOME_AWARENESS','OUTCOME_TRAFFIC') THEN 'TOF'
  WHEN objective IN ('OUTCOME_ENGAGEMENT') THEN 'MOF'
  WHEN objective IN ('OUTCOME_LEADS','OUTCOME_SALES') THEN 'BOF'
  ELSE 'TOF'
END
WHERE funnel_stage IS NULL OR funnel_stage = 'TOF';
```

### 7.3. Novo Endpoint + UI

```
GET /api/admin/campanhas/dashboard/funnel?clientId=X

Retorna:
{
  stages: [
    { code: 'TOF', spend: 800, impressions: 50000, leads: 8 },
    { code: 'MOF', spend: 300, impressions: 12000, leads: 12 },
    { code: 'BOF', spend: 200, impressions: 4000, leads: 24 },
    { code: 'VISIT', spend: 0, count: 18, cost: 0 },
    ...
  ],
  health: {
    tof_to_mof: 0.04,
    mof_to_bof: 0.13,
    bof_to_visit: 0.75,
    visit_to_deal: 0.20,
    diagnosis: "(via LLM funnel_diagnosis prompt)"
  }
}
```

Dashboard widget novo: visualização do funil com taxas entre estágios.

### 7.4. Critérios de Aceite — FASE 7

```
✅ Auto-classificação inicial OK (backfill)
✅ Override manual por gestor disponível
✅ Funil exibido respeitando definição do segmento do cliente
✅ Diagnóstico LLM identifica gargalos
```

---

## FASE 8 — Tracking Health Monitor

**Duração estimada: 1-2 semanas | Pré-requisito: FASE 0**

### 8.1. Objetivo

Monitorar saúde do tracking automaticamente (cron diário). Alertar quando há
problemas que poderiam estar desperdiçando budget invisivelmente.

### 8.2. Mudanças no Banco

```sql
CREATE TABLE campanhasmarketingdigital."TrackingHealthCheck" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  client_id       UUID,
  overall_score   INTEGER NOT NULL,  -- 0-100
  checks          JSONB NOT NULL,
  issues          JSONB NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tracking_health ON "TrackingHealthCheck"(tenant_id, created_at DESC);
```

### 8.3. Checagens executadas (rule-based)

```
- Endpoint de tracking responde 200?
- Leads sendo registrados nas últimas 24h?
- Taxa de leads duplicados (mesmo IP em <30s)?
- Pixel Meta configurado no tenant?
- Conversion API ativa?
- Latência média de captura de lead
- Leads órfãos (sem campaignId)?
```

### 8.4. UI

Widget no Dashboard:
```
🩺 Tracking Health: 87/100  ⚠ 1 alerta
   • 12% de leads sem campaignId atribuído (últimas 24h)
   [Ver detalhes]
```

Página de detalhes mostra histórico do score e cada check.

---

## FASE 9 — Audit Report Estruturado

**Duração estimada: 2 semanas | Pré-requisito: FASES 3 + 7**

### 9.1. Objetivo

Relatório mensal estruturado com health scorecard, top 3 problemas, top 3
oportunidades, wasted spend recuperado, e plano de ação semanal.

### 9.2. Mudanças no Banco

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
  UNIQUE (tenant_id, client_id, period_start, period_end)
);
```

### 9.3. Novos Prompts

```sql
INSERT INTO system_prompt_templates (code, ...)
VALUES
  ('audit_report_monthly', NULL, 1, ...),   -- relatório mensal
  ('audit_report_weekly', NULL, 1, ...);    -- versão semanal
```

### 9.4. UI

Página `/admin/campanhas/auditoria` lista relatórios + abertura de cada relatório
em layout estruturado (scorecard, gráficos, plano semanal).

### 9.5. Cron

```
1º dia do mês 09h00 → gera audit_report_monthly para cada cliente ativo
Domingo 18h → gera audit_report_weekly se solicitado
```

---

## FASE 10 — Portfolio Dashboard + Cross-Pollination

**Duração estimada: 3 semanas | Pré-requisito: FASES 0, 3, 6**

### 10.1. Objetivo

Visão consolidada do tenant sobre TODOS os seus clientes. **Polinização cruzada**
de padrões vencedores entre clientes (mesmo de segmentos diferentes).

### 10.2. Novas Rotas

```
/admin/campanhas/portfolio
/admin/campanhas/portfolio/cross-insights
```

### 10.3. UI — Portfolio Operacional

```
╔══════════════════════════════════════════════════════════════════╗
║  Portfolio  ›  Visão Geral dos Clientes                          ║
║                                                                  ║
║  Filtros: [Segmento ▾] [Período ▾]                              ║
║                                                                  ║
║  ┌──────────────────────────────────────────────────────────┐    ║
║  │ Cliente            Seg  Spend  Leads CPL  vs Meta  Ações  │    ║
║  ├──────────────────────────────────────────────────────────┤    ║
║  │ Imob. Cardoso      🏠   R$8k   240   R$33  🟢 saudável   │    ║
║  │ Imob. Premium Luxo 🏠   R$15k  42    R$357 🟡 atenção    │    ║
║  │ Clínica Dental     🏥   R$3k   85    R$35  🟢 saudável   │    ║
║  │ Auto Center Veloz  🚗   R$5k   63    R$79  🔴 crítico    │    ║
║  └──────────────────────────────────────────────────────────┘    ║
║                                                                  ║
║  ⚠ Status "vs Meta" usa benchmark de CADA cliente.              ║
║     NÃO compare CPL absoluto entre segmentos.                    ║
║                                                                  ║
║  [Ver Insights Cruzados →]                                       ║
╚══════════════════════════════════════════════════════════════════╝
```

### 10.4. UI — Polinização Cruzada

(Detalhamento completo no documento `BENEFICIOS_FINANCEIROS_E_LEAD_QUALIDADE.md`
ou na resposta anterior — insights universais transferíveis entre clientes.)

### 10.5. Novo Prompt

```sql
INSERT INTO system_prompt_templates (code, ...)
VALUES (
  'cross_pollination_insights', NULL, 1, ...
  -- Recebe agregados de TODOS os clientes do tenant
  -- Identifica padrões transferíveis entre segmentos
);
```

---

## FASE 11 — Implementações de Outras Redes

**Duração: varia por rede | Pré-requisito: FASE 1**

### 11.1. Ordem Recomendada

```
1. TikTok      (2-3 sem) — mais similar ao Meta, ramp-up rápido
2. Google Ads  (3-6 sem) — alto valor, complexo (Search + Shopping + PMax)
3. LinkedIn    (2-4 sem) — B2B nicho, validar demanda primeiro
```

### 11.2. Por Rede

Cada implementação inclui:
- Service implementando `AdNetworkService`
- Wizard steps específicos da rede
- Mapping de objetivos, formatos, targeting
- Sync de insights com métricas específicas da rede
- Benchmarks específicos da rede (em `system_benchmarks` com diferenciação)
- Vocabulário e taxonomia possivelmente ampliados nos segmentos

(Cada rede merece documento próprio com escopo detalhado.)

---

## 16. Fluxos End-to-End

### 16.1. Fluxo: Criar nova campanha Meta para cliente

```
1. Usuário (tenant admin) acessa /admin/campanhas/criativos
2. Seleciona imagens → clica "Lançar campanha"
3. CampaignWizard abre
4. Step 0 (NOVO, FASE 1): seleciona rede [Meta]
5. Step 1 (existente): tipo de criativo
6. Step 2: texto + CTA
7. Step 3: público
8. Step 4: orçamento
9. Step 5: objetivo
10. Step 6: cliente (ou "próprio do tenant")
    → ao selecionar cliente, sistema carrega segmento do cliente
11. Step 7: revisão (mostra segmento ativo + benchmark resolvido)
12. POST /api/admin/campanhas/campaigns
    Backend:
    a. Valida clientId pertence ao tenant
    b. Resolve segment_id (cliente ou tenant)
    c. Cria Campaign com lifecycle_status='DRAFT', network_id=meta
    d. Cria AdSet, Ad
    e. Se credentials Meta OK → publica no Meta → transitiona para 'READY'
13. Próximo cron sync (FASE 4): pode transicionar para LEARNING
```

### 16.2. Fluxo: Briefing matinal para um cliente

```
Cron 8h → para cada tenant ativo → para cada cliente ativo do tenant:
  1. resolveSegmentForClient(clientId) → segment.id
  2. gatherBriefingContext(periodDays=7, tenantId, clientId)
     - busca campanhas com client_id, calcula totais
     - resolve benchmarks usando cliente (4 camadas)
     - chama generateAiInsights() com thresholds do cliente
  3. llmInvoker.invoke({
       code: 'briefing_morning',
       ctx: { tenantId, clientId, segmentId },
       vars: { expert_persona, vocabulary, context, ... }
     })
     - promptResolver busca template:
       1º segment-specific, 2º global
     - promptRenderer substitui placeholders
     - llmClient.complete() chama o LLM
     - validate response_schema
  4. persiste em StrategicBriefing (com snapshot do contexto)
  5. formata para WhatsApp + envia via notifyWhatsApp
```

### 16.3. Fluxo: Agente decide PAUSE com causa-raiz

```
Cron 6h → syncMetrics() → para cada tenant → runDecisor(tenantId):
  1. generateAiInsights(tenantId)
     - busca campanhas
     - para cada uma: resolve benchmark do cliente (ou tenant se próprio)
     - avalia 6 regras com thresholds resolvidos
  2. filtra confidence >= 0.85
  3. para cada insight:
     a. dedup: ação igual nas últimas 24h? skip
     b. enrichWithClaude → llmInvoker.invoke({code:'agent_enrichment',...})
     c. cria AgentAction
     d. se PAUSE (defensivo):
        - transitionCampaign(campaignId, 'FATIGUED', source='AGENT', reason)
        - executeAction (pausa no Meta API)
        - transitionCampaign(campaignId, 'PAUSED')
        - notifyExecuted (WhatsApp + Slack)
     e. se SCALE (ofensivo):
        - notifyApprovalRequired (envia link no WhatsApp)
        - aguarda /api/agent/approve/[id]
```

### 16.4. Fluxo: Tenant customiza benchmark de CPL para cliente luxo

```
1. Tenant admin acessa /admin/campanhas/inteligencia/clientes/[clientId]
2. Vê tabela de benchmarks: CPL padrão Imobiliário = R$10-25, Crít >R$60
3. Clica "Customizar" em CPL
4. Modal: input [target_min=80] [target_max=150] [warning_above=200] [critical_above=300]
5. Notas: "Cliente luxo, leads valem mais"
6. POST /api/admin/intelligence/clients/[clientId]/benchmarks
   → insere em client_benchmark_overrides
7. Invalida cache benchmarkResolver
8. Próxima execução do agente para esse cliente:
   - resolve CPL → encontra override → usa R$80-150 como meta
   - Campanha com CPL R$ 90 (antes seria 'crítica' pelo padrão R$60)
     agora é 'saudável'
   - Briefing reflete o ajuste corretamente
```

---

## 17. Catálogo Completo de UIs

```
┌────────────────────────────────────────────────────────────────────┐
│ ÁREA: MASTER PLATFORM (super-admin)                                │
├────────────────────────────────────────────────────────────────────┤
│ /admin/master/segmentos                    Lista de segmentos      │
│ /admin/master/segmentos/[id]               Editor com 7 abas       │
│   Aba: Geral, Vocab, Funil, Taxonomia, KPIs, Prompts, Benchmarks   │
│ /admin/master/prompts-globais              Templates fallback      │
│ /admin/master/ia-plataforma                IA global de campanhas  │
│   (rev. 2026-05-28: provider/modelo/chave únicos — linha global)   │
├────────────────────────────────────────────────────────────────────┤
│ ÁREA: TENANT ADMIN — Inteligência                                  │
├────────────────────────────────────────────────────────────────────┤
│ /admin/campanhas/inteligencia              Visão geral             │
│ /admin/campanhas/inteligencia/clientes     Lista clientes          │
│   /clientes/[id]/benchmarks                Editor benchmark cliente│
│ /admin/campanhas/configuracoes/redes       Credenciais por rede    │
├────────────────────────────────────────────────────────────────────┤
│ ÁREA: TENANT ADMIN — Operacional                                   │
├────────────────────────────────────────────────────────────────────┤
│ /admin/campanhas/dashboard                 Dashboard cliente único │
│ /admin/campanhas/portfolio                 Portfolio do tenant     │
│ /admin/campanhas/portfolio/cross-insights  Polinização cruzada     │
│ /admin/campanhas/iniciativas               Lista iniciativas       │
│ /admin/campanhas/iniciativas/[id]          Visão consolidada       │
│ /admin/campanhas/iniciativas/nova          Wizard multi-rede       │
│ /admin/campanhas/criativos                 Galeria + classificação │
│ /admin/campanhas/criativos/padroes         Padrões vencedores      │
│ /admin/campanhas/leads                     Leads WhatsApp          │
│ /admin/campanhas/desperdicio               Wasted spend detalhe    │
│ /admin/campanhas/auditoria                 Audit reports           │
└────────────────────────────────────────────────────────────────────┘
```

Total: **18 novas rotas/páginas** + evoluções nas 4 existentes.
(rev. 2026-05-28: +1 → `/admin/master/ia-plataforma`, config global de LLM de campanhas.)

---

## 18. Riscos Transversais e Mitigações

### 18.1. Risco: Quebra de funcionalidade existente

```
CAUSA: refatorações tocam código vivo (briefing, agent, etc).
MITIGAÇÃO:
  • Feature flag por funcionalidade
  • Rodar em paralelo (código antigo + novo) por 1 sprint
  • Comparar outputs lado-a-lado antes de descontinuar
  • Manter rollback SQL pronto para cada migration
```

### 18.2. Risco: Custo de LLM cresce descontroladamente

```
CONTEXTO (rev. 2026-05-28): o custo de LLM de campanhas agora é arcado pela
PLATAFORMA (chaves centralizadas), não mais por cada tenant. Logo, controlar
custo total passou a ser responsabilidade direta do operador da plataforma.
MITIGAÇÃO:
  • Cache de resoluções (5min TTL)
  • Custo por chamada logado em campo dedicado
  • Quota por tenant (alertar se > $X/mês) — agora protege o caixa da plataforma
  • Modelo único global: para cortar custo, o Master troca o modelo da linha global
    por um mais barato/grátis (qualityScore/isFree no LlmModel) — afeta todos de uma vez
  • Análises pesadas (Creative Intelligence) são one-shot por criativo
  • Briefing diário = 1 chamada por dia/cliente (~ $0.05 cada)
```

### 18.3. Risco: Confusão de UI entre Master e Tenant

```
MITIGAÇÃO:
  • Layouts visualmente distintos (cor diferente, badge "MASTER")
  • Permissões role-based duras (sistem_role_tags)
  • Menu separado para área Master (apenas users do segmento 'master')
  • Confirmação dupla em ações críticas (deletar template global, etc.)
```

### 18.4. Risco: Cliente esquece de configurar segmento

```
MITIGAÇÃO:
  • Validação obrigatória ao criar cliente
  • Default = 'generic' para clientes legados
  • Aviso no dashboard quando segmento = generic ("Defina o segmento
    para receber benchmarks específicos")
```

### 18.5. Risco: Override de benchmark com valores inconsistentes

```
EXEMPLO: target_min > target_max (digitação errada)
MITIGAÇÃO:
  • Validação cliente-side e server-side
  • Lint nas relações: critical_below < warning_below < target_min etc
  • Preview visual da escala (gráfico) antes de salvar
```

### 18.6. Risco: Performance do banco com 11 tabelas novas + views

```
MITIGAÇÃO:
  • Índices em colunas de filtro frequente
  • Materialized view em vw_creative_patterns (refresh diário)
  • EXPLAIN ANALYZE em queries chave antes de cada release
  • Particionamento de Insight (futuro, se crescer demais)
```

### 18.7. Risco: Migração quebra dados em produção

```
MITIGAÇÃO:
  • TODA migração é idempotente (IF NOT EXISTS, DEFAULT)
  • Backup automático antes de cada migration
  • Testar em staging com dump real de prod
  • Migrations rodam em transação quando possível
  • Janela de manutenção definida (sábado 23h)
```

---

## 19. Critérios Globais de Aceite

### 19.1. Por Fase

Cada fase tem critérios próprios (descritos nas seções acima). **Uma fase só é
considerada concluída quando 100% dos critérios passam.**

### 19.2. Globais (válidos em todas as fases)

```
ARQUITETURAIS
✅ Toda nova tabela tem tenant_id (quando aplicável) e índices
✅ Toda nova migração é idempotente
✅ Nenhuma DROP COLUMN em tabela com dados
✅ Resolvers usam cache para evitar queries repetidas

SEGURANÇA
✅ APIs Master só acessíveis a users do segmento 'master'
✅ APIs tenant respeitam tenant_id do JWT
✅ Nenhuma vazamento entre tenants (testes de isolamento)

PRODUTO
✅ Todo prompt LLM tem fallback rule-based
✅ Todo cálculo de benchmark logga qual nível resolveu (cliente/tenant/segmento/global)
✅ Toda mudança em prompt cria nova versão (não sobrescreve)

UX
✅ Layouts seguem o sistema atual (glass-card, primary color, etc)
✅ Mensagens de erro são acionáveis ("Faça X para resolver")
✅ Operações > 2s mostram loading state
✅ Operações destrutivas pedem confirmação dupla
```

---

## Apêndice A — Documentos Relacionados

```
docs/
├── PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md      (este documento)
├── ARQUITETURA_INTELIGENCIA_LLM_TRAFEGO_PAGO.md  (mapeamento LLM atual)
├── ANALISE_ADOCAO_AI_ADS_AUDITOR.md              (análise das ideias do AI Auditor)
├── FUNDACAO_MULTISEGMENT_E_PROMPT_MANAGEMENT.md  (raciocínio fundação)
├── PLANO_ACAO_MULTISEGMENT_PROMPT_MANAGEMENT.md  (UI/UX detalhada fundação)
└── BENEFICIOS_FINANCEIROS_E_LEAD_QUALIDADE.md    (business case)
```

---

## Apêndice B — Próximos Passos Imediatos

```
PASSO 1: Validação deste plano com você
  → Você lê o plano completo
  → Sinaliza ajustes necessários
  → Aprova a sequência das fases

PASSO 2: Início da FASE 0
  → SQL: criar arquivo prisma/migration-2026-XX-fundacao.sql
  → Code: criar /src/lib/intelligence/
  → Refatorar 3 pontos LLM (briefing, agent, test)
  → UIs Master: 7 abas de segmento
  → UIs Tenant: benchmarks por cliente

PASSO 3: Validação em ambiente real
  → Executar SQL em DEV
  → Testar resolução em paralelo (antigo vs novo)
  → Migrar 1 segmento (Imobiliário)
  → Validar com tenant real

PASSO 4: FASE 1 (multi-network)
  → Apenas depois que FASE 0 estiver 100% estável

... e assim sucessivamente.
```

---

*Documento mestre gerado em 25/05/2026.*
*Versão 1.0 — refletindo todas as decisões discutidas até esta data.*
*Versão 1.2 (2026-05-28) — Centralização do modelo LLM de Campanhas (ver seção 1.5).
 Modelo ÚNICO e global da plataforma (um provider/modelo/chave) guardado na linha global
 da tabela Settings (tenant_id IS NULL). SEM tabela nova, SEM coluna nova e SEM campo no
 CRUD de Tenants (a ideia inicial de tenants.llm_trafego_pago foi cancelada). Impacto
 retroativo nas FASES 0–3 documentado. Apenas planejamento — nenhuma alteração em código
 ou banco foi feita.*
*Versão 1.3 (2026-05-29) — Camada Operacional de Lançamento de Campanhas (ver seção 1.6,
 subseções 1.6.1–1.6.12). Define a fronteira automático↔manual em DOIS baldes (dado vindo
 das tabelas vs. campo informado na UI do wizard), a regra de alocação por 3 mecanismos
 (JSONB / atributo / UI), a resolução por campanha cliente→tenant (defaults NUNCA moram no
 tenant), o `system_segments.network_defaults` (curadoria 1x pelo Master, keyed por rede),
 os 3 "lares de dado" a criar (page/ig/pixel em credentials; network_defaults; atributo
 website), os hotfixes pré-fase (bug do page_id, adset_schedule não enviado, IDs de
 interesse falsos) e a higiene de regenerar o schema.marketing.prisma defasado. Mescla
 ADITIVA: FASE 1 expande, FASE 5 vira "Video + Conversão/ROI", FASE 11 só consome — sem
 fase nova e mantendo FASES 0–11 e histórico intactos. Apenas planejamento — nenhuma
 alteração em código ou banco foi feita.*
*Versão 1.3.1 (2026-05-29) — Acréscimo da subseção 1.6.13 (Fronteira do "on-the-fly"):
 veredito honesto de que NÃO há 100% de independência de código — ~85–90% de dinamismo nos
 campos de redes já integradas (field schema como dado + fallback de campo desconhecido),
 mas a tradução payload→API (adapter / mapCanonicalToNetwork versionado) é camada de código
 irredutível, atualizada junto com a mídia. Tabela do que é dado x código, nota sobre MCP e
 critérios de aceite da fronteira. Apenas planejamento.*
