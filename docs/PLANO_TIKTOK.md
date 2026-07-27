# PLANO DE IMPLEMENTAÇÃO — REDE TIKTOK + MOTOR DE REALOCAÇÃO CROSS-REDE

> **Documento:** v1.0 — 2026-07-27
> **Escopo:** implementação da rede TikTok Ads como 3ª rede de anúncio da plataforma, e o
> impacto **real** disso em todas as funcionalidades já construídas para Meta e Google.
> **Substitui:** a FASE 2 (§B1–B8) de `docs/PLANO_GOOGLE_TIKTOK.md`, que era um esboço de ~50
> linhas escrito antes do módulo amadurecer. Aquele esboço concluía "reuso alto, 0 tabela nova" —
> **esta auditoria de código mostra que essa conclusão está incorreta em 3 pontos críticos**
> (§2). O restante daquele documento (Fase 1 Google, governança) segue válido.
> **Método:** todo achado abaixo foi verificado lendo o código real em 2026-07-27, com
> `file:line` citado. Nada aqui é suposição sobre o que o sistema faz.

---

## 1. Princípio que governa este plano

A missão do módulo não é "ter mais uma rede". É **fazer o gestor gastar melhor**. Uma rede nova
só agrega valor se responder melhor a três perguntas que o gestor já faz hoje:

1. *Onde meu real rende mais lead?* → exige CPL comparável entre redes (já existe, §4)
2. *Onde estou queimando dinheiro?* → exige desperdício comparável entre redes (§7)
3. *Se eu tirar dinheiro daqui e puser ali, ganho quanto?* → **não existe hoje em nenhuma rede** (§8)

A pergunta 3 é o verdadeiro payoff do TikTok. Com 2 redes, realocar é uma decisão binária que o
gestor faz de cabeça. Com 3 redes e N campanhas por rede, o espaço de decisão explode
combinatoriamente e passa a exigir motor. **Por isso este plano trata o motor de realocação
(§8) como entrega de primeira classe, não como "nice to have" do TikTok.**

---

## 2. Auditoria: o que TikTok herda de graça, e o que quebra

### 2.1 Herda de graça (verificado no código, zero trabalho)

| Capacidade | Por que já funciona | Evidência |
|---|---|---|
| Contagem de leads agnóstica de rede | `getLeadEvents` resolve a rede por campanha e escolhe o método | `leadEvents.ts:36-50` |
| Filtro de rede no dashboard | Lê de `availableNetworks`, não é hardcoded | `dashboard/page.tsx:513-522` |
| Rótulo de rede no digest do WhatsApp | `NETWORK_TAG` já inclui `tiktok` | `agentNotificador.ts:313` |
| Rótulo de rede no filtro do dashboard | `NETWORK_LABELS` já inclui `tiktok` | `dashboard/page.tsx:46` |
| Registro da rede | Linha `tiktok` já existe e está ativa | `ad_networks` (`281f8349-…`) |
| Regras de IA base (PAUSE/SCALE/OPTIMIZE/DOWNSCALE) | Leem gasto/CTR/leads/CPL — existem em qualquer rede | `aiInsights.ts:134-254` |
| Métricas de vídeo (Hook Rate) | 7 colunas já existem desde a FASE 5 (Meta) | `schema.marketing.prisma` (Insight) |
| Ciclo de vida da campanha | `campaignStateMachine` é agnóstico | — |
| Camada de simulação | `factory.ts` já roteia fake por credencial sentinela | `factory.ts` (Trilha E) |

### 2.2 QUEBRA ou degrada — os 3 achados críticos

#### 🔴 ACHADO 1 — Benchmarks não têm dimensão de rede (risco estrutural, alto impacto)

`system_benchmarks` é keyed por `(segment_id, metric_key)` — **não há coluna de rede**
(`\d system_benchmarks`, confirmado). A cascata de resolução é
cliente → tenant → segmento → erro (`benchmarkResolver.ts:44-48`). Ou seja: `cpl_ideal = 35` do
segmento Imobiliário é aplicado **identicamente** a Meta, Google e TikTok.

Isso é tolerável com 2 redes porque Meta e Google, em performance de lead no Brasil, operam em
faixas de custo relativamente próximas. **Com TikTok deixa de ser tolerável:** TikTok tipicamente
entrega CTR e volume maiores com CPM menor, mas intenção mais fria — o CPL de um mesmo segmento
costuma sair numa faixa estruturalmente diferente. Julgar TikTok pelo `cpl_ideal` calibrado em
Meta produz um de dois erros, ambos graves:

- Se o benchmark está calibrado por Meta e TikTok é mais caro → TikTok é sistematicamente marcado
  `DOWNSCALE`/`ZERO_LEADS_SPEND` e morre antes de sair do aprendizado, **mesmo performando bem
  para o padrão TikTok**.
- Se for afrouxado para acomodar TikTok → Meta para de ser cobrado corretamente e desperdício
  real deixa de ser detectado.

**Este é exatamente o padrão de bug que este projeto já teve duas vezes** (Google marcado "0
leads" por usar a definição de lead do Meta — `leadEvents.ts:7-10`). A correção estrutural é a
mesma que funcionou lá: **tornar a dimensão explícita em vez de assumir**.

> **Consequência de plano:** benchmark por rede é **pré-requisito bloqueante** do TikTok, não um
> refinamento posterior. Ver §5.

#### 🔴 ACHADO 2 — Bug real de rotulagem no dashboard (TikTok apareceria como "Google Ads")

`CommandCenterView.tsx` monta o breakdown por rede dos 3 KPIs principais com um **ternário
binário**:

```
label: net === 'meta' ? 'Meta Ads' : 'Google Ads'
```

Em **3 lugares**: gasto (`:176`), leads (`:183`), CPL (`:191`).

Com TikTok no escopo, o gasto/leads/CPL do TikTok seriam renderizados na tela **com o rótulo
"Google Ads"**. Não é erro cosmético: é o card que responde à pergunta 1 do §1 — o gestor
tomaria decisão de realocação lendo o número do TikTok achando que é do Google.

O `page.tsx` já tem o mapa correto (`NETWORK_LABELS`, `:46`) — o componente simplesmente não o
usa. Correção trivial, risco alto se esquecida.

#### 🟠 ACHADO 3 — `REALLOCATE_BUDGET` existe como rótulo, mas é oco

O tipo de ação já aparece em 3 lugares:
- `agentDecisor.ts:35` — listado em `OFFENSIVE_TYPES` (exigiria aprovação humana)
- `agentNotificador.ts:230,239` — ícone 💰 e texto "Orçamento realocado"
- `aprovacoes/page.tsx:47,56` — rótulo e cor na fila de aprovação

**Mas nenhuma regra o gera e `executeAction` não tem branch para ele** (as branches são só
`PAUSE`, `DOWNSCALE`, `SCALE` — `agentDecisor.ts:262-343`). É uma casca pronta, nunca preenchida.

Isso é uma oportunidade: metade da infraestrutura de UI/notificação/aprovação da realocação
**já está construída e testada**. Ver §8.

### 2.3 Lacunas menores (trabalho conhecido, sem risco conceitual)

| Lacuna | Evidência |
|---|---|
| Tela de credenciais só tem formulário para Meta | `configuracoes/redes/page.tsx:243` (`net.code === 'meta'`) |
| Sem wizard de criação para TikTok | `nova/page.tsx:237,254` (só `CampaignWizard` e `GoogleAiMaxWizard`) |
| `network_defaults` não tem chave `tiktok` em nenhum segmento | consulta SQL a `system_segments` |
| `LEAD_SOURCE_BY_NETWORK` não tem entrada `tiktok` (cai no default) | `networkLeadSource.ts:24-33` |

---

## 3. Decisão de arquitetura #1 — o que é "lead" no TikTok

Esta é a decisão mais importante do plano, porque erra-la contamina CPL, desperdício, agentes e
briefing simultaneamente (precedente literal do Google).

TikTok suporta **os dois mecanismos** que a plataforma já conhece:

| Mecanismo | Equivalente atual | Implicação |
|---|---|---|
| Instant Form (nativo, dentro do app) | Formulário Instantâneo do Meta | Identidade real, precisa de webhook |
| Tráfego para landing/WhatsApp | CTA `/api/r/{trackingId}` do Meta | Já funciona sem trabalho novo |
| `conversions` na própria API | `Insight.conversions` do Google | Número agregado, sem identidade |

**Decisão: TikTok usa `cta_engagement` (mesmo do Meta), NÃO `insight_conversions`.**

Racional — e é o oposto do que o esboço antigo sugeria:

1. O caminho de tráfego (CTA → `/api/r/` → WhatsApp/landing) **já funciona hoje sem nenhuma
   linha nova**, e produz lead com **identidade real** (nome/telefone), que é o que alimenta
   CRM → Kanban → negócio fechado → CPA/ROAS real (Visão 4).
2. `insight_conversions` produz número sem identidade — foi exatamente a limitação que travou a
   Visão 4 do Google em zero por meses (documentada em `CHECKPOINT.md`, sessão 2026-07-25) e
   obrigou a construir o webhook de Lead Form.
3. Escolher `cta_engagement` significa que **TikTok nasce com atribuição de receita funcionando**,
   sem repetir o débito do Google.

**Consequência:** 1 linha em `networkLeadSource.ts`:
```ts
tiktok: 'cta_engagement',
```

**Risco a mitigar (documentar na UI, mesmo padrão do aviso de "Conversões" já implementado em
`ClassicFunnelChart.tsx`):** se o cliente usar Instant Form nativo do TikTok, os leads não
chegam por `cta_engagement` e a campanha aparece com leads=0. Duas saídas, nesta ordem:
- **Fase 1:** aviso explícito na UI + `network_defaults.tiktok.instant_form_supported=false`,
  e o wizard só oferece CTA de tráfego (não deixa criar campanha cujo lead a plataforma não
  consegue ver — falha honesta em vez de silenciosa).
- **Fase 3 (opcional):** webhook de Instant Form do TikTok, espelhando
  `/api/public/google-leads/webhook` (já provado ponta a ponta com ngrok).

---

## 4. Decisão de arquitetura #2 — o que pode e o que não pode ser somado

Estende a regra "banana × abacaxi" já estabelecida (`PLANO_GOOGLE_TIKTOK.md` §D2) para 3 redes:

| Métrica | Meta | Google | TikTok | Consolidável? |
|---|---|---|---|---|
| Gasto | ✅ | ✅ | ✅ | **Sim** — real é real |
| Leads | ✅ | ✅ | ✅ | **Sim** — mas só após §3 garantir mesma definição |
| CPL | ✅ | ✅ | ✅ | **Sim, com breakdown obrigatório** — é o eixo da realocação |
| CTR | ✅ | ✅ | ✅ | ⚠️ **Exibir, nunca comparar** — CTR de TikTok e de busca não são a mesma grandeza |
| Frequência | ✅ | ❌ (fixo 1) | ✅ | Só Meta/TikTok |
| Hook Rate / retenção | ✅ vídeo | ❌ | ✅ **nativo** | Só onde há vídeo (já é condicional) |
| Impression Share | ❌ | ✅ | ❌ | Exclusivo Google (já isolado no drill-down) |
| Search Terms / negativação | ❌ | ✅ | ❌ | Exclusivo Google |
| ROAS | ⚠️ | ✅ | ⚠️ | **Nunca blendar** (regra já vigente) |

**Regra nova que o TikTok obriga a explicitar:** CTR entra na lista de "exibir, nunca comparar".
Hoje `aiInsights.ts` usa `ctr_min`/`ctr_scale` como se CTR fosse universal. Com TikTok isso vira
fonte de decisão errada — resolvido pelo benchmark por rede (§5), não por exceção no código.

---

## 5. Mudanças de banco de dados

### 5.1 Benchmark por rede (BLOQUEANTE — resolve o Achado 1)

Adiciona uma dimensão opcional de rede, preservando 100% do comportamento atual.

```sql
-- prisma/migration-2026-XX-XX-benchmarks-por-rede.sql
ALTER TABLE public.system_benchmarks
  ADD COLUMN IF NOT EXISTS network_id UUID NULL REFERENCES public.ad_networks(id);

-- A constraint única precisa passar a considerar a rede. NULL = valor "todas as redes"
-- (comportamento de hoje, preservado). Postgres trata NULLs como distintos em UNIQUE, então
-- usa-se um índice único com COALESCE para garantir 1 linha por (segmento, métrica, rede).
DROP INDEX IF EXISTS system_benchmarks_segment_id_metric_key_key;
ALTER TABLE public.system_benchmarks
  DROP CONSTRAINT IF EXISTS system_benchmarks_segment_id_metric_key_key;

CREATE UNIQUE INDEX system_benchmarks_seg_metric_net_key
  ON public.system_benchmarks (
    segment_id, metric_key,
    COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE INDEX idx_benchmarks_network ON public.system_benchmarks (network_id)
  WHERE network_id IS NOT NULL;
```

**Cascata nova em `benchmarkResolver.ts` — 6 camadas (hoje são 4):**

```
1. client_benchmark_overrides  + network   (mais específico)
2. client_benchmark_overrides  (sem rede)              ← comportamento atual
3. tenant_benchmark_overrides  + network
4. tenant_benchmark_overrides  (sem rede)              ← comportamento atual
5. system_benchmarks           + network   ← NOVO: "CPL ideal do Imobiliário NO TIKTOK"
6. system_benchmarks           (sem rede)              ← comportamento atual (fallback)
```

**Zero regressão por construção:** nenhuma linha existente ganha `network_id`, então toda
resolução de Meta/Google continua caindo nas camadas 2/4/6, exatamente como hoje. As camadas
1/3/5 só disparam para linhas criadas deliberadamente.

**Assinatura:** `resolveBenchmarks(keys, tenantId, segmentId, clientId, networkCode?)`. Parâmetro
**opcional** — os ~8 call sites atuais seguem compilando e comportando-se igual sem alteração.
Só `aiInsights.ts` e `wastedSpendService.ts` passam a informar a rede (§6, §7).

**Seed inicial TikTok** (valores de partida por segmento, ajustáveis pelo Master na UI): apenas
as métricas onde TikTok difere estruturalmente — `cpl_ideal`, `cpl_critical`, `ctr_min`,
`ctr_scale`, `frequency_max`, `hook_rate_*`. As demais herdam do segmento (camada 6).

### 5.2 Tabela nova — propostas de realocação (§8)

Única tabela genuinamente nova do plano. Existe para **medir se a recomendação funcionou** —
sem isso o motor é opinião, não inteligência.

```sql
-- prisma/migration-2026-XX-XX-budget-reallocation.sql
CREATE TABLE campanhasmarketingdigital."BudgetReallocation" (
  id                  TEXT PRIMARY KEY,
  tenant_id           UUID NOT NULL,
  client_id           UUID NULL,
  segment_id          UUID NULL,

  -- origem (de onde sai a verba)
  source_campaign_id  TEXT NOT NULL,
  source_network      VARCHAR(20) NOT NULL,
  source_cpl_before   NUMERIC(12,2) NOT NULL,
  source_budget_before INTEGER NOT NULL,      -- centavos/dia

  -- destino (para onde vai)
  target_campaign_id  TEXT NOT NULL,
  target_network      VARCHAR(20) NOT NULL,
  target_cpl_before   NUMERIC(12,2) NOT NULL,
  target_budget_before INTEGER NOT NULL,

  amount_cents        INTEGER NOT NULL,       -- valor diário realocado
  projected_lead_gain NUMERIC(10,2) NOT NULL, -- ganho estimado no período
  confidence          NUMERIC(4,3) NOT NULL,

  status              VARCHAR(20) NOT NULL DEFAULT 'PROPOSED',
                      -- PROPOSED | APPROVED | REJECTED | EXECUTED | REVERTED | MEASURED
  agent_action_id     TEXT NULL,              -- vínculo com AgentAction (aprovação/PIN)

  -- medição pós-fato (preenchida por cron D+14)
  measured_at         TIMESTAMPTZ NULL,
  actual_lead_gain    NUMERIC(10,2) NULL,
  verdict             VARCHAR(20) NULL,       -- CONFIRMED | NEUTRAL | BACKFIRED

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at         TIMESTAMPTZ NULL
);

CREATE INDEX idx_realloc_tenant     ON campanhasmarketingdigital."BudgetReallocation" (tenant_id, created_at DESC);
CREATE INDEX idx_realloc_pair       ON campanhasmarketingdigital."BudgetReallocation" (source_campaign_id, target_campaign_id, created_at DESC);
CREATE INDEX idx_realloc_pending    ON campanhasmarketingdigital."BudgetReallocation" (status) WHERE status IN ('PROPOSED','APPROVED');
```

### 5.3 O que NÃO muda (confirmado por leitura)

| Item | Motivo |
|---|---|
| `Insight` | Grão campanha-dia já serve; colunas de vídeo já existem (FASE 5) |
| `Campaign` / `AdSet` / `Ad` | `network_id` + `external_id` já genéricos |
| `ad_networks` | Linha `tiktok` já cadastrada e ativa |
| `CtaInteraction` / `CtaSubmission` | Agnósticos de rede por construção |
| `tenant_network_credentials` | JSONB genérico — TikTok grava suas chaves sem DDL |
| Tabelas de Search Terms | Exclusivas de busca, TikTok não usa |

---

## 6. Adapter TikTok

**Arquivo:** `src/lib/marketing/networks/tiktok/TikTokAdsAdapter.ts`
**Contrato:** `AdNetworkService` (`networks/types.ts:132-146`) — sem alteração da interface.
**API:** TikTok Business API v1.3. **Decisão: `fetch` nativo, não SDK.** Precedente do próprio
projeto — o pacote `openai` quebrou dentro do runtime do Next e foi substituído por `fetch` cru
(`CHECKPOINT.md`, sessão 2026-07-19); o `google-ads-api` só funciona porque não roda no edge.
Evita repetir a dívida.

| Método | Implementação | Observação |
|---|---|---|
| `validateCredentials` | `GET /oauth2/advertiser/get/` | Valida token + advertiser_id |
| `fetchInsights` | `GET /report/integrated/get/` | Métricas base + vídeo (`video_watched_2s`, `video_views_p25/50/75/100`) |
| `createCampaign` | `POST` campaign → adgroup → ad | Reusa `CreateCampaignInput` (mesmo shape do Meta) |
| `uploadCreative` | `POST /file/video/ad/upload/` | Vídeo-first; imagem via `/file/image/ad/upload/` |
| `updateCampaignStatus` | `POST /campaign/status/update/` | `ENABLE`/`DISABLE` |
| `searchTargeting` | `GET /targeting/interest/keyword/recommend/` | Mapeia para `TargetingResult` |

**Mapeamento de métricas de vídeo — ponto de atenção real:** TikTok reporta `video_watched_2s`,
não 3s. A coluna existente é `videoViews3s` e o Hook Rate benchmark (`hook_rate_*`) foi calibrado
em 3s do Meta. Gravar 2s do TikTok em `videoViews3s` sem ajustar o benchmark **inflaria o Hook
Rate do TikTok** (2s é mais fácil de atingir que 3s) e produziria falso "criativo ótimo".
**Solução:** gravar em `videoViews3s` (a coluna é o slot de "primeiro sinal de retenção") **e**
calibrar `hook_rate_critical`/`hook_rate_min`/`hook_rate_good` **por rede** via §5.1. A
alternativa (coluna nova `videoViews2s`) foi descartada: fragmenta o consumidor sem ganho, já que
nenhum consumidor compara 2s com 3s diretamente — todos comparam contra benchmark, e o benchmark
agora é por rede.

**Credenciais** (JSONB em `tenant_network_credentials`, rede `tiktok`):
`access_token`, `advertiser_id`, `app_id`, `secret`.

**Adapter fake** (`FakeTikTokAdapter`, `networks/fake/`) — obrigatório, mesmo padrão da Trilha E.
Implementa `AdNetworkService` direto (não precisa estender a classe real: não há `instanceof
TikTokAdsAdapter` em lugar nenhum, ao contrário do Google). Roteado por
`access_token === '__SIMULATED__'` em `factory.ts`. **É o que viabiliza todo o plano de testes
(§11) sem depender de aprovação do app no TikTok for Business.**

---

## 7. Impacto em cada funcionalidade existente

Levantamento exaustivo. "Automático" = verificado que já funciona sem alteração.

### 7.1 Dashboard

| Componente | Impacto | Ação |
|---|---|---|
| Filtro de rede (topo) | ✅ Automático | Nenhuma (lê `availableNetworks`) |
| KPI Gasto / Leads / CPL — **breakdown por rede** | 🔴 **BUG (Achado 2)** | Trocar ternário por `NETWORK_LABELS` em `CommandCenterView.tsx:176,183,191` |
| Gráfico de evolução, funil, distribuição | ✅ Automático | Query base nunca filtra por rede |
| Visão 4 (CPA/ROAS real) | ✅ Automático | Já aceita `network` (commit `36f96d6`) |
| Drill-down Google (Search Terms/IS) | ✅ Automático | Condicional a `cplByNetwork.google` |
| **Drill-down TikTok (novo)** | 🆕 | Retenção de vídeo por criativo — reusa o componente de Hook Rate do Meta |
| Mapa de campanhas | ✅ Automático | Agrega por campanha |
| Radar de demanda | ✅ Automático | Por segmento, não por rede |

### 7.2 Agentes / IA

| Item | Impacto | Ação |
|---|---|---|
| `aiInsights` — PAUSE/SCALE/OPTIMIZE/DOWNSCALE | 🟠 Correto porém **mal calibrado** | Passar `networkCode` ao `resolveBenchmarks` (§5.1) |
| `aiInsights` — `IMPRESSION_SHARE_OPPORTUNITY` | ✅ Inerte | Campos IS ficam 0 no TikTok, regra não dispara |
| `aiInsights` — `REFRESH_CREATIVE` (Hook Rate) | 🟠 Calibração | Idem: benchmark por rede |
| `agentDecisor` — DEFENSIVE/OFFENSIVE | ✅ Automático | Agnóstico |
| `agentDecisor.executeAction` — PAUSE/SCALE/DOWNSCALE | ✅ Automático | Usa `getNetworkServiceForTenant` genérico |
| `agentMonitor.syncMetrics` | ✅ Automático | Já itera redes via `ad_networks` |
| Agente de negativação (Google) | ✅ Isolado | Guardado por `instanceof GoogleAdsAdapter` |
| Digest WhatsApp | ✅ Automático | `NETWORK_TAG` já tem `tiktok` |
| Briefing estratégico | ✅ Automático | Usa `getLeadEvents` |
| **`REALLOCATE_BUDGET`** | 🆕 | Casca existe (Achado 3) — preencher em §8 |

### 7.3 Desperdício de verba

`wastedSpendService.ts` classifica em 5 categorias usando benchmarks **resolvidos uma única vez
para todo o tenant** (`:50-55`), antes de iterar campanhas. Com 3 redes isso significa aplicar o
CPL ideal do Meta às campanhas de TikTok.

**Ação:** mover a resolução de benchmark para **dentro do loop**, por rede da campanha
(`:116`). Custo baixo (resolver por rede uma vez, com cache em `Map`), e é o que impede o
TikTok de aparecer inflado em `HIGH_CPL_SPEND` no primeiro mês.

**Efeito colateral positivo:** a categoria `FATIGUED_CONTINUE` (frequência) hoje trata campanha
de Google — que reporta `frequency: 1` fixo (`GoogleAdsAdapter.ts:331`) — como "nunca fatigada".
Correto por acaso. Com benchmark por rede isso vira explícito em vez de acidental.

### 7.4 Demais consumidores

| Serviço | Impacto |
|---|---|
| `cplTimelineService` | ✅ Automático (usa `leadEvents`) |
| `revenueAttributionService` | ✅ Automático (já tem filtro de rede) |
| `auditReportService` | 🟠 Score de Performance usa benchmark — herda o fix de §5.1 |
| `segmentIntelligenceService` | ✅ Automático |
| `portfolio` / `cross-insights` | ✅ Automático |
| `trackingHealthService` | 🟠 Check `pixel_configured` é Meta-específico → tornar condicional à rede |
| `strategicBriefing` | ✅ Automático |

---

## 8. ⭐ Motor de Realocação Cross-Rede

O item de maior valor do plano. Responde: *"deixar de investir R$ X na campanha Y do Meta e
passar a investir no TikTok — vale a pena, e quanto ganho?"*

### 8.1 Por que não é só "comparar CPL"

A resposta ingênua — "TikTok tem CPL menor, mova tudo pra lá" — está errada por quatro razões,
e o motor precisa tratar as quatro explicitamente:

1. **CPL médio ≠ CPL marginal.** O próximo real investido rende menos que o real anterior
   (audiência satura, leilão encarece). Realocar assumindo CPL médio constante **superestima
   sistematicamente o ganho**.
2. **Comparabilidade.** Campanha TOF (topo) e BOF (fundo) têm CPLs incomparáveis por desenho.
   Comparar as duas produz recomendação destrutiva (matar o topo do funil "porque é caro").
3. **Fase de aprendizado.** Mexer no budget de campanha em learning reseta o aprendizado — o
   próprio sistema já sabe disso (`signalEngine`, `learning_status`).
4. **Headroom.** Não adianta mandar verba para um destino que já está saturado. Precisa de sinal
   de que o destino **absorve** mais verba.

### 8.2 Elegibilidade (todos obrigatórios)

Um par (origem → destino) só é candidato se:

| # | Condição | Fonte |
|---|---|---|
| E1 | Mesmo `tenant_id` **e** mesmo `client_id` | `Campaign` |
| E2 | Mesmo `segment_id` efetivo | `resolveSegment` |
| E3 | Mesmo `funnel_stage` | `Campaign.funnel_stage` |
| E4 | Redes **diferentes** (senão é SCALE/DOWNSCALE comum) | `ad_networks.code` |
| E5 | Ambas com `daysRunning ≥ min_days_running` | `Insight` |
| E6 | Destino com `leads ≥ min_leads_scale` (eficiência **provada**, não promessa) | `getLeadEvents` |
| E7 | Origem com `leads > 0` (senão o caso é PAUSE, não realocação) | `getLeadEvents` |
| E8 | Nenhuma das duas em `LEARNING`/`LEARNING_LIMITED` | `Insight.learning_status` |
| E9 | Destino com headroom: `frequency < frequency_max` (Meta/TikTok) **ou** `search_budget_lost_is > 0` (Google) | `Insight` |
| E10 | Sem proposta para o mesmo par nos últimos 14 dias | `BudgetReallocation` |
| E11 | Origem não é a única campanha ativa do seu `funnel_stage` | `Campaign` |

### 8.3 Cálculo

**Ganho de eficiência** (só prossegue se ≥ `realloc_min_cpl_gap_pct`, default 30%):
```
gap% = (cpl_origem − cpl_destino) / cpl_origem × 100
```

**Valor a realocar** — conservador, limitado pelo menor de três tetos:
```
valor = MIN(
  budget_origem × realloc_max_pct_of_source,   -- default 30%: nunca esvazia a origem
  budget_destino × scale_budget_max_pct,       -- default 25%: reusa o teto que já protege o aprendizado
  realloc_max_abs_cents                        -- teto absoluto por proposta
)
```

**Ganho projetado — com haircut marginal explícito** (o ponto que separa este motor de uma
regra de três):
```
cpl_destino_marginal = cpl_destino × (1 + realloc_marginal_haircut_pct)   -- default 25%

leads_perdidos_origem = valor / cpl_origem
leads_ganhos_destino  = valor / cpl_destino_marginal
ganho_liquido_diario  = leads_ganhos_destino − leads_perdidos_origem
```
Se `ganho_liquido_diario ≤ 0` → **não propõe**. O haircut faz o motor recomendar apenas quando a
vantagem é grande o suficiente para sobreviver à degradação esperada — falha para o lado seguro.

**Confiança** (alimenta o threshold de 0.85 do agente):
```
confidence = 0.5
  + 0.2 × min(1, gap% / 50)                       -- quão grande é a vantagem
  + 0.2 × min(1, leads_destino / (2×min_leads))   -- quão provada está
  + 0.1 × min(1, dias_destino / 14)               -- quão estável no tempo
```

### 8.4 Execução e governança

- **Sempre OFFENSIVE** → `PENDING_APPROVAL` + PIN de 6 dígitos. Aumenta gasto numa rede: exige
  humano. Reusa o fluxo já testado (`/api/agent/approve/[id]`, corrigido em `8be46a8`).
- **Execução atômica:** `DOWNSCALE` na origem **e** `SCALE` no destino na mesma transação. Se a
  chamada de rede do destino falhar, **reverte a origem** — nunca deixar verba "no limbo".
- **Notificação** (`agentNotificador`) — formato explícito:
  `💰 Realocar · [Meta] Campanha A (CPL R$ 82) → [TikTok] Campanha B (CPL R$ 31) · R$ 30/dia · +0,6 lead/dia`
- **Medição D+14** (cron novo): compara `actual_lead_gain` com `projected_lead_gain` e grava
  `verdict`. **É o que fecha o loop de aprendizado** — sem isso o motor nunca melhora.
- **Circuit breaker:** se ≥3 propostas do tenant vierem `BACKFIRED` nos últimos 90 dias, o motor
  entra em modo somente-sugestão (não executa nem com aprovação) e alerta o Master. Protege
  contra um haircut mal calibrado corroer a conta do cliente silenciosamente.

### 8.5 Benchmarks novos (todos por segmento, via §5.1)

| Chave | Default | Papel |
|---|---|---|
| `realloc_min_cpl_gap_pct` | 30 | Vantagem mínima para propor |
| `realloc_max_pct_of_source` | 30 | Teto do que sai da origem |
| `realloc_marginal_haircut_pct` | 25 | Degradação esperada no destino |
| `realloc_max_abs_cents` | 5000 | Teto absoluto (R$ 50/dia) |
| `realloc_cooldown_days` | 14 | Anti-ping-pong |

### 8.6 Onde aparece na UI

1. **Dashboard → Visão Executiva:** card "Oportunidade de Realocação" (só quando há ≥2 redes com
   dado e ≥1 proposta viva).
2. **Fila de aprovação** (`/admin/campanhas/aprovacoes`): já renderiza `REALLOCATE_BUDGET`
   (Achado 3) — funciona sem alteração.
3. **Desperdício de Verba:** nova seção "Para onde mover" — conecta o diagnóstico (desperdício
   detectado) à ação (destino concreto). Hoje o `recoveryPlan` diz "pausar/otimizar" sem dizer
   *para onde ir*.
4. **Histórico de realocações** com veredito D+14 — é a prova de valor do módulo para o gestor.

---

## 9. Geração de criativo de vídeo

TikTok é vídeo-first. O `creativeGenerationService` (Estágio A) hoje compõe **imagem** via
Sharp+SVG.

**Decisão: fora do escopo desta entrega.** O TikTok aceita upload de vídeo produzido fora da
plataforma, e o adapter (`uploadCreative`) cobre isso. Acoplar a geração de vídeo (custo de
GPU/API externa, já mapeado como FASE 6.5 Estágio B) ao lançamento do TikTok atrasaria a entrega
de valor real (CPL comparável + realocação) por um item que tem alternativa manual imediata.

**Reuso confirmado:** a análise de criativo por Vision (`creativeAnalysisService`) é universal —
analisa frames, funciona para vídeo do TikTok sem alteração.

---

## 10. Faseamento

| Fase | Entrega | Bloqueia? | Valor ao gestor |
|---|---|---|---|
| **T0** | Benchmark por rede (§5.1) + fix do Achado 2 (§2.2) | 🔴 Sim | Nenhum isolado — é o alicerce |
| **T1** | `FakeTikTokAdapter` + `networkLeadSource` + `network_defaults.tiktok` | 🔴 Sim | Nenhum — viabiliza teste |
| **T2** | `TikTokAdsAdapter` real + credenciais na UI | Não | Sync real de TikTok |
| **T3** | Wizard TikTok + drill-down de retenção | Não | Lançar pela plataforma |
| **T4** | ⭐ Motor de realocação (§8) | Não | **O payoff** |
| **T5** | Medição D+14 + histórico + circuit breaker | Não | Prova de valor |
| **T6** | *(Opcional)* Webhook Instant Form | Não | Cobre o caso de §3 |

**T0 e T1 são pré-requisitos absolutos.** Subir TikTok sem benchmark por rede significa entregar
ao gestor uma rede que o próprio sistema vai recomendar matar.

**Nota:** T4 não depende do TikTok real — o motor opera sobre Meta×Google desde o primeiro dia, e
o TikTok apenas aumenta o espaço de decisão. Pode ser antecipado se o TikTok travar em aprovação
de app.

---

## 11. Plano de testes

Segue a metodologia já validada em `docs/TESTE_RIGOROSO_LEADEVENTS_2026-07-22.md` (Trilhas A–E):
verdade fundamental por **SQL puro**, comparada contra cada consumidor. Todas as trilhas abaixo
rodam com `FakeTikTokAdapter` — **nenhuma depende de aprovação do app no TikTok.**

### Trilha F — TikTok isolado

| # | Cenário | Resultado esperado |
|---|---|---|
| F1 | `fetchInsights` via cron real | `Insight` criado com `videoViews3s` populado a partir de `video_watched_2s` |
| F2 | Lead via CTA `/api/r/{trackingId}` | `getLeadEvents` conta como `cta_engagement`; CPL correto |
| F3 | Campanha TikTok com CPL bom pelo padrão **TikTok**, ruim pelo padrão **Meta** | **SCALE** (usando benchmark de TikTok) — se sair PAUSE, §5.1 falhou |
| F4 | Hook Rate no limiar do benchmark de TikTok | `REFRESH_CREATIVE` dispara no limiar certo, não no do Meta |
| F5 | Wizard cria campanha TikTok | `Campaign`/`AdSet`/`Ad` + `external_id` persistidos |
| F6 | Campanha TikTok sem lead nenhum | `ZERO_LEADS_SPEND` usando `spend_no_lead` **do TikTok** |
| F7 | Regras exclusivas de Google | `IMPRESSION_SHARE_OPPORTUNITY` e negativação **não** disparam |

### Trilha G — 3 redes simultâneas (a mais importante)

Cenário base: 1 cliente, 1 segmento, **6 campanhas** — 2 Meta, 2 Google, 2 TikTok — todas ativas
na mesma janela, com números calculados à mão para forçar resultados inequívocos.

| # | Verificação | Critério |
|---|---|---|
| G1 | **Verdade fundamental** — soma de gasto/leads por SQL puro | Bate com `dashboard/full` |
| G2 | KPI Gasto/Leads/CPL com breakdown das 3 redes | **3 rótulos corretos** — pega o Achado 2 |
| G3 | Filtro de rede = TikTok | Só campanhas TikTok em **todos** os endpoints (`full`, `insights/ai`, `funnel`, `predictions`, `anticipation`, `revenue-attribution`) |
| G4 | Filtro = Todas | Total = soma exata das 3 redes |
| G5 | Insights da IA | Cada campanha julgada pelo benchmark **da sua rede** |
| G6 | Desperdício de verba | Categorias corretas por rede; total = soma |
| G7 | Auditoria | Score coerente; sem dupla contagem |
| G8 | Digest WhatsApp | 3 rótulos distintos `[Meta]`/`[Google]`/`[TikTok]` |
| G9 | Briefing estratégico | Cita as 3 redes sem confundir números |
| G10 | Visão 4 (CPA/ROAS real) | Negócio fechado de lead TikTok atribui à campanha certa |
| G11 | Cron completo (sync + decisor + negativação) | Roda sem erro com as 3 redes; negativação só toca Google |
| G12 | **Isolamento de lead** | Lead TikTok não vira lead Meta (o bug histórico do projeto) |

### Trilha H — Motor de realocação

| # | Cenário | Esperado |
|---|---|---|
| H1 | Meta CPL R$ 80 → TikTok CPL R$ 30, ambos maduros | Propõe; ganho projetado **confere com cálculo manual incluindo haircut** |
| H2 | Gap de CPL de 10% (< `realloc_min_cpl_gap_pct`) | **Não** propõe |
| H3 | Destino com 2 leads (< `min_leads_scale`) | **Não** propõe (E6) |
| H4 | Destino em `LEARNING` | **Não** propõe (E8) |
| H5 | Destino com `frequency > frequency_max` | **Não** propõe — sem headroom (E9) |
| H6 | Origem TOF × destino BOF | **Não** propõe (E3) |
| H7 | Origem com 0 leads | **Não** propõe — é caso de PAUSE (E7) |
| H8 | Mesma rede | **Não** propõe — é SCALE comum (E4) |
| H9 | Proposta repetida em 14 dias | Bloqueada por cooldown (E10) |
| H10 | Aprovação com PIN | `DOWNSCALE` origem + `SCALE` destino, **ambos** aplicados |
| H11 | **Falha na rede do destino** | **Origem revertida** — verba nunca fica no limbo |
| H12 | Rejeição | Nenhum budget alterado |
| H13 | Medição D+14 com ganho real | `verdict='CONFIRMED'` |
| H14 | Medição D+14 com perda | `verdict='BACKFIRED'` |
| H15 | 3 `BACKFIRED` em 90 dias | Circuit breaker ativa |
| H16 | Cadeia A→B→C no mesmo ciclo | Só 1 proposta por campanha por ciclo (sem cascata) |

### Trilha I — Regressão (não quebrar o que funciona)

Executada **com TikTok já no ar**, comparando contra os números da Trilha A:

| # | Verificação |
|---|---|
| I1 | Tenant só-Meta: todos os números idênticos ao pré-TikTok |
| I2 | Tenant Meta+Google: idem (nenhum benchmark de rede criado ainda → cai no fallback) |
| I3 | Campanha legada sem `network_id` → continua tratada como Meta |
| I4 | `resolveBenchmarks` sem `networkCode` → resultado idêntico ao de hoje |
| I5 | Filtro de rede com 1 rede só → seletor não aparece (comportamento atual) |
| I6 | Trilha E (fakes Meta/Google) continua passando |

### Trilha J — Conta real TikTok *(bloqueada, como a Trilha D)*

Depende de app aprovado no TikTok for Business + deploy de staging. Camada 1 (custo zero):
criar campanha real com status `DISABLE` + lead de teste. **Não iniciar sem confirmação
explícita sobre gasto.**

### Limpeza

Toda trilha remove 100% do dado de teste ao final, com contagem SQL confirmando 0 resíduo —
disciplina já aplicada nas Trilhas C e E.

---

## 12. Riscos

| Risco | Severidade | Mitigação |
|---|---|---|
| Benchmark de TikTok mal calibrado no seed | 🔴 Alta | Primeiros 30 dias em modo observação; Master ajusta pela UI antes de ligar ações automáticas |
| Haircut marginal irreal → realocação destrói performance | 🔴 Alta | Medição D+14 + circuit breaker (§8.4); teto de 30% da origem |
| Cliente usa Instant Form → leads invisíveis | 🟠 Média | Wizard não oferece esse CTA na Fase 1 (falha honesta); T6 resolve |
| App TikTok não aprovado a tempo | 🟠 Média | `FakeTikTokAdapter` destrava T0/T1/T4 e todo o teste |
| 2s vs 3s inflando Hook Rate | 🟠 Média | Benchmark de retenção por rede (§6) |
| Ping-pong de verba entre redes | 🟡 Baixa | Cooldown de 14 dias (E10) |
| Rate limit da API do TikTok | 🟡 Baixa | Mesmo padrão de retry/backoff do Meta |

---

## 13. Resumo executivo

**3 achados que mudam o desenho em relação ao esboço anterior:**
1. Benchmarks não têm dimensão de rede → **bloqueante**, não refinamento.
2. Bug real de rotulagem: TikTok apareceria como "Google Ads" em 3 KPIs.
3. `REALLOCATE_BUDGET` já tem UI/notificação/aprovação prontas — só falta o motor.

**1 tabela nova** (`BudgetReallocation`), **1 coluna nova** (`system_benchmarks.network_id`).
Todo o resto é reuso — o investimento em arquitetura agnóstica de rede feito nas fases
anteriores está pagando.

**A entrega de maior valor não é o TikTok em si — é o motor de realocação cross-rede**, que
transforma o módulo de "relatório do que aconteceu" em "instrução do que fazer com o próximo
real", com medição posterior para provar se a instrução estava certa.

---

**Referências:** `docs/PLANO_GOOGLE_TIKTOK.md` (Fase 1 Google, governança) ·
`docs/TESTE_RIGOROSO_LEADEVENTS_2026-07-22.md` (metodologia de teste) ·
`docs/CHECKPOINT.md` (histórico de decisões) · `CLAUDE.md` §Multi-Rede
