# CHECKPOINT — Estado Atual do Projeto

> **Atualizado em:** 2026-06-11 (FASE 18.2 — Dashboard por segmento)
> **Propósito:** Garantir continuidade entre sessões, modelos, contas e computadores.
> **Regra:** atualizar ao final de cada sessão antes de fechar.

---

## Última tarefa concluída

### FASE 18.2 — Dashboard dirigido por Segmento — CONCLUÍDO 2026-06-11 ✅

No modo agregado (vários clientes de segmentos distintos), 4 seções do dashboard misturavam segmentos
indevidamente. Decisão: quebrar por segmento (Radar, Insights IA, Briefing) e por cliente (Tracking Health),
100% dirigido pelo banco (`system_segments.creative_taxonomy.angles`). Plano completo aprovado.

**Fundação de dados:** nova tabela `campanhasmarketingdigital.segment_angle_terms` (segment_id, angle_slug,
angle_label, search_term) substitui a global `angle_search_terms`; `exogenous_signals` e `demand_radar_cache`
ganham `segment_id`. Seed por segmento ativo.

**Fases:** A) segmentTaxonomyService · B) Wizard+Vision por segmento · C) Radar por segmento ·
D) Insights+Briefing por segmento · E) Tracking Health por cliente. Cada fase: migração local + commit + push.

**Progresso:**
- ✅ **Fase A** — migração `segment_angle_terms` (18 ângulos / 4 segmentos) + `segmentTaxonomyService`.
- ✅ **Fase B** — wizard carrega ângulos do segmento do cliente (`segment-defaults` retorna `allowedAngles`).
  Vision mantida agnóstica (roda no upload, sem segmento). `angles.ts` = fallback legado.
- ✅ **Fase C** — Radar por segmento: cron popula `exogenous_signals` por segmento (Trends real),
  `computeDemandRadarBySegment`, API retorna `{segments:[...]}`, UI empilha um radar por segmento.
  Verificado: agregado → 2 segmentos (Imobiliário+Saúde), cliente único → 1 segmento.
  ⚠️ Campanhas demo têm `declared_angle` genérico antigo (family/luxury…) → endógeno 0 nos novos
  vértices até serem recriadas pelo wizard (ou migradas).
- ✅ **Fase D** — Insights IA por segmento (benchmark próprio de cada segmento; `aiInsights.bySegment`)
  + Briefing Estratégico por segmento (`StrategicBriefing.segment_id`; um briefing por segmento;
    rotas generate/latest e cron retornam/persistem por segmento).
  Verificado: agregado → Insights e Briefings separados Imobiliário + Saúde.
- ✅ **Fase E** — Tracking Health breakdown por cliente (um widget por cliente no modo agregado).

**Resultado:** no modo "todos os clientes", Radar/Insights/Briefing exibem um bloco por segmento e
Tracking Health um card por cliente. Cliente único colapsa para um bloco coerente. 100% dirigido por
banco (system_segments + segment_angle_terms), zero hardcode, zero mock.

**Migrações locais aplicadas (pendente VPS, all-at-once):**
`migration-2026-06-11-segment-driven.sql` e `migration-2026-06-11-briefing-segment.sql`.
**Nota:** rodar `npx prisma generate --schema=prisma/schema.marketing.prisma` após pull (campo
`StrategicBriefing.segment_id/segment_name` adicionado ao schema). Cron diário de Trends:
`POST /api/cron/campanhas/exogenous-signals` (header `x-cron-secret`).

---

## Última tarefa concluída

### FASE 18.1 — Radar de Demanda (Google Trends × Ângulos) — CONCLUÍDO 2026-06-05 ✅

Implementação completa do Radar de Demanda no Farol de Milha do dashboard.

**Arquivos criados:**
- `prisma/migration-2026-06-05-demand-radar.sql` — 3 tabelas + 24 termos seed + prompt template
  - `campanhasmarketingdigital.angle_search_terms` — termos PT-BR por ângulo
  - `campanhasmarketingdigital.exogenous_signals` — snapshots diários Google Trends
  - `campanhasmarketingdigital.demand_radar_cache` — cache por tenant/client/data
  - `public.system_prompt_templates['demand_radar_actions']` — prompt ZERO HARDCODE
- `src/lib/marketing/services/exogenousTrendsService.ts` — Google Trends unofficial API
  - Timeout 5s por request, fallback mock com jitter diário por ângulo
  - 8 ângulos em paralelo via `Promise.allSettled`
- `src/lib/marketing/services/demandRadarService.ts` — fusão endógeno × exógeno
  - Normalização share-of-spend → 0-100 por ângulo
  - Classificação quadrante: oceano-azul/saturado/vigiar/ponto-morto
- `src/app/api/cron/campanhas/exogenous-signals/route.ts` — cron diário (POST, x-cron-secret)
- `src/app/api/admin/campanhas/dashboard/demand-radar/route.ts` — GET com cache-first

**Arquivos modificados:**
- `src/components/marketing/charts/DemandRadar.tsx` — RadarChart premium self-fetching
  - Série violeta preenchida (endógeno) + linha ciana tracejada (exógeno)
  - Painel lateral com chips por quadrante + legenda semântica
  - Skeleton, estado de erro, botão de refresh, badge Trends ao vivo/estimativa
- `src/app/admin/campanhas/dashboard/page.tsx` — DemandRadar inserido no FarolSection

**Migração aplicada localmente** com psql (127.0.0.1:15432). VPS: pendente (all-at-once).

---

## Última tarefa concluída

### Task 2: Ações críticas geradas por LLM — cross_critical_actions (2026-06-04) ✅

**Decisão:** As 4 ações hardcoded dos alertas `critical-*` em `buildRuleBasedInsights`
eram genéricas e idênticas para todo cliente. Substituídas por chamada LLM no POST,
com contexto real: CPL atual, CPL crítico do segmento, excesso em R$ e %.

**Mudanças:**
- **`prisma/migration-2026-06-04-cross-critical-actions-prompt.sql`** (nova):
  insere template `cross_critical_actions` em `system_prompt_templates` (global, version=1)
  com variáveis: `client_name`, `segment_name`, `cpl_current`, `cpl_critical`,
  `excess_pct`, `excess_brl`
- **`cross-insights/route.ts`**:
  - `CrossPerformer` ganha campo `cplCritical: number | null` (exposto no GET)
  - `sorted` map inclui `cplCritical` na construção dos performers
  - POST handler: novo bloco antes da narrativa que itera sobre insights `critical-*`,
    chama `invokeForContext` em paralelo, faz parse do JSON array retornado e substitui
    `insight.actions`; fallback silencioso para ações padrão se LLM falha ou retorna
    JSON inválido

**Comportamento em produção:**
- `GET` → rápido, sem LLM, ações padrão (hardcoded)
- `POST` (botão "Análise IA") → LLM enriquece ações críticas + gera narrativa de portfólio

**Migration aplicada:** localmente. **Pendente VPS (batch).**

---

### Task 1: Benchmarks migrados para system_segments (2026-06-04) ✅

**Decisão:** `cpl_ideal`, `cpl_critical`, `ctr_min` foram movidos de `system_benchmarks`
para colunas diretas em `system_segments`, eliminando uma query extra de JOIN em cada request
de portfólio e cross-insights. `system_benchmarks` permanece intacto para os demais métricas
(hook_rate, frequency_max, etc.) e para o `benchmarkResolver.ts` 4-layer.

**Mudanças:**
- **`prisma/migration-2026-06-04-segment-benchmarks.sql`** (nova):
  `ALTER TABLE + backfill` — 5 segmentos atualizados (4 com dados, Master Platform sem benchmarks)
- **`src/app/api/admin/master/segments/route.ts`**: adicionados handlers `POST` (criar segmento)
  e `PUT` (atualizar) com os 3 novos campos; GET já retorna `s.*`
- **`src/app/admin/master/segments/page.tsx`**: seção "Benchmarks de Performance" no modal:
  inputs CPL Ideal / CPL Crítico / CTR Mínimo + legenda de status (ok/atenção/crítico)
- **`src/app/api/admin/campanhas/portfolio/cross-insights/route.ts`**: query de clientes e
  tenants ampliada com `s.cpl_ideal, s.cpl_critical, s.ctr_min`; `benchMap` eliminado
- **`src/app/api/admin/campanhas/portfolio/route.ts`**: mesma simplificação + helper `parseNullable`

**Migration aplicada:** localmente via psql 17. **Pendente VPS (batch).**

---

### Briefing Estratégico — documento autônomo do filtro de página (2026-06-04) ✅

**Decisão de produto:** briefing é um documento de inteligência (snapshot), não um gráfico ao vivo.
Deve ser independente do filtro de período da página e carregar seu próprio contexto temporal.

**Mudanças:**
- **Nova coluna DB:** `period_days INTEGER` em `StrategicBriefing`
- **Prisma schema:** `periodDays Int? @map("period_days")` adicionado ao modelo
- **`strategicBriefing.ts`:** os três `create()` (empty / sucesso LLM / fallback) agora salvam `periodDays`
- **`marketing-api.ts`:** `StrategicBriefingData` inclui `periodDays?: number | null`
- **Dashboard — seção Briefing:**
  - Removido o `PeriodBadge` do filtro de página no cabeçalho da seção
  - Botão "Gerar Novo" mostra o período que será usado: `Gerar · 7d`
  - Descrição atualizada: "Documento autônomo — período registrado na geração"
- **`BriefingCard`:** exibe badge de período próprio do documento (canto direito do cabeçalho)
  — badge `null` para briefings históricos sem `period_days` (retrocompatível)

**Arquivos modificados:**
- `prisma/migration-2026-06-04-briefing-period-days.sql` (nova)
- `prisma/schema.marketing.prisma`
- `src/lib/marketing-api.ts`
- `src/lib/marketing/services/strategicBriefing.ts`
- `src/app/admin/campanhas/dashboard/page.tsx`

**Migration aplicada:** localmente via psql 17. Pendente VPS (batch).

---

### Fix cross-insights — narrativa LLM tenant/segmento ciente (2026-06-04) ✅

**Problema:** A IA confundia o tenant (empresa gestora) com os clientes gerenciados na narrativa
de portfólio, e comparava clientes de segmentos diferentes de forma incorreta.

**Solução:**
- `isTenant` flag no `clientList` do GET — campanhas sem `client_id` = tenant, não cliente
- `buildRuleBasedInsights` usa `realClients` (filtra tenant) para todos os insights cruzados
- GET response inclui `tenantName` e `clientDetails[]` (com `isTenant`, `segmentName`, `status`)
- POST handler constrói `client_context` com linhas `[TENANT]` vs `[CLIENTE]` + segmento por linha
- Prompt v2 (`version = 2`): regras explícitas — nunca comparar tenant com clientes, nunca
  comparar segmentos diferentes; variáveis: `{{tenant_name}}`, `{{client_context}}`

**Arquivos modificados:**
- `src/app/api/admin/campanhas/portfolio/cross-insights/route.ts`

**Migration aplicada:**
- `prisma/migration-2026-06-03-cross-pollination-prompt-v2.sql` — UPDATE `content` + `variables`
  (aplicada localmente via node --input-type=module)

**Migration PENDENTE VPS:** — junto ao batch de outras migrations

---

### FASE 14d — Auto-classificação de ângulo em lote (2026-06-03) ✅

**Objetivo:** eliminar trabalho manual de associar ângulo campanha a campanha. A IA classifica
automaticamente todas as campanhas pelo nome, via job em lote com revisão humana antes de salvar.

**Novo campo DB:** `angle_source VARCHAR(20)` em `Campaign`
- `'declared'` = humano confirmou (via badge ou wizard)
- `'llm_auto'` = classificado pelo job de IA
- `NULL` = sem classificação (mostra banner)

**Arquivos novos:**
- `prisma/migration-2026-06-03-angle-source.sql` — ADD COLUMN angle_source
- `prisma/migration-2026-06-03-classify-angle-prompt.sql` — INSERT template `classify_campaign_angle`
- `scripts/run-migration-fase14d.mjs` — runner Node.js para DBeaver
- `src/lib/marketing/services/angleClassifierService.ts` — serviço: `getUnclassifiedCount`,
  `classifyCampaignAngles` (LLM preview, batches de 20), `saveAngleClassifications` (raw SQL)
- `src/app/api/admin/campanhas/portfolio/classify-angles/route.ts` — `GET` (count) +
  `POST mode=preview` (sugestões LLM) + `POST mode=confirm` (salva)

**Arquivos modificados:**
- `src/app/api/admin/campanhas/campaigns/route.ts` — enriquece resposta com `angleSource`
  via query raw SQL (angle_source fora do schema Prisma)
- `src/app/api/admin/campanhas/campaigns/[id]/route.ts` — PATCH seta `angle_source = 'declared'`
  (ou null ao limpar) via raw SQL após update Prisma
- `src/components/marketing/CampanhasModal.tsx`:
  - `AngleBadge` reescrito: 3 estados visuais (amber=sem ângulo, blue=IA, emerald=declarado)
    com tooltip explicativo; callback `onUpdated(angle, source)`
  - `CampaignCard`: `localAngleSource` state rastreia fonte localmente
  - Novo `ClassifyBanner`: aparece quando `unclassifiedCount > 0`, dismissável, botão "Classificar com IA"
  - Novo `ClassifyModal`: 4 steps (loading→review→saving→done), tabela com dropdowns editáveis,
    dots de confiança (emerald/amber/red), barra de progresso, resumo final por ângulo
  - Main modal: `showClassifyModal` + `classifyDismissed` states; `onDone` → refresh campanhas

**⚠️ MIGRATIONS PENDENTES (rodar no DBeaver):**
```
-- Migration 1
prisma/migration-2026-06-03-angle-source.sql

-- Migration 2  
prisma/migration-2026-06-03-classify-angle-prompt.sql
```
Ou: `node scripts/run-migration-fase14d.mjs`

---

### FASE 14c — Ciclo Visual de Ângulo (2026-06-03) ✅

**Objetivo:** fechar o ciclo de calibração com superfície visual — widget de
performance por ângulo, badge editável nos cards de campanha e API dedicada.

**Arquivos novos:**
- `src/app/api/admin/campanhas/portfolio/angle-insights/route.ts` — `GET
  ?period=N&clientId=X&narrative=true` retorna `AngleInsightsResult` +
  narrativa LLM opcional (template `angle_performance_insight`).

**Arquivos modificados:**
- `src/app/api/admin/campanhas/campaigns/[id]/route.ts` — novo `PATCH`: atualiza
  `declaredAngle` em campanhas existentes via `normalizeAngle()`.
- `src/app/admin/campanhas/portfolio/cross-insights/page.tsx` — adicionada seção
  "Performance por Ângulo" (FASE 14) com: `AngleWidget` (auto-fetch do período
  selecionado), `AngleCplBar` (barra CPL com cor emerald/amber/red), cards
  vencedor/perdedor, tabela por ângulo (spend vertical bar, CPL, CTR, camps),
  botão "Análise IA" que chama `?narrative=true`.
- `src/components/marketing/CampanhasModal.tsx` — `CampaignData` ganha
  `declaredAngle?`; novo `AngleBadge` com edição inline (select + CheckIcon PATCH);
  `CampaignCard` usa `localAngle` state para atualização sem reload; badge aparece
  em todas as campanhas junto a StatusBadge/FunnelBadge.

---

### Fix — AnimatePresence mode="wait" removido (2026-06-03) ✅

**Problema:** `AnimatePresence mode="wait"` em `CampaignWizard.tsx` aguardava a exit
animation completar antes de montar o próximo step. Em abas não visíveis (RAF throttling),
o exit nunca completava → conteúdo do wizard congelava enquanto header avançava. Também
causava timeout do screenshot no preview headless.

**Fix:** Removida a prop `mode="wait"` (linha 356). `AnimatePresence` sem mode monta a
entrada imediatamente → sem dependência de RAF do exit; transição ocorre mesmo com aba
em background.

---

### FASE 14b — Calibração de Ângulo (2026-06-03) ✅

**Objetivo:** agregar métricas (CPL, CTR, spend) por ângulo EFETIVO (declared_angle ??
Vision angle), identificar ângulo vencedor/perdedor e injetar o sinal no briefing
estratégico e no agentDecisor. Princípio ZERO HARDCODE: prompt no DB.

**DB:** `prisma/migration-2026-06-03-angle-performance-insight.sql` — INSERT prompt
`angle_performance_insight` (templateKey) em `public.system_prompt_templates`. Aplicada
localmente via `scripts/run-migration-fase14b.mjs`. ⚠️ NÃO aplicada no VPS (batch depois).

**Arquivos novos:**
- `src/lib/marketing/services/angleInsightsService.ts` — `getAngleInsights(periodDays,
  tenantId, clientId)`: raw SQL com JOIN Campaign → CreativeAsset → CreativeAnalysis para
  ângulo Vision + JOIN Insight para métricas; agrupa por ângulo efetivo (declared_angle ??
  Vision ?? 'unknown'); retorna `AngleInsightsResult` com `angleStats`, `topAngle`,
  `worstAngle`, `textSummary` (rule-based, pronto para injeção em variável LLM).
- `prisma/migration-2026-06-03-angle-performance-insight.sql` — prompt DB.
- `scripts/run-migration-fase14b.mjs` — runner da migration.

**Arquivos modificados:**
- `src/lib/marketing/services/strategicBriefing.ts` — importa `getAngleInsights`;
  `BriefingContext` ganha `angleInsights: AngleInsightsResult`; `gatherBriefingContext`
  popula com `await getAngleInsights(...)`; `buildBriefingVariables` injeta
  `angle_insights`, `winning_angle`, `worst_angle` como variáveis disponíveis para
  templates que as declarem (retrocompatível: sem impacto em templates antigos).
- `src/lib/marketing/services/agentDecisor.ts` — importa `getAngleInsights`; `runDecisor`
  computa `angleCtx` uma vez no topo (7 dias); `enrichWithClaude` recebe `angleCtx?` e
  injeta `winning_angle` / `worst_angle` nas variáveis do template `agent_enrich`.

**Verificação:** migration aplicada com sucesso; tsc sem erros nos arquivos alterados;
SQL testado — JOIN via `CreativeAsset.campaign_id` (snake_case, @map) →
`CreativeAnalysis.asset_id` (FK), `Insight."campaignId"` (camelCase sem @map).

---

### FASE 14a — Ângulo: captura no lançamento (2026-06-03) ✅

**Objetivo:** capturar o ângulo de comunicação DECLARADO no lançamento (hoje o angle
só é inferido pelo Vision a posteriori). Parte 14b (calibração) é a próxima.

**DB:** `prisma/migration-2026-06-03-campaign-declared-angle.sql` — `ALTER TABLE
campanhasmarketingdigital."Campaign" ADD COLUMN IF NOT EXISTS declared_angle VARCHAR(50)`
+ índice `idx_campaign_declared_angle (tenant_id, declared_angle)`. Aplicada no banco
LOCAL via `scripts/run-migration-fase14.mjs`. ⚠️ **Ainda NÃO aplicada no VPS** (migração
do VPS será feita toda de uma vez, depois).

**Arquivos:**
- `prisma/schema.marketing.prisma` — Campaign ganha `declaredAngle String? @db.VarChar(50)`.
  `npx prisma generate` rodado (NÃO db push).
- `src/lib/marketing/angles.ts` (NOVO) — taxonomia única de ângulos (investment, lifestyle,
  family, price, urgency, social, luxury, other) + `ANGLE_OPTIONS`, `normalizeAngle`,
  `angleLabel`. Mesma taxonomia do Vision, para comparar declarado × inferido.
- `src/app/api/admin/campanhas/campaigns/route.ts` — POST destructura `declaredAngle` e
  persiste `normalizeAngle(declaredAngle)` no `campaign.create`.
- `src/components/marketing/CampaignWizard.tsx` — form.declaredAngle (''); seletor
  "Ângulo da comunicação" na StepObjective (opcional, "Deixe a IA inferir"); enviado no
  payload; linha "Ângulo" na revisão.

**Verificação (runtime):** página /nova e wizard compilam sem erro; wizard abre com 7
etapas; coluna+índice confirmados no banco; prisma generate OK. (UI do seletor não dirigida
até o fim por gating de navegação do wizard + ação final destrutiva.)

---

### FASE 13 — Top N Configurável (cross-insights) (2026-06-03) ✅

**Objetivo:** remover hardcode `slice(0,3)` na polinização cruzada e tornar o número
de "melhores CPLs" configurável (Top 3/5/10).

**Arquivos modificados:**

`src/app/api/admin/campanhas/portfolio/cross-insights/route.ts`
- GET: novo `topN = clamp(parseInt(?top) , 1, 50)` (default 3); `sorted.slice(0, topN)`.
- `CrossInsightsResponse` ganha campo `top: number`; `result.top = topN`.
- POST: lê `body.top` (clamp 1..50) e repassa `&top=${topN}` ao GET interno.

`src/app/admin/campanhas/portfolio/cross-insights/page.tsx`
- Estado `top` ('3'); seletor Top 3/5/10; `load` e `generate` enviam o param.
- Badge "Top N" / "Top N de M" na seção de melhores CPLs.
- Grid responsivo `sm:grid-cols-2 lg:grid-cols-3` (acomoda 5/10).
- **Bug corrigido (pré-existente):** `PerformerCard` recebia `{...p}` (com `clientName`)
  mas espera `name` → nomes renderizavam em branco. Agora `name={p.clientName}`.

**Verificação (runtime, preview artemis4):** seletor renderiza; trocar para Top 10
dispara `GET ...?period=30&top=10`. (Sem dados de CPL no banco de teste, a seção de
top performers não renderiza — wiring provado pela requisição.)

---

### Plano — FASES 13–17 adicionadas ao plano mestre (2026-06-03) ✅

**Contexto:** Após a verificação em runtime do wizard de campanhas (6/6 PASS) e a
análise estratégica de 5 questões, o usuário pediu para formalizar tudo como FASES
13+ no plano mestre, antes da implementação.

**Arquivo modificado:** `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` (v1.4)

Acrescentadas 5 fases priorizadas por ROI/esforço, fundamentadas em leitura do código:
- **FASE 13 — Top N Configurável** (quick win): remove hardcode `slice(0,3)` em
  `cross-insights/route.ts:288`; param `?top=N`, clamp 1..50, "Top N de M".
- **FASE 14 — Ângulo Estratégico no Ciclo Completo** (maior ROI): coluna
  `Campaign.declared_angle` (nullable), captura no wizard, agregação ângulo×CPL/CTR,
  injeção em agentDecisor/briefing, prompt `angle_performance_insight`.
- **FASE 15 — Agentes: garantia de execução + expansão de ações**: node-cron não
  sobrevive em serverless → worker/endpoint+secret+heartbeat; novas ações DOWNSCALE,
  REALLOCATE_BUDGET, REFRESH_CREATIVE, ADJUST_AUDIENCE; threshold por tenant.
- **FASE 16 — Postagem Orgânica no Meta**: `publishOrganicPost` via page_id existente,
  separado do fluxo pago, confirmação dupla.
- **FASE 17 — Google Ads + Google AI Max** (fase própria): paradigma asset-based ≠ Meta;
  `GoogleCampaignInput` separado, wizard AI Max sem segmentação granular, OAuth2/
  customer_id por tenant, bloqueio sem meta de conversão.

**Próximo passo:** iniciar a implementação na ordem de prioridade (FASE 13 → 17).
**Nota:** apenas planejamento — nenhuma alteração de código/banco nesta etapa.

---

### Fix — Gráfico "Leads por Campanha" + logo clientes (histórico anterior)

### Fix — Gráfico "Leads por Campanha" (2026-06-03) ✅

**Problema:** O gráfico "Leads por Campanha" na página `/admin/campanhas/leads` sempre exibia um único retângulo grande em vez de barras individuais por campanha.

**Causa raiz:** Quando a resolução de nome de campanha falhava no cliente (array `campaigns` vazio ou IDs sem correspondência), todos os itens de `leadsByCampaign` recebiam `name: 'N/A'`. O Recharts `BarChart` renderiza todas as barras na mesma posição X quando possuem o mesmo `name`, resultando em sobreposição visual.

**Arquivos modificados:**

`src/app/api/admin/campanhas/leads/stats/route.ts`
- `leadsByCampaignRaw` ← `prisma.lead.groupBy` (sem alteração)
- Nova etapa: busca nomes das campanhas via `prisma.campaign.findMany({ where: { id: { in: campaignIds } } })`
- `leadsByCampaign` agora retorna `{ campaignId, campaignName, count }[]`
  - Filtra entradas com `campaignId: null` (leads sem campanha vinculada)
  - `campaignName` = nome da campanha OU primeiros 8 chars do UUID como fallback
  - Ordenado por `count` decrescente

`src/app/admin/campanhas/leads/page.tsx`
- `campaignLeads` agora usa `d.campaignName` (do servidor) em vez de lookup `campaigns.find()`
- Fallback: `d.campaignId?.slice(0, 8) || 'Sem campanha'` (garante nomes únicos)
- Retrocompatível: `d.count ?? d._count?.id ?? 0`

---

### Logo de Clientes + ClientAvatar compartilhado (2026-06-03) ✅

**Objetivo:** Exibir logomarca circular dos clientes na tabela Portfolio; suporte a upload/remoção na edição de cliente; componente reutilizável para futuras telas.

**Arquivos criados:**

`src/components/admin/ClientAvatar.tsx`
- Props: `name`, `logoUrl?`, `segmentSlug?`, `isTenant?`, `size?` (`xs`–`xl`), `className?`
- Mostra imagem se `logoUrl` disponível; fallback: iniciais coloridas por segmento
- `SEGMENT_AVATAR_COLORS`: mapeamento slug → classes Tailwind (imobiliaria, saude, educacao, etc.)
- Exports: `ClientAvatar` (default), `ClientAvatarWithFallback`, `getInitials`, `getSegmentAvatarColor`
- Handler `onError` no `<img>`: troca automaticamente para fallback de iniciais

`prisma/migration-2026-06-03-clientes-logo.sql`
- `ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;`
- ⚠️ **Executar manualmente no DBeaver antes de usar o upload de logo**

**Arquivos modificados:**

`src/app/api/admin/campanhas/clients/route.ts`
- GET: adiciona `c.logo_url` ao SELECT
- PATCH: reescrito com SET dinâmico — só atualiza os campos enviados (`segment_id` e/ou `logo_url`)
- Validação: `logo_url` > 1.5 MB retorna 400

`src/lib/database/clientes.ts`
- `findClienteByUuid`: adiciona `logo_url` ao SELECT

`src/app/admin/clientes/[id]/editar/page.tsx`
- Importa `ClientAvatar`
- Upload: `<input type="file" accept="image/*">` oculto → canvas resize 256×256 WebP 85%
- `handleLogoFile(file)`: valida MIME + tamanho; redimensiona via Canvas API
- `saveLogo(url)`: PATCH ao endpoint com Bearer token
- UI: avatar grande (`size="xl"`) + botão "Carregar / Alterar logo" + botão "Remover"

`src/app/api/admin/campanhas/portfolio/route.ts`
- Queries de clientes e tenant agora incluem `logo_url`
- `PortfolioClient.logoUrl` populado nos resultados

`src/app/admin/campanhas/portfolio/page.tsx`
- Importa `ClientAvatar` e exibe círculo de logo/iniciais na coluna de cliente da tabela

---

### Option B — Portfolio: linhas expansíveis + modal analítico (2026-06-03) ✅

**Objetivo:** Ao clicar em `[▶]` numa linha de cliente do Portfolio, expandir sub-linhas com campanhas individuais; cada sub-linha tem botão `[📊 Analisar]` que abre um modal com as métricas daquela campanha.

#### Arquivos modificados

**`src/app/api/admin/campanhas/portfolio/route.ts`**
- Novo tipo exportado: `PortfolioClientCampaign` (id, name, externalStatus, metrics, health)
- `PortfolioClient` agora inclui `campaigns: PortfolioClientCampaign[]`
- Adicionadas 2 novas queries SQL:
  - Query 2b: métricas por campanha (spend/impressions/clicks agrupados por `camp.id`)
  - Query 2c: leads por `campaignId` (tabela `Lead`)
- Bloco 2d: agrupa as campanhas num `Map<clientKey, PortfolioClientCampaign[]>` e anexa ao client correspondente

**`src/app/admin/campanhas/portfolio/page.tsx`**
- Novo estado: `expandedClients: Set<string>` — controla quais linhas estão expandidas
- Novo estado: `analyticsModal: ModalState | null` — controla o modal analítico
- `toggleExpand(key)` — alterna expansão de uma linha
- `renderCampaignSubRows(client)` — renderiza sub-linhas animadas (Framer Motion) com:
  - `HealthDot` colorido por health
  - Nome da campanha + status badge (ACTIVE/PAUSED)
  - Spend / Leads + CTR / CPL
  - Botão `[📊 Analisar]`
- `renderRow` atualizado: chevron toggle `[▶/▼]` integrado na coluna Cliente
- `CampaignAnalyticsModal` (inline): overlay com backdrop blur
  - 6 cards de métricas: Investimento, Leads, CPL, Impressões, Cliques, CTR
  - Barra CPL vs benchmark (quando disponível)
  - Link "Ver dashboard completo →" para `/admin/campanhas/dashboard?campaignId=X`

#### Comportamento
- Linhas sem campanhas: chevron desabilitado (cor cinza, cursor default)
- Linhas com campanhas: chevron clicável (▶ expandir / ▼ recolher)
- Modal: abre instantaneamente (dados já na resposta do portfolio, sem fetch extra)
- Modal fecha ao clicar fora (backdrop) ou no X

---

### FASE 10 — Portfolio Dashboard + Cross-Pollination (2026-06-02) ✅

**Objetivo:** Visão consolidada de todos os clientes do tenant com métricas agregadas, benchmarks por segmento, status de saúde CPL/CTR e insights cruzados entre clientes (cross-pollination).

#### Arquivos criados

**API:**

- **`src/app/api/admin/campanhas/portfolio/route.ts`** — `GET /api/admin/campanhas/portfolio`
  - Agrega campanhas/insights por `client_id` (cross-schema SQL: `campanhasmarketingdigital` + `public`)
  - Joins: `Campaign` → `Insight` (spend/impressions/clicks), `Lead` (lead_count por cliente), `public.clientes` + `public.system_segments` (nome + segmento), `public.tenants` (Minha Empresa), `public.system_benchmarks` (CPL ideal/crítico, CTR mínimo)
  - Status calculado: spend=0 → `nodata`; cpl ≥ cplCritical → `critical`; cpl > cplIdeal → `warn`; else `ok`
  - Ordenação: critical→warn→ok→nodata; desempate por spend desc
  - Query params: `period` (1–365 dias, default 30) + `segmentId` (filtro opcional)

- **`src/app/api/admin/campanhas/portfolio/cross-insights/route.ts`** — `GET|POST /api/admin/campanhas/portfolio/cross-insights`
  - GET: insights baseados em regras (sem LLM)
  - POST: adiciona narrativa LLM opcional via `getLlmClientForCampaigns()`; fallback gracioso se LLM indisponível
  - `buildRuleBasedInsights()` gera 5 tipos de insight:
    - `cross-01`: oportunidade de transferência de padrão CPL (ok → critical)
    - `critical-{name}`: alerta individual por cliente em CPL crítico
    - `nodata-01`: clientes sem campanhas ativas
    - `ctr-01`: benchmark de CTR bom → CTR fraco
    - `segment-{name}`: gap de CPL dentro do mesmo segmento (só se diff ≥ 20%)
  - `topPerformers` (top 3 por CPL) + `underperformers` (critical/warn com razão textual)

**Frontend:**

- **`src/app/admin/campanhas/portfolio/page.tsx`** — `/admin/campanhas/portfolio`
  - `StatusBadge`: dot colorido (verde/âmbar/vermelho/cinza) + label
  - `CplBar`: mini barra de progresso CPL vs ideal/crítico
  - `SummaryCard`: 4 KPI cards (total investido, total leads, CPL médio, clientes ativos)
  - `ColHeader`: colunas ordenáveis (clientName, spend, leads, cpl, status)
  - Filtro por segmento (dinâmico, extraído dos dados) + seletor de período (7/14/30/60/90 dias)
  - Aviso: "Status usa benchmark de CADA cliente — NÃO compare CPL absoluto entre segmentos"
  - Link para `/admin/campanhas/portfolio/cross-insights`

- **`src/app/admin/campanhas/portfolio/cross-insights/page.tsx`** — `/admin/campanhas/portfolio/cross-insights`
  - `InsightCard`: colapsável, cor por tipo (vermelho=warning, emerald=opportunity, violet=pattern)
  - `PerformerCard`: ranking com medalhas 🥇🥈🥉
  - Grupo de insights por tipo: warnings primeiro, depois opportunities, patterns
  - Card de narrativa LLM (gradiente violeta) quando `data.narrative` disponível
  - Botão "Gerar análise IA" → POST endpoint → atualiza narrative
  - Navegação ← de volta para portfolio

**DB — Sidebar:**

- **`prisma/migration-2026-06-02-fase10-portfolio-sidebar.sql`**
  - `system_features`: Portfolio (sort_order=8) + Cross-Insights (sort_order=9), category_id=30
  - `permissions`: read + execute para cada feature
  - `role_permissions`: espelha roles da auditoria (41=Master, 42/47=Admin)
  - `tenant_feature_overrides`: provisiona para todos os tenants que têm auditoria

**marketing-api.ts:**
- Tipos `PortfolioClient`, `PortfolioData`, `CrossInsight`, `CrossInsightsData` adicionados
- Funções `getPortfolio()`, `getCrossInsights()`, `generateCrossInsightsNarrative()` adicionadas

#### Fixes incluídos nesta sessão

**Fix — Tracking Health 500 (3 causas):**
1. `checkPixelConfigured` usava `campanhasmarketingdigital."clientes"` → corrigido para `public.clientes` (key `uuid`)
2. `checkAccessToken` referenciava `meta_token_expires_at` (não existe) → corrigido para `tnc.expires_at`; JOIN desnecessário removido
3. `clientId='own'` passado como UUID para Prisma → sanitizado em dashboard page + GET e POST da rota

**Fix — `system_benchmarks` sem coluna `is_active`:**
- Removido `AND is_active = true` das queries de portfolio e cross-insights

**FASE 10 — 100% CONCLUÍDA** ✅

**Pendente:** Executar a migração SQL na VPS (`migration-2026-06-02-fase10-portfolio-sidebar.sql`)

---

### Deploy VPS — Audit Crons registrados no scheduler (2026-06-02)

**Contexto:** Os novos crons `audit-monthly` e `audit-weekly` (FASE 9) são endpoints HTTP no `prod_app`.
Para rodar na VPS precisam ser chamados pelo `prod_feed` container via `feed-cron-scheduler.js`.

**Arquitetura de crons na VPS (resumo):**
- `prod_feed` container → `scripts/feed-cron-scheduler.js` (node-cron) → chama HTTP `http://prod_app:3000/api/cron/...`
- `agentMonitor.ts` tem crons INTERNOS ao Next.js (sync 6h, briefing 08h/18h) — esses NÃO passam pelo scheduler
- Os novos audit crons seguem o padrão HTTP do scheduler

**`scripts/feed-cron-scheduler.js`** — adicionados 2 novos `cron.schedule()`:
```js
// Audit mensal — 1º dia do mês às 09:00
cron.schedule('0 9 1 * *', async () => {
  await fetch(`${API_BASE_URL}/api/cron/campanhas/audit-monthly`, {
    method: 'POST', headers: { 'x-cron-secret': CRON_SECRET, 'Content-Type': 'application/json' }
  });
}, { timezone: 'America/Sao_Paulo' });

// Audit semanal — domingos às 18:00
cron.schedule('0 18 * * 0', async () => {
  await fetch(`${API_BASE_URL}/api/cron/campanhas/audit-weekly`, {
    method: 'POST', headers: { 'x-cron-secret': CRON_SECRET, 'Content-Type': 'application/json' }
  });
}, { timezone: 'America/Sao_Paulo' });
```

**`docker-compose.vps.yml`** — adicionados em `prod_app` e `staging_app`:
```yaml
CRON_SECRET: ${PROD_CRON_SECRET}             # valida x-cron-secret nas rotas /api/cron/campanhas/*
MARKETING_DATABASE_URL: ${PROD_MARKETING_DATABASE_URL}  # Prisma marketing schema
```
> ✅ `MARKETING_DATABASE_URL` é construída automaticamente no docker-compose a partir de variáveis já existentes
> (`DB_USER`, `PROD_DB_PASSWORD`, `PROD_DB_NAME`) — nenhuma var nova precisa ser definida na VPS.

**Arquivos modificados:**
- `scripts/feed-cron-scheduler.js` — +2 cron.schedule() para audit-monthly e audit-weekly
- `docker-compose.vps.yml` — CRON_SECRET + MARKETING_DATABASE_URL em prod_app e staging_app

**Todos os 4 crons agendados no scheduler:**
1. Feed sync diário → 03:00
2. Transbordo leads → a cada 5 min
3. Audit mensal → 1º dia do mês 09:00
4. Audit semanal → domingos 18:00

---

### Fix Leads — Série de Bugs (2026-06-02)

**Problemas corrigidos nesta sessão:**

1. **Stats não filtravam por campanha** — `stats/route.ts` nunca lia `campaignId` dos searchParams.

2. **Dados idênticos para clientes diferentes (raw SQL)** — query `leadsByDay` usava `"campaign_id"::uuid` (coluna errada + cast errado). Coluna correta é `"campaignId"` (TEXT, camelCase, sem `::uuid`).

3. **Promise.all swallowando resultados** — quando stats retornava 500, `Promise.all` descartava leads e campanhas também. Fix: `Promise.allSettled` com verificação individual.

4. **Historical leads sem client_id** — 299 leads criados antes da vinculação campaigns→clients tinham `client_id = NULL`. Backfill via `scripts/backfill-lead-clientid.mjs`: 273 para Alexandre, 26 para Gisele.

5. **Datas em formato OS (mm/dd)** — `<input type="date">` substituído por `<DateInputPtBR>` com máscara dd/mm/aaaa. Adicionada convenção obrigatória no CLAUDE.md.

6. **ClientSelector não defaultava para Minha Empresa** — `sessionStorage` era lido no mount e sobrescrevia o estado 'own'. Removidos ambos os `useEffect` de sessionStorage (hook + componente).

**Estado atual verificado:**
- `GET /leads?clientId=own` → 245 leads ✅
- `GET /leads?clientId=<alexandre>` → 113 leads ✅
- `GET /leads?clientId=<gisele>` → 26 leads ✅
- `GET /leads/stats?clientId=<alexandre>` → totalLeads: 113 ✅

**Arquivos modificados:**
- `src/app/api/admin/campanhas/leads/stats/route.ts` — filtro campaignId + raw SQL parâmetrico correto
- `src/app/api/admin/campanhas/leads/route.ts` — sem alteração (já correto)
- `src/app/admin/campanhas/leads/page.tsx` — DateInputPtBR + Promise.allSettled + getCampaigns(clientFilter)
- `src/lib/marketing-api.ts` — getLeadStats aceita campaignId
- `src/components/marketing/ClientSelector.tsx` — removido sessionStorage read; default sempre 'own'
- `src/components/ui/DateInputPtBR.tsx` — NOVO componente (máscara dd/mm/aaaa)
- `CLAUDE.md` — convenção obrigatória DateInputPtBR

**Pendente:** — (todas as pendências desta sessão foram resolvidas)

---

### DateInputPtBR global + ClientSelector Padrões Vencedores (2026-06-02)

**DateInputPtBR aplicado em 13 arquivos:**
`admin/audit`, `admin/master/auditoria`, `admin/logs`, `admin/sessions`, `admin/security-monitor`,
`admin/visitas_plataformas`, `campanhas/iniciativas/nova`, `DashboardFilters`, `AdvancedFilters`,
`ExportReports`, `crm/MarketingCampaignModal`, `crm/page`, `crm/config/marketing`

**DateInputPtBR:** prop `required?: boolean` adicionada.

**ClientSelector em `criativos/padroes/page.tsx`:**
- Hook `useClientSelector('padroes')` — default 'own' (Minha Empresa)
- `vw_creative_patterns` recriada com `client_id` (JOIN com `Campaign`)
- `patterns/route.ts`: filtro `clientId=own|uuid` via `client_id IS NULL` ou `client_id = $N`

**Nenhum `<input type="date">` restante na aplicação** (exceto o JSDoc do próprio componente).

---

### Consultar Campanhas — Modal full-page (2026-06-02)

**Funcionalidade:** Botão "Consultar Campanhas" + modal full-page para visualização das campanhas lançadas, acessível a partir de `/admin/campanhas/nova`.

**Comportamento:**
- **Para tenant (não-master):** botão na seção "Esta campanha é para", após "Para um Cliente"; respeita contexto selecionado (`clientId=own` ou `clientId=<uuid>`)
- **Para master:** botão flutuante acima da seção Criativos; carrega todas as campanhas do tenant sem filtro

**Componente:** `src/components/marketing/CampanhasModal.tsx` (NOVO)
- Grid responsivo `1 col → 2 col (lg) → 3 col (xl)`
- Cards com: status badges (ativa/pausada/arquivada/rascunho), funnel stage, objetivo, budget, período, público (idade/gênero), programação (dias da semana + horários, com suporte a `scheduleTimeSlots` por dia), localização (chips sky), interesses (chips violet, colapsável), tira de criativos (thumbnails + headline/body/CTA)
- Busca por nome + filtro por status
- Loading skeleton (6 cards), empty state, error state com retry
- Fecha com Escape ou clique no overlay
- Framer-motion enter/exit animation

**Arquivos modificados:**
- `src/components/marketing/CampanhasModal.tsx` — NOVO
- `src/app/admin/campanhas/nova/page.tsx` — import + estado `showConsultarModal` + botão (tenant e master) + `<CampanhasModal />`

**API usada:** `GET /api/admin/campanhas/campaigns?clientId=own|<uuid>` (já existia, sem alteração)

---

### FASE 9 — Cron Jobs (9.5) — 100% concluída (2026-06-02)

**Implementação do último item pendente da FASE 9 (seção 9.5 do plano mestre):**

**`src/app/api/cron/campanhas/audit-monthly/route.ts`** (NOVO)
- `POST /api/cron/campanhas/audit-monthly`
- Agendamento: `0 9 1 * *` — 1º dia do mês às 09:00
- Protegido por `CRON_SECRET` (header `x-cron-secret`)
- Itera todos os tenants ativos via `getActiveTenants()`
- Para cada tenant: gera relatório com `clientId=null` (empresa) + um por cada cliente com campanhas
- `periodDays=30`, `withNarrative=false` (evita timeout no cron)
- Retorna `{ tenants, totalReports, succeeded, failed, elapsedMs }`

**`src/app/api/cron/campanhas/audit-weekly/route.ts`** (NOVO)
- `POST /api/cron/campanhas/audit-weekly`
- Agendamento: `0 18 * * 0` — todo domingo às 18:00
- Mesma estrutura do mensal, mas `periodDays=7`
- Suporta `{ withNarrative: true }` no body para ativar narrativa LLM
- Tratamento de erro granular: falha em um relatório não interrompe os demais

**FASE 9 — 100% CONCLUÍDA** ✅

---

### Fix Leads — Filtro de Campanha nas Stats (2026-06-02)

**Problema:** Selecionar uma campanha no dropdown da página `/admin/campanhas/leads` não alterava os dados exibidos (KPIs, gráficos). A tabela de leads filtrava corretamente, mas os stats (total, gráfico por dia, por campanha) sempre mostravam tudo.

**Root cause:**
1. `/api/admin/campanhas/leads/stats/route.ts` nunca lia `campaignId` dos searchParams.
2. A query raw `leadsByDay` nunca incluía filtro de `campaign_id`.
3. `getCampaigns()` era chamado sem `clientFilter`, então o dropdown mostrava campanhas de todos os clientes.

**Fixes:**
- `src/app/api/admin/campanhas/leads/stats/route.ts` — lê `campaignId`; aplica `where.campaignId = campaignId` no `count` e `groupBy`; query raw `leadsByDay` condicional com `AND "campaign_id" = ${campaignId}::uuid`
- `src/lib/marketing-api.ts` — `getLeadStats` aceita `campaignId?: string` opcional
- `src/app/admin/campanhas/leads/page.tsx` — `getCampaigns()` passa `clientFilter` para sincronizar dropdown com cliente selecionado

---

### FASE 9 — Audit Report Estruturado (2026-06-01)

**Objetivo:** Relatório mensal/semanal com scorecard de saúde, top problemas, oportunidades, desperdício consolidado, plano de ação semanal e narrativa LLM opcional.

**Arquivos criados:**
- `prisma/migration-2026-06-01-fase9-audit-report.sql` — tabela `AuditReport` + 2 prompt templates (`audit_report_monthly`, `audit_report_weekly`)
- `prisma/schema.marketing.prisma` — model `AuditReport` adicionado
- `src/lib/marketing/services/auditReportService.ts` — serviço completo com 5 dimensões de scoring (Performance 30%, Spend Efficiency 25%, Funnel Health 20%, Tracking 15%, Creative 10%), builders de problemas/oportunidades/plano e narrativa LLM
- `src/app/api/admin/campanhas/auditoria/route.ts` — GET (lista histórico) + POST (gera e persiste)
- `src/app/admin/campanhas/auditoria/page.tsx` — Frontend com gauge, barras de dimensão, problemas/oportunidades, desperdício, plano de ação; **ClientSelector** integrado (filtro por cliente persistido em sessionStorage); `useEffect([days, clientFilter])` auto-regenera ao trocar período ou cliente

**Sidebar (corrigido):** O sistema usa `system_features` (não `sidebar_menu_items`). Inseridos:
  - `system_features` id=101, category_id=30, sort_order=7
  - `permissions` read(930) + execute(931)
  - `role_permissions` para roles 41/42/47 (Master + Administrador)
  - `tenant_feature_overrides` para tenants "Imobiliaria XYZ" e "Marketing Digital"
  - Migration: `prisma/migration-2026-06-02-fase9-sidebar-auditoria.sql`

**DB:** Migração executada, `prisma generate` rodado.

**NOTA:** Prompt templates usam `template_key` + `content` (não `key`/`template`). Confirmado estrutura real da tabela `system_prompt_templates`.

**Bugs corrigidos em 2026-06-02:**
1. Stale Prisma singleton (`global.prismaMarketing` criado antes do `generate`) → fix: alteração no comentário do `next.config.js` força restart completo do processo Next.js
2. `prisma.auditReport.upsert()` falha com campo nullable em compound unique → fix: substituído por `findFirst` + `create`/`update` manual
3. Filtros de período não re-geravam visualização → fix: `useEffect(() => generate(days, false, clientId), [days, clientFilter])`
4. Ausência de filtro por cliente → fix: `ClientSelector` + `useClientSelector('auditoria')` adicionados à página
5. `ClientSelector` dropdown vazio → root cause: `/api/admin/campanhas/clients` retorna array puro (não `{clients:[]}`); fix: `const list = Array.isArray(data) ? data : (data.clients || [])` em `useClientSelector`
6. Filtro de cliente sem efeito → root cause: campanhas tinham `client_id = NULL`; fix: vinculadas 4 campanhas a 2 clientes via UPDATE direto no DB (Alexandre Severo, Gisele Cesse)
7. `invalid input syntax for type uuid: "own"` → root cause: `clientId='own'` (valor de UI) passado para `saveAuditReport` que usa `@db.Uuid`; fix: `dbClientId = report.clientId === 'own' ? null : report.clientId ?? null` antes de qualquer operação DB
8. Seletor de cliente em toggle-pill style (igual página nova campanha) → fix: adicionado `variant="toggle"` em `ClientSelector` nas páginas dashboard e auditoria
9. Dashboard com datas em formato dd/mm/aaaa → fix: substituídos `<input type="date">` por `<DateInputPtBR>` com máscara automática
10. Filtro de campanha adicionado nas páginas dashboard e auditoria → `CampaignSelect` nativo com re-carga automática ao trocar cliente

---

### Fix Login Loop — DB Pool Exhaustion (2026-06-01)

**Problema:** Login em `http://localhost:3000/admin/login` ficava em loop infinito.

**Causa raiz:** PostgreSQL Docker container atingiu `max_connections=100`. Múltiplos serviços Docker (app:3002, feed, lead-worker) + dev local (3000) consumiam todas as conexões disponíveis. A pool usava `min=2` (conexões de aquecimento), o que desperdiçava slots.

**Sintoma técnico:** `/api/admin/auth/login` → 500 com `"Connection terminated due to connection timeout"` (pg-pool `connectionTimeoutMillis: 5000` esgotado). `useAuth.tsx` detectava falha no `/api/admin/auth/me` → `window.location.href = '/admin/login'` → loop.

**Fix aplicado:**
- `src/lib/database/connection.ts`: defaults ajustados para `max=10, min=0, idleTimeout=30s, connectionTimeout=30s, allowExitOnIdle=true`
- `.env.local` (local, não commitado): `DB_POOL_MAX=5, DB_POOL_MIN=0`
- `next.config.js`: comentário adicionado para triggering de restart do servidor (libera conexões antigas)

**Verificação:** Login retorna 200 em ~600ms; `/api/admin/auth/me` retorna 200 em ~200ms (com cookie). Auth flow completo funcional.

---



### Centralização LLM das Campanhas (2026-05-28)

Implementado um único modelo de IA global para todos os insights de campanhas da plataforma:

- **`getLlmClientForCampaigns()`** em `src/lib/marketing/services/llmClient.ts`
  - Lê `campanhasmarketingdigital."Settings" WHERE tenant_id IS NULL`
  - Fallback para `ANTHROPIC_API_KEY` do env se nenhuma config global existir
- **3 pontos de chamada atualizados** para usar a função global:
  - `src/lib/intelligence/llmInvoker.ts`
  - `src/app/api/admin/campanhas/settings/llm/test/route.ts`
  - `src/app/api/admin/master/ia-plataforma/test/route.ts`
- **UI Master** criada em `src/app/admin/master/ia-plataforma/page.tsx`
  - GET/PUT em `/api/admin/master/ia-plataforma`
  - Teste de conexão em `/api/admin/master/ia-plataforma/test`
- **Sidebar** — item "IA da Plataforma" ativo via `system_features` (`category_id=22`, `url=/admin/master/ia-plataforma`)
- **SQL** — `database/migration-2026-05-llm-centralizacao.sql` (índice único + seed linha global)

### ModulesListModal — Componente Reutilizável (2026-05-28)

- Criado `src/components/admin/master/modules/ModulesListModal.tsx`
- Usado em `src/app/admin/master/tenants/page.tsx`

### Plano Mestre — Seção 1.6 adicionada (2026-05-29)

Documentada a **Camada Operacional de Lançamento de Campanhas** (subseções 1.6.1–1.6.13):
- Fronteira automático↔manual (2 baldes, sem camada semi)
- 3 "lares de dado" a criar: page_id/pixel/ig em credentials, network_defaults em system_segments, website em tenants/clientes
- Hotfixes pré-fase identificados: bug page_id, adset_schedule, interest IDs
- Fronteira on-the-fly (1.6.13): ~85–90% dinâmico nos campos; adapter é código irredutível
- Mescla aditiva: FASE 1 expande, FASE 5 → "Video + Conversão/ROI", FASE 11 só consome

---

## Tarefa concluída

### Implementação da Camada de Lançamento — FASE 1 Expandida (2026-05-29)

**Sequência executada:**

- [x] Checkpoint iniciado
- [x] **Migração DB** — executada via rota temporária (psql local + pool Prisma)
  - ✅ `system_segments.network_defaults JSONB` criada e seedada
  - ✅ `tenants.website TEXT` criada
  - ✅ `clientes.website TEXT` criada
  - ✅ GIN index `idx_system_segments_network_defaults` criado
  - ✅ Seeds aplicados: imobiliaria (HOUSING), carros, geral, master, saude
  - Slugs reais confirmados: `imobiliaria`, `carros`, `geral`, `master`, `saude`
- [x] **Hotfix 1** — bug `page_id` corrigido em `src/lib/marketing/networks/meta/metaAdsAdapter.ts`
  - `object_story_spec.page_id` agora usa `this.pageId` (das credentials) e não `this.adAccountId`
  - Lança erro claro se `page_id` não configurado
- [x] **Hotfix 2** — `adset_schedule` agora enviado ao Meta API
  - Método `buildAdsetSchedule()` converte `scheduleStartHour/End` → minutos Meta format
- [x] **Settings premium** — `src/app/admin/campanhas/configuracoes/page.tsx`
  - Seção "Identidade Meta" com page_id, pixel_id, instagram_actor_id, website
  - API: `src/app/api/admin/campanhas/settings/meta-identity/route.ts` (GET+PUT, JSONB merge)
- [x] **ClientSelector** — `src/components/marketing/ClientSelector.tsx` (ALTA PRIORIDADE)
  - Hook `useClientSelector(storageKey)` com sessionStorage persist
  - Integrado em `dashboard/page.tsx` e `leads/page.tsx`
- [x] **CampaignWizard** — `src/components/marketing/CampaignWizard.tsx`
  - `AutoChip` para campos auto-resolvidos
  - `autoFields` state via `getMetaIdentity()` + `/segment-defaults`
  - `StepObjective` com specialAdCategory, pixelId, customEventType
  - Prop `clientId` adicionada
- [x] **API segment-defaults** — `src/app/api/admin/campanhas/segment-defaults/route.ts`
  - Resolução automática pelo segmento do tenant/cliente
  - Fallback gracioso (não quebra wizard)
- [x] **Factory** — `resolveSegmentNetworkDefaults()` em `src/lib/marketing/networks/factory.ts`
- [x] **campaigns/route.ts** — `pixelId` e `customEventType` passados para `networkService.createCampaign()`
- [x] Arquivo temporário `_run_migration.js` removido

**Arquivo de migração:** `prisma/migration-2026-05-29-launch-layer.sql`

---

## Última entrega — Camada 3 (clientes) — 2026-05-29

- ✅ `clientes.page_id TEXT`, `clientes.pixel_id TEXT`, `clientes.instagram_actor_id TEXT` — migração executada
- ✅ API `GET/PUT /api/admin/clientes/[id]/campaign-settings`
- ✅ Página `/admin/clientes/[id]` refatorada com tabs: "Dados do Cliente" | "Configurações Meta"
  - `CampaignField` com indicador "próprio" vs "usando tenant"
  - Barra de progresso de completude
  - Info bar com fallbacks do tenant
- ✅ `getNetworkServiceForTenant()` aceita `clientId` — cascata: `client.page_id ?? tenant.page_id`
- ✅ `campaigns/route.ts` passa `clientId` para cascata de credenciais

## Arquitetura de 3 camadas — COMPLETA

| Camada | Config | UI | Status |
|--------|--------|----|--------|
| **Master** | LLM global | `/admin/master/ia-plataforma` | ✅ |
| **Tenant** | Meta credentials, website, segment | `/admin/campanhas/configuracoes` → Identidade Meta | ✅ |
| **Cliente** | page_id, pixel_id, instagram, website (override) | `/admin/clientes/{id}` → aba Configurações Meta | ✅ |

## Última entrega — Fluxo de Lançamento Unificado (2026-05-29)

- ✅ **`/admin/campanhas/nova`** refatorado como Fase 1 (Criativos) + Fase 2 (Wizard)
  - Seleção de pasta via File System Access API (Chrome/Edge) com fallback `webkitdirectory`
  - Grid de imagens com seleção múltipla (máx 6) e thumbnails no footer
  - Seção "Para quem?" exibida **apenas para tenants** (oculta para Master)
  - `CreateGuard` **removido** do botão "Configurar Campanha" — era o bug que ocultava o botão para Master
  - `contextReady` como única guarda de negócio: `isMaster || campaignFor === 'own' || !!selectedClientId`
- ✅ **`/admin/campanhas/criativos`** substituído por redirect para `/nova`
- ✅ **`/api/admin/auth/me`** — campo `is_system_role` adicionado ao `userResponse`
- ✅ **`isMaster` detection** — `user?.is_system_role` + localStorage fallback (login sempre tem `is_system_role`)

### Bugs corrigidos

| Bug | Causa | Fix |
|-----|-------|-----|
| "Para quem?" aparecia para Master | `is_system_role` não retornado por `/me` | Adicionado ao `userResponse` + fallback localStorage |
| Botão "Configurar Campanha" ausente/desabilitado para Master | `CreateGuard resource="campanhas"` retornava null (sem permissão explícita na DB) | Removido `CreateGuard` — `disabled={!contextReady}` suficiente |

## Última entrega — Interesses Meta reais + Curadoria por segmento (2026-05-30)

### Problema resolvido
Os interesses no wizard usavam IDs fake (strings textuais) que o Meta ignorava silenciosamente.
Interesses agora usam IDs numéricos reais da Meta Targeting Search API.

### O que foi implementado
- **`/api/admin/campanhas/interests/search`** — busca real na Meta Graph API (`/search?type=adinterest&locale=pt_BR`); fallback gracioso se token não configurado
- **`InterestsPicker`** reescrito — busca com debounce 350ms, exibe audience size real, interesses livres como fallback
- **`InterestsPicker`** colapsado em "Avançado" — com banner explicando impacto variável (especialmente HOUSING)
- **`suggestedInterests` por segmento** — `network_defaults.meta.suggested_interests` em `system_segments`
  - `resolveSegmentNetworkDefaults` retorna `suggestedInterests[]`
  - Wizard carrega e exibe chips ⚡ do segmento antes da busca livre
- **`/api/admin/master/segments/[id]/interests`** (GET + PATCH) — Master gerencia seeds por segmento
- **`SegmentInterestsModal`** — modal na página `/admin/master/segmentos` com busca Meta API + salvar
- **Página de Segmentos do Master** — botão "✨ Interesses Meta" por segmento

### Fluxo de curadoria pelo Master
1. `/admin/master/segmentos` → clicar "Interesses Meta" no segmento
2. Modal abre → busca na Meta API → clica para adicionar → salva
3. Todos os tenants daquele segmento passam a ver os chips sugeridos no wizard

## Última entrega — Meta Pixel, WhatsApp auto e Config. Meta no tenant (2026-05-30)

### Bugs corrigidos

| Bug | Causa | Fix |
|-----|-------|-----|
| Prisma `Unknown argument 'networkId'` ao criar campanha | Campo nunca existiu no schema `Campaign` | Removido query e spread `networkId` de `src/app/api/admin/campanhas/campaigns/route.ts` |

### Novos arquivos

- **`src/components/analytics/MetaPixel.tsx`** — componente Client que injeta o snippet fbevents.js via `next/script strategy="afterInteractive"`; rastreia PageView a cada mudança de rota
- **`src/lib/analytics/getMetaPixelId.ts`** — Server helper: busca `credentials->>'pixel_id'` do tenant em `tenant_network_credentials`; falha silenciosa → string vazia
- **`src/app/api/admin/master/tenants/[id]/meta-identity/route.ts`** — GET/PUT para Master gerenciar `page_id`, `pixel_id`, `instagram_actor_id` (JSONB merge) e `website` de qualquer tenant; protegido por `is_system_role`

### Atualizações

- **`src/app/artemis4/layout.tsx`** — agora Server Component assíncrono; busca `pixel_id` do tenant master (`00000000-0000-0000-0000-000000000001`) e injeta `<MetaPixel>` se configurado
- **`src/components/marketing/CampaignWizard.tsx`** — WhatsApp Level 1: `loadAutoFields` busca `getWhatsAppConfig()` em paralelo e pré-preenche `whatsappNumber` + `whatsappMessage` com `AutoChip`; aviso pixel alterado para cinza neutro
- **`src/app/admin/master/tenants/[id]/page.tsx`** — reescrito completamente com tabs "Dados do Tenant" | "Config. Meta"; Config. Meta exibe campos: Facebook Page ID (obrigatório), Meta Pixel ID (conversões), Instagram Actor ID (opcional), Website

### Arquitetura de 3 camadas — COMPLETA (atualizada)

| Camada | Config Meta | UI | Status |
|--------|-------------|----|--------|
| **Master** | page_id, pixel_id, instagram, website | `/admin/master/tenants/{id}` → aba Config. Meta | ✅ |
| **Tenant** | Meta credentials, website | `/admin/campanhas/configuracoes` → Identidade Meta | ✅ |
| **Cliente** | page_id, pixel_id, instagram, website (override) | `/admin/clientes/{id}` → aba Configurações Meta | ✅ |

## Última entrega — FASE 4: Campaign State Machine (2026-05-30)

### O que foi implementado

- **Migração DB** — `prisma/migration-2026-05-30-fase4-lifecycle.sql` (executada via pool raw SQL)
  - `Campaign.lifecycle_status VARCHAR(20) DEFAULT 'DRAFT'`
  - `Campaign.lifecycle_changed_at TIMESTAMP`
  - `Campaign.learning_started_at TIMESTAMP`
  - `Campaign.stable_since TIMESTAMP`
  - Índice `idx_campaign_lifecycle` em `(lifecycle_status, tenant_id)`
  - Seed: ACTIVE → STABLE, PAUSED → PAUSED, outros → DRAFT
  - Tabela `CampaignLifecycleEvent` (audit log de transições; `campaign_id TEXT` pois Campaign.id é TEXT)

- **`src/lib/marketing/services/campaignStateMachine.ts`** — máquina de estados completa
  - 8 estados: `DRAFT | READY | LEARNING | STABLE | SCALING | FATIGUED | PAUSED | KILLED`
  - `VALID_TRANSITIONS` — mapa de transições permitidas por estado
  - `transitionCampaign()` — valida, atualiza `lifecycle_status`, registra em `CampaignLifecycleEvent`
  - `inferLifecycleStatus()` — regras automáticas: frequência > 3.5 + CTR drop > 30% → FATIGUED; ≥7 dias ou ≥50 conversões → STABLE; primeiros dados → LEARNING; pausado externamente → PAUSED
  - `getLifecycleHistory()` — histórico paginado

- **`src/app/api/admin/campanhas/campaigns/[id]/lifecycle/route.ts`**
  - GET — retorna histórico de transições (até 50)
  - POST — transição manual com `{ toStatus, reason }`

- **`src/components/marketing/CampaignLifecycleBadge.tsx`** — badge rico com:
  - Emoji + label colorido por estado
  - Dropdown de transições manuais (via `onTransition` prop)
  - Painel de histórico (ícone ⏰)
  - Props: `campaignId, status, changedAt?, history?, onTransition?, compact?`

- **`src/lib/marketing/services/agentDecisor.ts`** — integrado: após PAUSE executa `transitionCampaign('PAUSED', 'AGENT')`
- **`src/lib/marketing/services/agentMonitor.ts`** — integrado: após cada sync de métricas chama `inferLifecycleStatus()`

- **Dashboard** — `CampaignLifecycleBadge` integrado na tabela de campanhas (coluna "Ciclo de Vida")
  - `marketing-api.ts` Campaign interface atualizada com `lifecycleStatus`, `lifecycleChangedAt`
  - Prisma schema atualizado + `prisma generate` executado

### Validação em produção (30/05/2026)

| Cenário | Status |
|---------|--------|
| Badge renderiza STABLE / PAUSED / FATIGUED / SCALING | ✅ |
| Transição manual STABLE → FATIGUED via dropdown | ✅ |
| Transição manual STABLE → SCALING via dropdown | ✅ |
| Histórico lazy (fetch on demand) com fonte Manual | ✅ |
| `CampaignLifecycleEvent` gravado corretamente no banco | ✅ |

**Bugs corrigidos durante validação:**
- `can't resolve 'fs'` — tipos extraídos para `campaignLifecycleTypes.ts` (sem imports Node.js)
- 401 silencioso — `fetch` direto não enviava token; criado `adminFetch` helper
- `inconsistent types deduced for parameter $1` — adicionado `$1::varchar` / `$2::timestamp` no UPDATE

### Arquitetura do Estado Machine

```
DRAFT → READY → LEARNING → STABLE ⇄ SCALING
                             ↓          ↓
                          FATIGUED ←────┘
                             ↓
                          PAUSED → READY
                             ↓
                           KILLED
```

### Trigger sources
- `SYNC` — inferido automaticamente pelo agentMonitor
- `AGENT` — decisão automática do agentDecisor
- `MANUAL` — operador via API/UI
- `CRON` — jobs agendados (futuro)

---

## Última entrega — FASE 5: Video Metrics + Hook Rate (2026-05-31)

### Migração executada

`prisma/migration-2026-05-31-fase5-video-metrics.sql`
- 7 novas colunas em `campanhasmarketingdigital."Insight"`:
  - `video_views_3s`, `video_views_15s`, `video_views_25_pct`, `video_views_50_pct`, `video_views_75_pct`, `video_views_100_pct`, `thruplay_views` (todos `INTEGER NOT NULL DEFAULT 0`)
- Índice parcial `idx_insight_video ON ("campaignId", video_views_3s) WHERE video_views_3s > 0`
- Seeds `hook_rate_critical` / `hook_rate_min` / `hook_rate_good` em `public.system_benchmarks` para 5 segmentos (imobiliaria, carros, saude, geral, master)

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `prisma/schema.marketing.prisma` | 7 novas colunas `videoViews3s` … `thruplayViews` no model `Insight` |
| `src/lib/marketing/networks/types.ts` | `NetworkInsight` + 7 campos opcionais de vídeo + `breakdowns` |
| `src/lib/marketing/networks/meta/metaAdsAdapter.ts` | `fetchInsights` solicita 7 novos campos de vídeo da Meta Graph API; mapeia `video_*_watched_actions` para os campos |
| `src/lib/marketing/services/agentMonitor.ts` | `syncMetrics` persiste todos os 7 campos de vídeo no upsert do Insight |
| `src/lib/marketing/services/aiInsights.ts` | `CampaignData` + `hasVideoMetrics` / `avgHookRate`; nova regra `video_hook_weak` (ALERT com label "Hook Rate fraco"); benchmarks incluem `hook_rate_critical`/`hook_rate_min` |
| `src/lib/intelligence/benchmarkResolver.ts` | `GLOBAL_FALLBACKS` + `hook_rate_critical: 8`, `hook_rate_min: 12`, `hook_rate_good: 22` |
| `src/lib/marketing-api.ts` | `InsightData` + `videoViews3s?`, `videoViews15s?`, `thruplayViews?` |
| `src/app/admin/campanhas/dashboard/page.tsx` | Hook Rate KPI card condicional (aparece só quando `totalVideoViews3s > 0`); cor semáforo vermelho/âmbar/verde por thresholds |

### Lógica da regra Hook Rate

```
hookRate = video_views_3s / impressions * 100
hookRate < hook_rate_critical (8%)  → ALERT crítico — pausar vídeo
hookRate < hook_rate_min (12%)      → ALERT fraco  — revisar abertura
```

Thresholds por segmento resolvidos via `benchmarkResolver` (4 camadas: cliente → tenant → segmento → global fallback).

---

## Próximos passos imediatos

1. Configurar `pixel_id` do Master via `/admin/master/tenants/[master-id]` → Config. Meta (para Artemis4 funcionar)
2. **Opção A (pendente para amanhã)** — Destravar lançamento real no Meta: access_token, blob: → URL hospedada, localhost → domínio produção
3. Testar fluxo completo Master: selecionar criativos → "Configurar Campanha" → Wizard → lançar
4. Dashboard: adicionar `onTransition` no badge (requisitar permissão ao usuário antes)
5. Remover item "IMPORTAÇÃO DE CRIATIVOS" do sidebar (agora redirecionado; item confuso)

---

## Decisões tomadas em 2026-05-29

| Decisão | Racional |
|---------|----------|
| Mescla ADITIVA ao plano mestre | Seção 1.6 acrescentada, FASES 0–11 intactas |
| Fronteira on-the-fly: ~85–90% dinâmico | Campos guiados por field schema; adapter é código irredutível |
| `network_defaults` em `system_segments` | Curadoria 1x pelo Master, keyed por rede, resolve por segmento |
| `website` como coluna em tenants + clientes | Client-owned site nunca hardcoded; pré-preenche na UI |
| Sem camada "semi-auto" | Só 2 baldes: automático (vem do banco) ou manual (informado na UI) |
| YouTube = canal sob Google Ads | Sem row separado em ad_networks; mesmo adapter/credentials |

---

## Últimas entregas — 2026-05-31

### "Usar no Wizard" — loop IA → Campanha fechado

- ✅ **`ConceptModal`** (`padroes/page.tsx`) — botão **"Usar no Wizard"** por conceito gerado:
  navega para `/admin/campanhas/nova?body=...&headline=...&hookText=...`
- ✅ **`/nova`** — lê `useSearchParams` e passa `initialValues` ao `CampaignWizard`
- ✅ **`CampaignWizard`** — aceita `initialValues.{body, headline, hookText}`:
  - Popula `form.body` e `form.headline` no estado inicial
  - Step 2: banner azul "✨ Texto gerado pela IA"
  - Dica âmbar "🪝 Hook sugerido" abaixo do textarea

**Loop completo:** Dados Meta → Padrões Vencedores → Conceito IA → Wizard pré-preenchido → Lançamento → Novos dados

---

## Última entrega — FASE 7: Funnel Stage Classification (2026-05-31)

### O que foi implementado

- **Migração DB** — `prisma/migration-2026-05-31-fase7-funnel-stage.sql` (executada via Node.js pool)
  - `Campaign.funnel_stage VARCHAR(20) DEFAULT 'TOF'`
  - Índice `idx_campaign_funnel ON (funnel_stage, tenant_id)`
  - Backfill automático: `OUTCOME_AWARENESS/TRAFFIC/REACH → TOF`, `OUTCOME_ENGAGEMENT → MOF`, `OUTCOME_LEADS/SALES/APP_PROMOTION/CONVERSIONS → BOF`
  - Seed de prompt template `funnel_diagnosis` em `public.system_prompt_templates`

- **`prisma/schema.marketing.prisma`** — campo `funnelStage String @default("TOF")` adicionado ao model `Campaign`

- **`src/app/api/admin/campanhas/dashboard/funnel/route.ts`** — GET
  - Agrega métricas por estágio (TOF/MOF/BOF) via `COALESCE(funnel_stage, CASE objective...)` para fallback gracioso
  - Calcula taxas: `tof_ctr` (impressões→cliques), `mof_ltr` (cliques→leads), `bof_cvr` (leads→conversões)
  - Identifica `bottleneck`: estágio com maior share de budget e pior conversão
  - Retorna `{ stages, conversionRates, totals, bottleneck, period }`

- **`src/app/api/admin/campanhas/dashboard/funnel/diagnosis/route.ts`** — POST
  - Chama `invokeForContext({ templateKey: 'funnel_diagnosis', ... })`
  - Formata `funnel_data` e `conversion_rates` como texto estruturado
  - Retorna `{ diagnosis, generatedAt }`

- **`src/app/api/admin/campanhas/campaigns/[id]/funnel-stage/route.ts`** — PATCH
  - Override manual de `funnel_stage` (valida `TOF | MOF | BOF`)
  - Verifica ownership por `tenant_id`

- **`src/components/marketing/StageFunnelWidget.tsx`** (novo componente)
  - `StageCard`: card por estágio com spend/impressões/cliques/leads, destaque vermelho no gargalo
  - `RateArrow`: seta de conversão com cor semáforo (vermelho < 1%, âmbar < 3%, verde ≥ 3%)
  - Totais resumidos: Investimento Total / Leads Totais / CPL Geral
  - Botão "Diagnosticar gargalo com IA" → POST `/diagnosis` → painel colapsável via `AnimatePresence`
  - Diagnóstico cacheado no state (toggle show/hide após primeira chamada)

- **`src/lib/marketing-api.ts`** — novos tipos `FunnelStage`, `FunnelConversionRates`, `FunnelData7`; novas funções `getFunnelData`, `generateFunnelDiagnosis`, `updateCampaignFunnelStage`; campo `funnelStage?` em `Campaign`

- **`src/app/admin/campanhas/dashboard/page.tsx`** — `StageFunnelWidget` integrado no card "Funil de Conversão" (substitui `FunnelChart` quando dados disponíveis)

### Validação
- TypeScript check em todos os novos arquivos: exit code 0 (sem erros)
- Migração executada com sucesso: 4/4 statements OK

---

## Última entrega — FASE 8: Tracking Health Monitor (2026-06-01)

### O que foi implementado

- **Migração DB** — `prisma/migration-2026-06-01-fase8-tracking-health.sql` (executada)
  - Tabela `campanhasmarketingdigital."TrackingHealthCheck"` (`id, tenant_id, client_id, overall_score, checks, issues, created_at`)
  - 2 índices: `idx_tracking_health_tenant` (busca recente) + `idx_tracking_health_critical` (score ≤ 50)

- **`prisma/schema.marketing.prisma`** — model `TrackingHealthCheck` adicionado + `prisma generate` executado

- **`src/lib/marketing/services/trackingHealthService.ts`** — service com 7 checks:
  1. `tracking_endpoint` — endpoint `/api/r/__health_check__` responde <500 (peso 20)
  2. `leads_24h` — leads registrados nas últimas 24h (peso 20)
  3. `duplicate_rate` — taxa de leads com mesmo IP em <30s (peso 15)
  4. `pixel_configured` — pixel_id em client/tenant credentials (peso 15)
  5. `access_token` — token Meta configurado + dias p/ expiração (peso 15)
  6. `lead_latency` — latência de query como proxy de captura (peso 10)
  7. `orphan_leads` — leads sem campaignId (peso 5)
  - `runTrackingHealthCheck()` — executa os 7 checks em paralelo, calcula score 0-100
  - `saveTrackingHealthCheck()` — persiste em `TrackingHealthCheck`
  - `getTrackingHealthHistory()` — histórico paginado por tenant

- **`src/app/api/admin/campanhas/tracking/health/route.ts`**
  - `GET` — retorna `{ latest, history }` (latest = check mais recente, history = 30 últimos)
  - `POST` — executa novo check, persiste e retorna resultado completo
  - Auth: `requireApiPermission('dashboard-campanhas', 'READ')` + `getTokenPayload`

- **`src/lib/marketing-api.ts`** — tipos `TrackingCheckResult`, `TrackingHealthIssue`, `TrackingHealthResult`, `TrackingHealthData`; funções `getTrackingHealth()` e `runTrackingHealth()`

- **`src/components/marketing/TrackingHealthWidget.tsx`** — widget completo:
  - Gauge SVG semi-circular (0-100) colorido por score (verde/âmbar/vermelho)
  - Chips de issues (críticos + alertas) ou "Tudo OK"
  - Estado sem dados → botão "Executar 1ª verificação"
  - Lista expandível de todos os checks (accordion por check com detalhe)
  - Botão ↺ para re-executar check a qualquer momento
  - Loading skeleton

- **`src/app/admin/campanhas/dashboard/page.tsx`** — widget integrado entre Farol de Milha e Briefing AI
  - Props: `clientId` respeitando filtro de cliente ativo

### Validação
- Migração executada: 3/3 OK (tabela + 2 índices)
- `prisma generate` executado sem erros
- TypeScript: zero erros nos arquivos da FASE 8
- `GET /api/admin/campanhas/tracking/health` → 401 sem auth (rota compilada e ativa)

---

## Última entrega — UI Improvements: Gráficos & Funil (2026-06-01)

### Alterações implementadas

| Arquivo | Mudança |
|---------|---------|
| `src/components/marketing/charts/MultiMetricChart.tsx` | Props `xLabel?`, `yLeftLabel?`, `yRightLabel?` adicionadas; auto-deriva rótulos a partir dos metrics; rótulos renderizados em XAxis e ambos YAxis; `margin` do ComposedChart ajustado para acomodar rótulos |
| `src/components/marketing/charts/ClassicFunnelChart.tsx` | Reescrito: SVG 300×320px (era 220×240px), taper gentil (bottom 84px, era ~20px), filtro de texto mais forte (`stdDeviation="2.5" floodOpacity="0.70"`), título "Funil do Ciclo de Conversão em Vendas", cores th.num por estágio, `rateColor(rate, isDark)` |
| `src/app/admin/campanhas/dashboard/page.tsx` | Badge "FASE 7" hardcoded removido do heading "Funil por Estágio"; CPL Timeline: Gasto removido, CPL como área primária (left) + Leads como barra (right); Pie chart: inline `label` truncado substituído por legenda externa custom (flex-wrap, percentual calculado, dots coloridos) |
| `src/components/marketing/StageFunnelWidget.tsx` | Nota informativa quando MOF zero ("Sem campanhas OUTCOME_ENGAGEMENT no período"); mensagem de erro de diagnóstico mapeada: "Connection terminated" / timeout → texto amigável em PT-BR |
| `src/app/api/admin/campanhas/dashboard/funnel/diagnosis/route.ts` | Timeout 28s via `Promise.race` + `setTimeout`; resposta HTTP 504 quando timeout; mensagem de erro diferenciada timeout vs erro genérico |

### Comportamento dos rótulos de eixo (MultiMetricChart)

- **X** — sempre "Data" por padrão (override via `xLabel`)
- **Y esquerdo** — auto-deriva do primeiro metric sem `yAxisId` ou com `yAxisId: 'left'`
- **Y direito** — auto-deriva do primeiro metric com `yAxisId: 'right'`

Nenhum callsite precisou de alteração — o comportamento é 100% retrocompatível.

---

## Última entrega — FASE 8.5: Signal-Driven Anticipation (2026-06-01)

### Paradigma

Substituição do modelo de **regressão linear** (forecasting passivo) por **motor de sinais leading**
(escuta ativa da "voz do Meta"). O Farol de Milha agora responde "quando / para onde" em vez de
"o que foi previsto com base no passado".

### Migração DB executada

`prisma/migration-2026-06-01-fase85-signals.sql`:
- 6 novas colunas em `campanhasmarketingdigital."Insight"`:
  `quality_ranking`, `engagement_rate_ranking`, `conversion_rate_ranking`, `learning_status`,
  `learning_conversions` (INT), `first_impression_ratio` (FLOAT)
- Índices: `idx_insight_rankings` + `idx_insight_learning`
- Nova tabela `campanhasmarketingdigital."CalibrationSignal"` (pressureScore + signals JSONB)
- Seeds em `public.system_benchmarks`: `frequency_max`, `learning_conv_target`, `fir_floor`,
  `pressure_w_engagement`, `pressure_w_conversion`, `pressure_w_quality`, `cpm_delta_max`

### Arquivos novos

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/marketing/services/signalEngine.ts` | Motor de sinais — `computePressure()`, `detectTrend()`, `computeSignalsForCampaign()` |
| `src/lib/marketing/services/anticipationEngine.ts` | `computeAnticipation()` — heurísticas TIME-TO-FATIGUE, EXIT-LEARNING, AUDIENCE-EXHAUSTION; retorna `TimeToEvent[]` + `Trajectory[]` |
| `src/app/api/admin/campanhas/dashboard/anticipation/route.ts` | `GET /dashboard/anticipation` — todas as campanhas ativas em paralelo |
| `src/components/marketing/charts/TimeToEventBar.tsx` | Barra de contagem regressiva (verde→vermelho por urgência) |
| `src/components/marketing/charts/SignalTrajectory.tsx` | Sparkline de 7 pontos + seta direcional + implicação textual |

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `prisma/schema.marketing.prisma` | 6 campos no model `Insight` + model `CalibrationSignal` |
| `src/lib/marketing/networks/types.ts` | 6 campos FASE 8.5 no `NetworkInsight` |
| `src/lib/marketing/networks/meta/metaAdsAdapter.ts` | `fetchInsights` mapeia rankings + `firstImpressionRatio`; novos métodos `fetchAdSetDelivery()` e `fetchRecommendations()` |
| `src/lib/marketing/services/agentMonitor.ts` | `insightBase` persiste 4 novos campos de sinal |
| `src/lib/marketing/services/aiInsights.ts` | `CalibrationAction` union type; `SIGNAL_RULES` (5 regras); retorno `{ insights, calibrationActions }` |
| `src/lib/intelligence/benchmarkResolver.ts` | 6 novos `GLOBAL_FALLBACKS` para sinais |
| `src/lib/marketing/services/agentDecisor.ts` | Caller corrigido para `result.insights` |
| `src/lib/marketing/services/strategicBriefing.ts` | Caller corrigido para `aiResult.insights` |
| `src/app/api/admin/campanhas/insights/ai/route.ts` | Retorna objeto completo `{ insights, calibrationActions }` |
| `src/lib/marketing-api.ts` | Tipos FASE 8.5 + `getAnticipation()` + `getCalibrationInsights()` |
| `src/app/admin/campanhas/dashboard/page.tsx` | Farol de Milha substituído pelos novos componentes; projeções legadas em `<details>` colapsável |

### Heurísticas implementadas

| Evento | Lógica |
|--------|--------|
| `TIME-TO-FATIGUE` | `daysUntil = ceil((freqMax − freqNow) / Δfreq_dia)` |
| `TIME-TO-EXIT-LEARNING` | `daysUntil = ceil(remaining_conv / avg_conv_3d)` |
| `AUDIENCE-EXHAUSTION` | `first_impression_ratio < fir_floor` ou caindo (detectTrend) |

### `computePressure()` — normalização de sinais

```
pressureScore = rankPressure × 60% + trendPressure × 40%
rankPressure  = weighted avg dos 3 rankings Meta (engagement/conversion/quality)
trendPressure = contribuição de CPM + frequência crescente
```

Limiares resolvidos via `benchmarkResolver` (4 camadas: client → tenant → segment → global fallback).

### Validação pré-teste
- TypeScript: zero erros nos arquivos FASE 8.5
- Rota `/dashboard/anticipation` compilada e registrada
- Dashboard page: Farol de Milha renderiza seção de sinais; projeções legadas em `<details>`

---

## Pendências registradas

### 1.7 — Thresholds da State Machine por ENV (pendente)
Thresholds `LEARNING_DAYS`, `FATIGUE_FREQUENCY`, `FATIGUE_CTR_DROP` hardcoded em `campaignStateMachine.ts`.
Mover para variáveis de ambiente. Ver `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` seção 1.7.

### 1.8 — Hook Rate KPI com thresholds dinâmicos (pendente)
Card visual do dashboard usa `8` e `12` hardcoded; regra de IA já usa `benchmarkResolver`.
Ver `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` seção 1.8.

### 1.10 — Revisão do modelo de predições → FASE 8.5 ✅ CONCLUÍDA (2026-06-01)
Paradigma virado de regressão linear para **motor de sinais leading**. Ver seção
"Última entrega — FASE 8.5" acima.

### 1.9 — Gestão de Providers e Modelos LLM pelo Master (pendente)
UI CRUD para a tabela `LlmModel` em `/admin/master/ia-plataforma` (nova aba "Catálogo de Modelos").
Permite ao Master adicionar providers, ativar/desativar modelos e marcar recomendados sem SQL.
Ver `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` seção 1.9.

**Endpoints a criar:** `GET/POST /api/admin/master/llm-models`, `PUT/PATCH/DELETE /api/admin/master/llm-models/[id]`
**Arquivos principais:** `src/app/admin/master/ia-plataforma/page.tsx` (nova aba), `src/lib/marketing-api.ts`

### FASE 6.5 — Produção de Criativos por Reaproveitamento (pendente) ← NOVO
Fecha o último elo do loop FASE 6: transforma padrão vencedor + conceito da IA em **arquivos de
criativo prontos para lançar**, reaproveitando fotos reais existentes (nunca síntese do imóvel).
Segregado em 2 estágios. Ver `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` seção FASE 6.5.

- **Estágio A — Imagens (CUSTO ZERO, avançar agora):** composição programática com **Sharp + SVG**
  (grátis, já no stack); overlay do copy já gerado + branding + smart-crop multi-formato (1:1/9:16/4:5);
  gate de aprovação humana → vira CreativeAsset lançável. Sem API paga, sem GPU.
  - Requer: object storage (S3/R2) — que também resolve a pendência do `blob:` no lançamento.
  - Novas tabelas: `CreativeTemplate`, `CreativeGenerationJob` + colunas `derived_from_asset_id`/`ai_generated`.
- **Estágio B — Vídeos (custos permitidos, futuro):** reels a partir das fotos reais (Ken Burns +
  Creatomate/Shotstack; image-to-video Luma/Kling/Veo). Provider configurável pelo Master (análogo à 1.9),
  com teto de gasto + rate-limit + webhooks. Reusa toda a infra do Estágio A.

**Prioridade:** Estágio A média-alta (após object storage); Estágio B baixa/futuro.

---

## Pendências anteriores (ainda abertas)

- **Auditoria de permissões CRUD** — `CreateGuard`/`UpdateGuard`/`DeleteGuard` criados, apenas `clientes` protegido. Os demais 30+ módulos ainda sem proteção.
- **Sync Meta real** — validar `POST /insights/sync` com token de produção.
- **Alerta de token Meta expirando** — campo `meta_token_expires_at` existe no tenant, falta notificação na UI.
- **Endpoint CPL por período** — não existe, agregar `spend / count(leads)` por intervalo de datas.

---

## Referências

- `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` — Plano completo das 11 fases (versão 1.3.1)
- `docs/ACCESS_CONTROL.md` — Lógica de controle de acesso e sidebar
- `CLAUDE.md` — Documentação técnica principal (arquitetura, APIs, infra)
