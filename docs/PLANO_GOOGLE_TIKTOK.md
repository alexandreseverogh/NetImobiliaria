# PLANO — Google Ads + TikTok + Consolidação Multi-Rede (Recorte: Gera Decisão)

> **Status:** 2026-07-20 (v2.0) — Fase 1 (Google Ads) **code-complete**, aguardando Developer Token
> para validação contra API real. Colaboração multi-agente **encerrada** — todo o trabalho
> consolidado no diretório principal `net-imobiliaria`, branch `feature/ag-cockpit-camadas`.
> **Escopo:** Extensão multi-rede do sistema de campanhas + refinos de consolidação de UI/decisão.
> **Fontes:** este documento + `docs/CHECKPOINT.md` (estado de execução detalhado).

---

## Sumário de Versões

| Versão | Data | Mudança |
|--------|------|---------|
| v1.0 | 2026-07-19 | Plano inicial Google + TikTok, auditoria de arquitetura, decisões com o usuário |
| **v2.0** | **2026-07-20** | Status atualizado (Fase 1 implementada) · fim da coordenação multi-agente · **3 itens de trabalho novos** (D1 rede-como-filtro, D2 regra de consolidação da Visão Executiva, D3 rótulo de rede no WhatsApp) + nota de confirmação sobre cobertura das abas · **Apêndice I — GEO/AEO** (reflexão futura) · **Apêndice II — Scraping de Inteligência de Mercado** (avaliação futura detalhada) |

---

## Auditoria + Decisões de Arquitetura (2026-07-19 — mantido como registro)

Duas decisões estruturais foram tomadas com o usuário antes de completar a implementação. Ambas
já estão aplicadas no código.

### 1. Identificador de rede — `network_id` (existente), não `ad_network` (descartado)

- Reusada a infraestrutura madura: `public.ad_networks` (Meta/Google/LinkedIn/TikTok cadastrados,
  `capabilities` JSONB por rede) + `Campaign.network_id` (FK). A coluna paralela `Campaign.ad_network`
  (código exploratório, migração nunca aplicada) foi descartada.
- **Bug pré-existente corrigido de brinde:** a criação de campanha nunca setava `network_id` — as
  24 campanhas existentes tinham `network_id = NULL`, quebrando silenciosamente a agregação
  "Distribuição por Rede". `campaigns/route.ts` agora resolve `ad_networks.id` pelo `networkCode` e
  seta `network_id` em QUALQUER campanha.
- **Schema drift corrigido:** `networkId` mapeado no `schema.marketing.prisma`;
  `external_id`/`network_metadata` seguem via raw SQL (mesmo padrão de sempre).

### 2. Credenciais Google — `tenant_network_credentials` (genérica), não `GoogleAdsConfig` (descartada)

- Consolidado na tabela genérica multi-rede já usada pelo Meta (`credentials` JSONB + `account_id`,
  join com `ad_networks`). O model dedicado `GoogleAdsConfig` (nunca migrado no banco, quebraria em
  runtime) foi removido do Prisma. LinkedIn/TikTok herdam o mesmo mecanismo — zero tabela nova por rede.

---

## PARTE 0 — Princípios Inegociáveis

| Princípio | Regra |
|-----------|-------|
| **Portão do KPI** | Nenhum dado entra em tabela ou tela sem uma decisão amarrada (regra de agente ou decisão de negócio). Métrica de observação = descartada |
| **Multi-segmento por config** | Zero código por vertical. Toda diferença de segmento vive em `network_defaults` (JSONB) e nos benchmarks/ângulos que já existem por segmento |
| **Não comparar banana com abacaxi** | Só se consolida na mesma métrica o que é semanticamente igual entre redes. Métrica exclusiva de uma rede nunca é blendada — vira drill-down segmentado (ver §D2) |
| **Fora de escopo** | ❌ SEO, Search Console, PageSpeed, Google Maps/GBP, SerpAPI, NAP · ❌ Quality Score/Auction/Device/Daypart como cards passivos · ❌ Hashtag/sound metrics do TikTok · ❌ GEO/AEO (Apêndice I) · ❌ Scraping de leads individuais (só inteligência agregada — Apêndice II) |
| **Reuso máximo** | Só se constrói o que a arquitetura ainda não faz. Agentes, dashboard consolidado, desperdício, briefing, fila de aprovação reaproveitados intactos |

---

## FASE 1 — GOOGLE ADS  ✅ *code-complete, aguardando Developer Token*

### A1. Dependências Externas (Caminho Crítico)

| Dependência | Prazo Real | Bloqueia | Status |
|-------------|-----------|----------|--------|
| **Developer Token** (Google Ads API, nível Basic) | 5–15 dias úteis de aprovação | Validação real de tudo | 🔴 **Ainda não solicitado — é O bloqueador** |
| **OAuth2 client** (client_id/secret/refresh_token) | 1 dia | Autenticação por tenant | ⏳ Pendente |
| **Conversion Action** em conta Google Ads | 1 dia | Otimização por lead | ⏳ Pendente |
| **customer_id por cliente** | por cliente | Multi-cliente | ⏳ Pendente |

> **Nota honesta de cobertura:** todo o código da Fase 1 (adapter, coletor, agente, dashboard)
> foi validado por revisão + testes de UI/banco com dados de teste persistentes
> (`prisma/seed-demo-google-ads.sql`). **Nada foi exercitado contra a API real do Google** — o
> Developer Token é o que destrava `createCampaign`/`addNegativeKeyword`/`fetchInsights` reais.

### A2. Modelo de Dados — ✅ aplicado (`migration-2026-07-19-google-ads-a2.sql`)

- **4 colunas novas em `Insight`** (grão campanha-dia): `search_impression_share`,
  `search_budget_lost_is`, `search_rank_lost_is`, `conversions_value`.
- **`GoogleSearchTerm`** (grão termo-dia) — sustenta a negativação automática.
- **`GoogleNegativeKeyword`** — memória do que já foi negativado (evita duplicação pelo agente).

### A3. GoogleAdsAdapter — ✅ tirado do mock

- `createCampaign` cria Asset Group real (assets de texto+imagem via `customer.assets.create`,
  vinculados por `AssetGroupAsset` com `field_type`). **Bug real corrigido:** extração de
  `resource_name` usava `[0].id` (sempre `undefined`) — corrigido para `.results[0].resource_name`.
- `uploadCreative` faz upload real de imagem.
- `fetchInsights` busca IS/ROAS reais (antes mockados).
- `addNegativeKeyword` (Google-only) e `fetchSearchTerms` (GAQL `search_term_view`) — novos.

### A4. Coleta de Métricas — ✅

`collectGoogleSearchTerms()` no `agentMonitor`, disparado só para campanhas Google no mesmo loop de
`syncMetrics`; grava em `GoogleSearchTerm` sem resetar status de termo já tratado.

### A5. Config por Segmento — ✅ (3 segmentos)

`network_defaults.google` em Imobiliário, Carros e Geral: `campaign_types`, `bidding_strategy`,
limites de headline/description, `negative_seed_terms`, `impression_share_target`,
`negation_spend_threshold_pct`. **Zero código por vertical.**

### A6. Agentes e Regras de IA — ✅

- **`googleNegationService.ts`** + **`googleNegationCore.ts`** (mecânica extraída para evitar import
  circular): lê `GoogleSearchTerm`, propõe negativo quando gasto > X% sem conversão (X do segmento).
- **Ação `ADD_NEGATIVE_KEYWORD`** (defensiva, auto-executa) na fila de aprovação existente.
- **Regra `IMPRESSION_SHARE_OPPORTUNITY`** (SCALE quando IS Lost Budget alto + CPL já bom) com
  benchmark `is_lost_budget_scale_min` no padrão de 4 camadas.
- **Bug real corrigido em `executeAction()`:** usava `campaign.networkCode`/`external_id` (campos
  inexistentes) — toda campanha caía no fallback `'meta'`. Corrigido para resolver via `ad_networks`.

### A7. Dashboard — ✅ (com dívida de UX, ver §D1)

- `leadsByNetwork` agrupa por código de rede (join `ad_networks`), não UUID cru. **Bug corrigido:**
  `spendByNetwork` usava `i.adNetwork` (campo inexistente) → sempre `{undefined: total}`.
- `cplByNetwork` no response; card "CPL Médio" ganha breakdown Meta × Google.
- Aba de drill-down "Google Ads" (ROAS + IS Lost por campanha, tabela de Search Terms com botão
  "Negativar"). **⚠️ Esta aba é dívida de UX** — deve virar filtro de rede (§D1).

### A10. Sequenciamento — estado real

| Passo | Entrega | Status |
|-------|---------|--------|
| 1 | Solicitar developer token | 🔴 **Não feito** |
| 2 | Migrations A2 | ✅ Aplicadas |
| 3 | Adapter A3 real | ✅ Código pronto, não testado contra API real |
| 4 | Coletor Search Terms A4 | ✅ |
| 5 | Config por segmento A5 | ✅ (3 segmentos) |
| 6 | Agente Negativação + regra IS A6 | ✅ |
| 7 | Dashboard A7 | ✅ (refinar via §D1) |

**DoD Fase 1 (bloqueado pelo token):** lançar campanha Google real · ver CPL comparável ao Meta ·
agente propor ≥ 1 negativo de verdade.

---

## PARTE D — Consolidação Multi-Rede e Decisão *(NOVO na v2.0)*

> Saiu da revisão do modelo de abas do dashboard. Nenhum item depende do Developer Token — são
> refinos de UI/decisão sobre o que já está implementado. Baratos, alto retorno de clareza para a
> tomada de decisão.
>
> **São 3 itens de trabalho (D1, D2, D3).** O antigo "D4" era só uma **confirmação** (as abas de
> profundidade já cobrem Google automaticamente) — virou a nota ao final da Parte D, não é tarefa.

| Item | Implementar? | Esforço |
|------|-------------|---------|
| **D1** — rede vira filtro + Search Terms migra pra Inteligência Profunda | ✅ Sim | UI (médio) |
| **D2** — regra "não blendar ROAS/IS/Hook Rate" | ⚠️ Guarda de design | Quase nenhum código (hoje não blenda) |
| **D3** — rótulo de rede no "Resumo do Ciclo" (WhatsApp) | ✅ Sim | Pequeno (`agentNotificador.ts`) |
| ~~D4~~ — abas já cobrem Google | ❌ **Não** (confirmação) | Zero — ver nota ao final |

### D1. Rede vira FILTRO, não aba *(refactor de UI)*

**Problema:** hoje `activeLayer` tem 4 valores (`COMMAND | ANALYTICS | DEEP_DIVE | GOOGLE`) e a 4ª é
literalmente rotulada "Google Ads" — o que **contradiz** o modelo agnóstico de rede. As 3 abas de
profundidade deveriam ser o eixo permanente; rede deveria ser um filtro no topo, como
segmento/cliente/campanha já são.

**Alvo:**
1. Adicionar `network` ao conjunto de filtros do topo (Todas / Meta / Google / TikTok), lendo de
   `ad_networks` (só mostra redes com dado real no escopo, mesmo padrão do card de CPL).
2. **Remover a aba "GOOGLE"** (`activeLayer` volta a 3 valores).
3. Mover o bloco de Search Terms / IS Lost para **dentro da Inteligência Profunda**, renderizado
   condicionalmente quando a rede Google está no escopo — é drill-down tático, pertence à camada
   mais funda, não a um eixo paralelo.

**Custo:** só UI. Os dados (`leadsByNetwork`, `cplByNetwork`, `GoogleSearchTerm`) já existem.
**Arquivos:** `dashboard/page.tsx` (estado de filtro + condicional), `GoogleAdsView.tsx` (vira
sub-componente de `DEEP_DIVE`, não aba).

### D2. O que consolida na Visão Executiva (regra banana × abacaxi)

**Pode blendar (com breakdown por rede quando há ≥2 redes):**

| Métrica | Por quê é comparável |
|---------|----------------------|
| Gasto total | Real é real em qualquer rede |
| Leads totais | Lead é lead |
| CPL médio | "Onde meu real rende mais lead" — decisão de realocação. Já mostra Meta × Google lado a lado |

**NÃO blendar (segregar por rede, senão é banana com abacaxi):**

| Métrica | Por quê NÃO |
|---------|-------------|
| **ROAS** | Google mede valor de conversão nativamente; Meta (como configurado) geralmente não. Média conjunta = número sem significado |
| **Impression Share / Search Terms** | Conceito exclusivo de busca (Google). Sem equivalente em Meta/TikTok |
| **Hook Rate / retenção** | Só existe em vídeo. Já é condicional (`video_views_3s > 0`) |

**Health Score deve ser rede-consciente:** o algoritmo (corrigido nesta linha de trabalho para usar
tendência real de CPL) já opera sobre `chartData` agnóstico. Quando o filtro de rede estiver ativo,
o score reflete só aquela rede — é o comportamento correto, não precisa de mudança estrutural, só
respeitar o filtro de §D1.

### D3. Rótulo de rede no "Resumo do Ciclo" (WhatsApp) *(gap real encontrado)*

**Achado:** `agentNotificador.ts` monta o "🤖 *Resumo do Ciclo — Marketing Digital*" agrupando ações
por **tipo** (Escalar / Pausar / Reduzir), **não por rede**. Com Google (e futuramente TikTok) no ar,
uma ação "escalar" do Google e uma do Meta apareceriam misturadas sem dizer de qual rede — reduz a
clareza da decisão que o gestor toma no celular.

**Alvo:** rotular a rede em cada linha do resumo quando houver multi-rede no ciclo (ex.:
`📈 Escalar · [Google] Campanha X · CPL R$ 18` vs. `📈 Escalar · [Meta] Campanha Y`). O motor de
decisão (`agentDecisor`) **já é agnóstico de rede** nas regras principais (PAUSE/SCALE/DOWNSCALE/
OPTIMIZE leem gasto/CTR/leads/CPL, que existem em qualquer rede) — só falta o rótulo na saída.
**Custo:** pequeno, confinado a `agentNotificador.ts` (a rede já está resolvível via `network_id`).

### Nota de confirmação (não é tarefa) — abas Análise de Dados e Inteligência Profunda já cobrem Google

> Registrado aqui para responder à pergunta "essas duas abas também são alimentadas por Google/
> TikTok?". **Resposta: sim, e nada precisa ser implementado para isso.** Não confundir com item de
> trabalho — por isso deixou de ser numerado como "D4".

**Verificado no código** (`dashboard/full/route.ts`): a consulta base filtra por tenant, segmento,
cliente, objetivo, status e campanha — **nunca por rede**. Logo, campanhas Google já entram na
agregação que alimenta evolução, funil, distribuição e insights de IA dessas duas abas,
automaticamente. Não há filtro que exclua o Google, então não há nada a "ligar".

**A única exceção** é a métrica *exclusiva* do Google (Search Terms/IS) — mas realocá-la é trabalho
do **§D1**, não desta confirmação. **TikTok** flui pelo mesmo caminho agnóstico assim que o adapter
existir (Fase 2), também sem trabalho específico aqui.

---

## FASE 2 — TIKTOK (Só Após Fase 1 Estável)

### B1. Dependências Externas

| Dependência | Prazo |
|-------------|-------|
| App aprovado no TikTok for Business + Marketing API v1.3 | Aprovação (dias) |
| Access token por advertiser (OAuth) | Por cliente |

### B2. Modelo de Dados — Reuso Alto (0 tabela nova)

| Item | Estado |
|------|--------|
| **Insight** (impressões, cliques, spend, conversões, CPL, ROAS) | ✅ Reuso (grão campanha-dia) |
| **Métricas de vídeo** (videoViews3s/15s/25/50/75/100Pct, thruplayViews) | ✅ Já existem (Fase 5, Meta) |
| **rede = 'tiktok'** | ✅ Já em `ad_networks`, só usar |
| **Search Terms / Negativação** | ❌ N/A (TikTok não é rede de busca) |

### B3. Adapter TikTok (Do Stub à Produção)

| Item | Ação |
|------|------|
| **Biblioteca** | SDK oficial `tiktok-business-api-sdk` (JS) |
| **createCampaign** | campanha → ad group → ad (parecido com Meta, reusa `CreateCampaignInput`) |
| **uploadCreative** | Upload de vídeo |
| **fetchInsights** | Métricas base + retenção → colunas de vídeo já existentes |
| **updateCampaignStatus, validateCredentials** | Padrão Meta |

### B4. KPIs TikTok

| KPI | Decisão | Estado |
|-----|---------|--------|
| CPL/rede, ROAS, alocação | "qual canal rende → realocar" | ✅ Reuso |
| Hook Rate / retenção 3s | "criativo prende? senão REFRESH_CREATIVE" | ✅ Infra já existe |
| ❌ Hashtag/sound/trending | Vaidade | Fora de escopo |

### B5–B7. Config / Criativo / Dashboard

- `network_defaults.tiktok` por segmento (zero código).
- Único investimento novo real: template de **vídeo** no `creativeGenerationService` (TikTok é
  vídeo-first). Vision (`creativeAnalysisService`) reusa — análise de criativo é universal.
- Dashboard: entra no filtro de rede (§D1) + CPL/rede automaticamente. Drill de Hook Rate reusa o
  componente do Meta.

### B8. DoD Fase 2

Lançar campanha TikTok real · ver CPL no consolidado com Meta + Google · agente propor REFRESH por
Hook Rate baixo.

---

## PARTE C — Governança Transversal

- **Governança de KPI:** toda proposta de KPI passa pelo portão "isso muda uma decisão?". Se não, não entra.
- **Multi-segmento:** antes de cada rede ir a produção, ≥ 2 segmentos configurados via `network_defaults`.
- **Teste:** cada adapter validado com conta real antes de habilitar o agente a executar. Adapter mock **nunca** aciona ação automática (é por isso que o agente de negativação Google só executa de verdade após o Developer Token).

### Riscos Principais

| Risco | Mitigação |
|-------|-----------|
| Adapter em mock acionando ação real | Gate de "adapter validado" antes de liberar agente automático |
| TikTok vídeo → custo novo de pipeline | Verificar ROI do template de vídeo antes de escalar |
| Consolidação enganosa (blend indevido) | Regra §D2 — métrica exclusiva nunca blenda |

---

## Resumo de Esforço e Reuso

| Frente | Tabelas Novas | Colunas Novas | Agentes Novos | Estado |
|--------|---------------|---------------|---------------|--------|
| **Google** | 2 | 4 em Insight | 1 (Negativação) | ✅ code-complete, falta Developer Token |
| **Consolidação (Parte D)** | 0 | 0 | 0 | ⏳ 3 itens de trabalho (D1/D2/D3), sem bloqueio externo |
| **TikTok** | 0 | 0 (reusa vídeo) | 0 (reusa REFRESH_CREATIVE) | ⏳ Após Fase 1 estável |

---

## Próximos Passos (ordem sugerida)

1. **Solicitar Developer Token Google Ads API** (5–15 dias) — único item com prazo externo.
2. **Parte D (não bloqueada):** §D1 rede-como-filtro → §D3 rótulo de rede no WhatsApp → §D2 é
   validação da regra (pouco código). Entregável de clareza de decisão independente do token.
3. **Quando o token chegar:** fechar DoD Fase 1 (campanha real + CPL comparável + negativo real).
4. **Depois:** Fase 2 (TikTok).

Pendências gerais do módulo (fora deste plano, registradas no `CLAUDE.md`): Seletor de Cliente nas
UIs (backend pronto), sync Meta real com token de produção, endpoint CPL por período, redesign
premium (`/impeccable`).

---

# APÊNDICE I — GEO / AEO (Reflexão Futura, NÃO Implementar Agora)

> **Natureza:** projeto à parte, mesma lógica pela qual SEO ficou fora deste plano. Documentado aqui
> só para não se perder. **Nada a implementar nesta linha de trabalho.**

## O que é

- **GEO — Generative Engine Optimization:** otimizar para ser citado/recomendado por motores
  generativos (ChatGPT, Perplexity, Google AI Overviews, Gemini) quando um usuário pergunta algo
  relacionado ao negócio do tenant.
- **AEO — Answer Engine Optimization:** otimizar para "featured answers" e caixas de resposta direta.

## Por que é projeto separado (não cabe neste plano)

Este plano vive de **telemetria de plataformas de anúncio pago** (Meta/Google Ads/TikTok APIs).
GEO/AEO operam sobre **superfícies e fontes de dados completamente diferentes**: conteúdo do site,
dados estruturados (schema.org), autoridade de domínio, presença em fontes que os LLMs indexam.
Não há sobreposição de modelo de dados, agente, ou tela. Forçar isso aqui violaria o princípio de
"reuso máximo / não misturar domínios".

## A única ponte real (registrar para o futuro)

A **base de conhecimento RAG** que já construímos no módulo de Mensageria (markdown estruturado +
embeddings + retrieval híbrido) é, na prática, **uma peça de fundação para AEO**: é exatamente o
tipo de conteúdo estruturado, factual e "citável" que motores de resposta consomem. Se um dia
GEO/AEO virar projeto, não se parte do zero — o conteúdo curado da KB é reaproveitável como fonte
canônica. Não é AEO ainda; é o alicerce mais próximo que já existe.

## Sinais de que valeria a pena atacar (gatilhos futuros)

- Tenants relatando que "clientes chegam dizendo que o ChatGPT recomendou".
- Queda mensurável de tráfego orgânico com alta de tráfego "dark" (IA).
- Um segmento onde a concorrência já domina respostas de IA.

**Decisão hoje:** anotado, não priorizado. Requer projeto próprio com escopo, dados e telas próprios.

---

# APÊNDICE II — Scraping de Inteligência de Mercado Agregada (Avaliação Futura Detalhada)

> **Natureza:** projeto à parte, para **avaliar lá na frente**. Detalhado ao máximo aqui (processos,
> dados, UI/UX, KPIs, insights, IA, governança) para servir de base de decisão quando chegar a hora.
> **Recorte deliberado:** SOMENTE inteligência **agregada de mercado/concorrência** (o que
> concorrentes anunciam, volume de anúncios num nicho, tendências de preço). **NÃO** é scraping de
> leads/indivíduos — essa outra vertente foi descartada por exposição LGPD (ver §II.9).

## II.1 — Proposta de Valor (o "cardume" antes da isca)

Hoje a plataforma olha para **dentro** (telemetria das campanhas do próprio tenant) e para
**demanda macro** (Radar de Demanda via Google Trends). Falta o olhar para o **lado** — o que a
concorrência está fazendo, com que intensidade, com que mensagem e a que preço. Isso responde
perguntas que nenhum dado interno responde:

- "Estou entrando num nicho saturado ou num oceano azul?" (complementa o Radar de Demanda).
- "Que ângulo de comunicação meus concorrentes estão martelando — e qual eu deveria testar/evitar?"
- "O criativo do concorrente que está no ar há 4 meses provavelmente converte — o que ele diz?"
- "O preço médio anunciado no meu nicho/geo subiu ou caiu no último trimestre?"

## II.2 — Fontes de Dados (públicas e legítimas, em ordem de preferência)

| Fonte | O que dá | Legitimidade | Via |
|-------|----------|--------------|-----|
| **Meta Ad Library API** | Todos os anúncios ativos de qualquer página, com criativo + cópia + data de início | ✅ API oficial pública do Meta | API direta (preferível) ou actor Apify |
| **Google Ads Transparency Center** | Anúncios ativos por anunciante/região | ✅ Público oficial | Actor Apify (não tem API aberta) |
| **TikTok Creative Center / Top Ads** | Top anúncios por país/indústria | ✅ Público | Actor Apify |
| **Portais do segmento** (imobiliário: preços/volume de anúncios) | Preço mediano, dias no ar, volume por bairro/geo | ⚠️ Sujeito a ToS do portal — usar com parcimônia, preferir dados agregados | Actor Apify + curadoria |

**Princípio de fonte:** preferir sempre **Ad Libraries oficiais** (Meta/Google/TikTok são públicas
por desenho regulatório — transparência de anúncios político/social empurrou todas a abrir isso).
Scraping de portal só para **estatística agregada de preço**, nunca para dados de indivíduo.

**Sobre Apify:** é orquestrador de "actors" (scrapers prontos, ex.: `Meta Ad Library Scraper`,
`Google Ads Transparency`). Cobra por execução/uso. Vantagem: não mantemos scraper próprio (frágil a
mudança de layout). Desvantagem: custo por run + dependência de terceiro. Alternativa para Meta
especificamente: a API oficial da Ad Library é gratuita e mais estável que qualquer scraper.

## II.3 — Processos

```
Curadoria (humano)        →  Coleta (cron)           →  Enriquecimento (IA)       →  Consumo (UI + agente)
--------------------------   ----------------------     -----------------------      ----------------------
Master/tenant cadastra       Job agendado dispara       Vision analisa criativo      Radar Competitivo (UI)
concorrentes a monitorar     actor Apify / Ad Lib API   LLM classifica ângulo        alimenta Radar de Demanda
+ nicho/geo/segmento         por concorrente/nicho      dedup por fingerprint        gera insight p/ briefing
```

1. **Curadoria** — o tenant (ou Master por segmento) cadastra os concorrentes a acompanhar
   (páginas Meta, domínios, anunciantes) + o escopo (nicho, geo, segmento). Sem curadoria não há
   coleta — evita raspar a internet inteira e controla custo.
2. **Coleta agendada** — cron (mesmo padrão do `exogenous-signals` que já existe) dispara a coleta
   por concorrente/nicho, com **rastreio de proveniência e custo** de cada run (Apify cobra).
3. **Dedup + versionamento** — cada anúncio tem um *fingerprint* (hash de criativo+cópia); a mesma
   peça vista em dias diferentes vira `first_seen`/`last_seen` (não linha duplicada). Longevidade =
   sinal de que converte.
4. **Enriquecimento por IA** — reaproveita 2 serviços que já existem: `creativeAnalysisService`
   (Vision descreve o criativo do concorrente) e o classificador de ângulo (LLM mapeia a cópia para
   a taxonomia de ângulos que já usamos internamente).
5. **Consumo** — vira tela (Radar Competitivo), alimenta o Radar de Demanda existente (fecha o
   vértice "endógeno × exógeno × concorrência") e entra no briefing estratégico.

## II.4 — Modelagem de Dados

Grãos distintos, tabelas distintas (mesma disciplina do `GoogleSearchTerm`). Schema
`campanhasmarketingdigital`.

```sql
-- Concorrentes que o tenant escolheu monitorar (curadoria)
CREATE TABLE "CompetitorEntity" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  segment_id UUID,                       -- herda a taxonomia de ângulos/benchmarks do segmento
  client_id UUID,                        -- opcional: concorrente de um cliente específico
  display_name TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL,         -- 'meta' | 'google' | 'tiktok'
  external_ref TEXT NOT NULL,            -- page_id do Meta, domínio, advertiser_id
  geo TEXT,                              -- cidade/UF de foco
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(tenant_id, platform, external_ref)
);

-- Snapshot de cada anúncio observado (grão: anúncio)
CREATE TABLE "CompetitorAd" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES "CompetitorEntity"(id),
  tenant_id UUID NOT NULL,               -- desnormalizado p/ escopo/segurança
  platform VARCHAR(20) NOT NULL,
  ad_fingerprint TEXT NOT NULL,          -- hash(criativo+cópia) p/ dedup
  creative_url TEXT,                     -- imagem/vídeo (armazenar via MinIO, não hotlink)
  headline TEXT,
  body TEXT,
  cta TEXT,
  first_seen DATE NOT NULL,
  last_seen DATE NOT NULL,               -- longevidade = last_seen - first_seen
  is_live BOOLEAN DEFAULT true,
  raw_source JSONB,                      -- payload bruto da fonte (proveniência)
  UNIQUE(competitor_id, ad_fingerprint)
);

-- Enriquecimento por IA (reusa Vision + classificador de ângulo)
CREATE TABLE "CompetitorAdAnalysis" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES "CompetitorAd"(id) ON DELETE CASCADE,
  angle_slug TEXT,                       -- MESMA taxonomia de segment_angle_terms
  vision_summary TEXT,                   -- descrição do criativo (Vision)
  detected_offer TEXT,                   -- promo/desconto/incentivo detectado
  detected_price NUMERIC(14,2),          -- preço citado no anúncio, se houver
  analyzed_at TIMESTAMP DEFAULT now()
);

-- Estatística agregada de preço por nicho/geo/data (grão: nicho-geo-dia)
CREATE TABLE "MarketPriceSnapshot" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  segment_id UUID,
  niche TEXT NOT NULL,                   -- ex.: "apartamento 2q Boa Viagem"
  geo TEXT,
  snapshot_date DATE NOT NULL,
  listing_count INTEGER,                 -- volume de anúncios (proxy de oferta)
  price_median NUMERIC(14,2),
  price_p25 NUMERIC(14,2),
  price_p75 NUMERIC(14,2),
  UNIQUE(tenant_id, niche, geo, snapshot_date)
);

-- Governança de coleta: proveniência + custo (Apify cobra)
CREATE TABLE "ScrapeJob" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  source VARCHAR(40) NOT NULL,           -- 'meta_ad_library' | 'apify:google_transparency' | ...
  scope JSONB,                           -- competidores/nicho/geo do run
  status VARCHAR(20) DEFAULT 'pending',  -- pending|running|done|failed
  rows_ingested INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,4) DEFAULT 0,      -- custo real do run (governança)
  started_at TIMESTAMP,
  finished_at TIMESTAMP
);
```

## II.5 — KPIs (todos passam pelo Portão: gera decisão)

| KPI | Fórmula / Origem | Decisão que dispara |
|-----|------------------|---------------------|
| **Share of Voice (SoV)** | anúncios ativos do concorrente ÷ total do nicho no escopo | "Estou invisível num nicho quente → aumentar presença" |
| **Ad Velocity** | novos anúncios do concorrente por semana | "Concorrente testando muito criativo → nicho competitivo, revisar verba" |
| **Creative Longevity** | `last_seen − first_seen` por anúncio | "Anúncio no ar há 90+ dias provavelmente converte → estudar o ângulo dele" |
| **Distribuição de Ângulos** | contagem por `angle_slug` (via classificador) | "Todos batem em 'preço', ninguém em 'localização' → oceano azul de ângulo" |
| **Gap de Ângulo** | ângulos usados pela concorrência que o tenant NÃO usa | Alimenta o Radar de Demanda (vértice concorrência) |
| **Tendência de Preço** | `price_median` por nicho/geo ao longo do tempo | "Preço mediano subiu 8% → reposicionar oferta / ajustar copy" |
| **Volume de Oferta** | `listing_count` por nicho/geo | "Oferta explodindo → mercado esfriando / guerra de preço à vista" |

**Deliberadamente FORA (vaidade):** número de seguidores do concorrente, curtidas, engajamento
social bruto — não muda decisão de mídia paga.

## II.6 — Insights (o que a IA extrai)

1. **Classificação de ângulo do concorrente** — reusa o classificador LLM já existente
   (`angleClassifierService`): a cópia do anúncio do concorrente é mapeada para a mesma taxonomia
   interna, permitindo comparar "meus ângulos × ângulos deles" na mesma régua.
2. **Descrição de criativo** — reusa Vision (`creativeAnalysisService`): descreve o criativo do
   concorrente (formato, elemento visual dominante, presença de pessoas/preço/selo).
3. **Detecção de oferta/preço** — LLM extrai promo/desconto/preço citado (alimenta
   `detected_offer`/`detected_price`).
4. **Narrativa competitiva no briefing** — o briefing estratégico (que já existe e já roda por
   segmento) ganha uma seção "Movimento da Concorrência": "3 concorrentes intensificaram anúncios de
   'financiamento facilitado' nas últimas 2 semanas; nenhum explora 'imóvel pronto para morar' —
   ângulo em aberto."
5. **Fechamento do Radar de Demanda** — hoje o radar cruza endógeno (seu gasto) × exógeno (Google
   Trends). Com este apêndice ele ganha o **terceiro vértice: concorrência** — o mapa fica completo
   (demanda existe? você está nela? o concorrente está?).

## II.7 — UI / UX

**Onde vive:** respeitando o princípio de §D1 (não criar aba paralela por capricho), a inteligência
competitiva é um **eixo de análise novo** (não é uma "rede"), então cabe como **sub-seção dentro da
Inteligência Profunda** — "Radar Competitivo" — e como **enriquecimento do Radar de Demanda** já
existente. Não vira aba de topo.

**Componentes:**
- **Curadoria de concorrentes** (tela de config, padrão dos modais do Master): cadastrar/ativar
  concorrentes por segmento/cliente, com busca por página Meta / domínio.
- **Share of Voice** (barra empilhada): sua fatia × concorrentes no nicho/geo/período.
- **Timeline de Ad Velocity** (sparkline por concorrente): intensidade de lançamento ao longo do tempo.
- **Galeria de Criativos do Concorrente** (grid): thumbnail + `angle_slug` (chip) + longevidade
  (badge "no ar há Xd") + oferta detectada. Ordenável por longevidade (os "vencedores" no topo).
- **Mapa de Ângulos** (heatmap ou barras): distribuição de ângulos da concorrência × seus ângulos,
  destacando o **gap** (o que ninguém explora).
- **Tendência de Preço** (linha com faixa p25–p75): `price_median` por nicho/geo no tempo.

**UX crítico:** cada peça de concorrente deve ter **proveniência visível** (fonte + data de coleta)
— transparência de que é dado público de Ad Library, não bisbilhotagem. E **custo de coleta**
visível para o Master (quantos runs, quanto gastou) — governança.

## II.8 — Aplicabilidade de IA (reuso, não código novo por vertical)

| Necessidade | Reusa o que já existe |
|-------------|------------------------|
| Classificar ângulo da cópia do concorrente | `angleClassifierService` (LLM) — mesma taxonomia |
| Descrever o criativo do concorrente | `creativeAnalysisService` (Vision) |
| Narrativa competitiva no briefing | motor de briefing estratégico (só + 1 variável de contexto) |
| Detecção de oferta/preço | prompt novo em `system_prompt_templates` (padrão zero-hardcode já usado) |
| Embedding p/ agrupar criativos similares (opcional) | `embedText()` da KB de Mensageria |

**Nada disso é IA nova** — é orquestração dos serviços de IA que a plataforma já tem, sobre uma
fonte de dados nova. Fiel ao princípio de reuso máximo.

## II.9 — Governança, Custo e Compliance (a parte que decide se vale a pena)

| Tema | Regra |
|------|-------|
| **Só dado público agregado** | Exclusivamente Ad Libraries oficiais + estatística de preço agregada. **Nunca** dado de indivíduo (nome, contato, comportamento pessoal) — essa outra vertente (scraping de leads) foi **descartada** por exposição LGPD real. Aqui não se toca em pessoa física |
| **Proveniência** | Todo registro guarda `raw_source` + origem + data. Auditável |
| **ToS / robots.txt** | Preferir APIs oficiais (Meta Ad Library). Scraping de portal só para agregado de preço, respeitando ToS; se um portal proíbe, não se raspa aquele portal |
| **Custo (Apify)** | `ScrapeJob.cost_usd` por run + teto de gasto mensal por tenant (mesma disciplina de rate-limit do webchat). Sem teto, é buraco de custo |
| **Portão do KPI** | Vale para tudo aqui também: se um sinal raspado não muda uma decisão, não entra |

**Recomendação de sequência (se um dia for atacado):**
1. Começar **só com Meta Ad Library API** (gratuita, oficial, sem Apify) para provar valor com o
   menor risco/custo — SoV + longevidade + ângulo dos concorrentes já entregam muito.
2. Adicionar Google/TikTok Transparency via Apify só depois de validado o valor.
3. Tendência de preço (scraping de portal) por último — é a de maior atrito de ToS.

**Decisão hoje:** documentado e detalhado para avaliação futura. **Não priorizado, não iniciado.**

---

**Documento:** `docs/PLANO_GOOGLE_TIKTOK.md` v2.0 (2026-07-20)
**Próxima revisão:** Após Developer Token recebido, ou ao iniciar a Parte D (consolidação multi-rede).
