# Teste Rigoroso Pós-Consolidação — leadEvents.ts (2026-07-22)

> **Contexto:** depois de encontrar 2 bugs reais seguidos no cálculo de CPL (Google usando
> conversões reais; Meta contando lead de formulário) e consolidar TODO o módulo de Campanhas
> numa fonte única (`src/lib/marketing/services/leadEvents.ts`, 16 arquivos migrados — ver
> `docs/CHECKPOINT.md`), o usuário pediu uma segunda verificação independente, rigorosa, em
> duas frentes: uma técnica (feita pelo Claude) e uma manual em todas as telas (feita pelo
> usuário). Este documento registra a metodologia, os resultados da Trilha A, e o roteiro
> completo da Trilha B.

---

## Por que duas trilhas independentes

Uma auditoria feita só por quem implementou a correção tem um viés estrutural: eu tendo a
verificar exatamente os casos que eu já sei que eram o problema, e a confiar nos mesmos dados
que usei pra construir a correção. Isso é exatamente o padrão que gerou os 2 bugs seguidos —
eu testava um caso, achava certo, e um bug diferente aparecia na pergunta seguinte.

A metodologia certa pra esse tipo de risco (métrica financeira crítica de negócio) é:

1. **Trilha A (técnica, minha):** parte de uma "verdade fundamental" calculada por **SQL puro,
   direto no banco, sem passar por nenhuma linha do código da aplicação** — nem `leadEvents.ts`,
   nem os endpoints. Essa verdade fundamental é o padrão contra o qual TODO consumidor é
   comparado. Depois, casos de borda que o teste de migração (arquivo por arquivo) não cobria
   de propósito: duplicação, rede órfã, ponta a ponta do bug crítico original.
2. **Trilha B (manual, sua):** um roteiro passo a passo, tela por tela, no navegador de
   verdade, com os números exatos que você deve enxergar em cada uma. Seu papel aqui não é
   "confiar no que o código diz" — é confirmar com os próprios olhos que a tela mostra o que a
   trilha A já provou matematicamente. Se alguma tela mostrar um número diferente do esperado,
   é sinal de um bug que nem a auditoria técnica nem a migração pegaram (ex.: um bug só de
   renderização, cache do navegador, ou um componente que ainda lê de outro lugar).

Nenhuma das duas trilhas sozinha seria suficiente. A técnica prova que o **cálculo** está
certo; a manual prova que a **tela** reflete esse cálculo sem distorção.

---

## Escopo de referência usado em toda a auditoria

- **Tenant:** Marketing Digital (`efbf62cf-9e28-4b31-a4f6-82a037412353`), usuário `admmd`.
- **Escopo:** "Minha Empresa" (campanhas próprias do tenant, `client_id IS NULL`).
- **Janela A (range customizado, usada na maioria das telas):** `01/04/2026` a `21/07/2026`.
- **Janela B (últimos 30 dias corridos a partir de hoje — usada em Auditoria/Briefing, que não
  têm seletor de data customizado):** `22/06/2026` a `22/07/2026`.

### Composição real do escopo (5 campanhas próprias)

| Campanha | Rede | Fonte de lead usada |
|---|---|---|
| Alto Padrão — Alphaville | Meta (explícito) | clique de WhatsApp / formulário |
| MD · Captação Própria Premium | *(sem rede — cai no fallback)* | Meta (clique/formulário) |
| MD · Captação Própria Financiamento | *(sem rede)* | Meta (clique/formulário) |
| campanha 7 | *(sem rede)* | Meta (clique/formulário) |
| Google Search — Apartamentos SP (dados de teste) | Google (explícito) | conversões reais da API |

As 3 campanhas "sem rede" são um caso real (não fabricado) do fallback documentado em
`networkLeadSource.ts` — campanha sem `network_id` cai em `meta` por padrão.

---

## Trilha A — Auditoria técnica (executada, resultados abaixo)

### A1. Verdade fundamental (SQL puro, independente de qualquer código da aplicação)

```sql
-- Meta: clique de WhatsApp (janela A, escopo próprio)          → 0
-- Meta: formulário, exclui eco de resposta WHATSAPP_MESSAGE      → 0
-- Google: SUM(Insight.conversions)                               → 64
-- Spend total (todas as 5 campanhas, janela A)                   → R$ 244.823,18741740735
```

**Verdade fundamental: 64 leads, R$ 244.823,19 de gasto.** Este número não passa por
`leadEvents.ts` nem por nenhum endpoint — é a fonte de comparação para tudo abaixo.

### A2. Matriz de consistência entre consumidores (janela A, escopo "own")

| Consumidor | Leads retornados | Gasto retornado | Resultado |
|---|---|---|---|
| Verdade fundamental (SQL puro) | 64 | R$ 244.823,19 | referência |
| `dashboard/full` | 64 | R$ 244.823,19 | ✅ bate |
| `dashboard/segment` | 64 | R$ 244.823,19 | ✅ bate |
| `dashboard/funnel` | 64 (100% em TOF) | R$ 244.823,19 (unfiltered: R$432.144,31 com outros clientes) | ✅ bate |
| `dashboard/predictions` (histórico) | 64 | — | ✅ bate |
| `dashboard/campaign-map` | 64 (dedup por campanha) | — | ✅ bate |
| `portfolio` | 64 | R$ 244.823,19 | ✅ bate |
| `portfolio/cross-insights` | CPL R$3.825,36 (= 244823,19/64) | R$ 244.823,19 | ✅ bate |
| `auditoria` (janela B, rolling 30d) | 64 | R$ 213.189,39 | ✅ bate (janela B) |
| `briefing estratégico` (janela B) | cita "64 leads... CPL R$3.330,54" | — | ✅ bate (janela B) |
| `iniciativas/[id]` (isolado à campanha Google) | 64 | R$ 213.154,39 | ✅ bate |
| `insights/ai` (regras de IA) | Google → DOWNSCALE (CPL crítico reconhecido) | — | ✅ correto — não é mais "0 leads, pausar" |
| `desperdicio` (wasted spend) | Google **fora** de `ZERO_LEADS_SPEND` | — | ✅ correto |
| `tracking/health` | roda sem erro; `leads_24h=0` é honesto (sem lead nas últimas 24h reais, dimensão diferente da janela A/B) | — | ✅ comportamento correto, não é bug |

**14 de 14 consumidores testados batem com a verdade fundamental**, cada um na sua própria
janela de tempo (custom range vs. rolling 30d, dependendo do que cada tela usa).

### A3. Casos de borda (não cobertos pelos testes de migração arquivo-por-arquivo)

**A3.1 — Achado crítico original, ponta a ponta, JÁ com a consolidação nova**
O Achado #1 (lead nativo do Meta via Formulário Instantâneo perdia `campaign_id`) foi corrigido
numa sessão ANTERIOR à criação de `leadEvents.ts` — nunca tinha sido testado com o código
consolidado atual. Simulei o webhook real (`/api/public/meta-leads/webhook`) com payload e
assinatura HMAC válidos, `ad_id` real (`meta_ad_001` → campanha "Alto Padrão — Alphaville"):

- `CtaSubmission` gravada com `campaign_id` resolvido corretamente, `lead_uuid` preenchido,
  `cta_type='LEARN_MORE'` (≠ `WHATSAPP_MESSAGE`, não seria confundido com eco de WhatsApp)
- `marketing_eventos` (CRM) também com `campaign_id` correto
- `GET /dashboard/full?startDate=hoje&endDate=hoje` → `leadCount:1`, atribuído exatamente à
  campanha certa (`leadsByCampaign['47d70729-...']:1`)

**Resultado: o fix antigo e a consolidação nova compõem corretamente.** Dado de teste removido
depois (5 tabelas: `CtaInteraction`, `CtaSubmission`, `marketing_eventos`, `leads_staging`,
`leads_kanban` — 0 linhas residuais confirmadas).

**A3.2 — Guarda de deduplicação (clique de WhatsApp + eco da resposta = 1 lead, não 2)**
Esse comportamento tinha sido provado uma vez, no código ANTIGO, antes da consolidação. Refiz o
teste com dado sintético (1 `CtaInteraction.WHATSAPP_CLICK` + 1 `CtaSubmission` com
`cta_type='WHATSAPP_MESSAGE'`, mesma campanha, mesmo instante) contra o código consolidado:
`leadCount` = **1**, não 2. Guarda continua intacta pós-refatoração. Dado de teste removido.

**A3.3 — Rede "órfã" (campanha sem `network_id`) cai no fallback certo**
Não foi preciso sintetizar — 3 das 5 campanhas do escopo real já não têm `network_id`
(MD · Captação Própria Premium/Financiamento, campanha 7). A verdade fundamental (A1) já as
tratou como Meta (`cta_engagement`) e bateu exatamente com todos os 14 consumidores — confirma
que `leadSourceForNetwork`'s fallback pra `'meta'` está funcionando em produção, não só em
teoria.

### Conclusão da Trilha A

Nenhuma discrepância encontrada em 14 consumidores + 3 casos de borda. A consolidação está
funcionando corretamente pro escopo e período testados. **Isso não elimina a necessidade da
Trilha B** — a Trilha A prova que o cálculo está certo; só a inspeção visual das telas prova que
a UI renderiza esse cálculo sem distorção (formatação, cache, componente client-side que
reimplementa algo por conta própria, etc.).

---

## Trilha B — Roteiro manual (para o usuário executar)

Objetivo: navegar pelas telas reais (login normal, sem token fabricado) e conferir que os
números batem com a tabela de referência abaixo. **Qualquer divergência = reporte imediatamente
com print da tela**, mesmo que pareça pequena (ex.: R$3.825,37 em vez de R$3.825,36 já é sinal
de algo a investigar, não arredondamento).

### Preparação

1. Login normal em `/admin/login` como usuário do tenant **Marketing Digital**.
2. Em toda tela com seletor de cliente, selecione **"Minha Empresa"** (não "Todos os Clientes"
   nem um cliente específico), a menos que a instrução abaixo diga o contrário.
3. Em toda tela com seletor de período, use o intervalo customizado **01/04/2026 até 21/07/2026**
   (Janela A), a menos que a instrução diga "Janela B".

### Números de referência (decore ou deixe esta tabela aberta em outra aba)

| Métrica | Janela A (01/04–21/07/2026) | Janela B (últimos 30 dias, hoje=22/07/2026) |
|---|---|---|
| Leads | **64** | **64** |
| Gasto | **R$ 244.823,19** | **R$ 213.189,39** |
| CPL | **R$ 3.825,36** | **R$ 3.330,54** (arredonda p/ R$3.331 em texto) |
| Cliques | 32.734 | — |
| Impressões | 1.138.814 | — |
| CTR | 2,87% | — |

### Checklist tela por tela

- [ ] **Dashboard → Visão Geral** (`/admin/campanhas/dashboard`, período = Janela A, cliente =
  Minha Empresa): card "Leads" = **64**. Card "Gasto Total" = **R$ 244.823,19**. Card "CPL
  Médio" = **R$ 3.825,36**.
- [ ] **Dashboard → CPL por Rede** (mesmo escopo, mesma tela — seção de breakdown Meta×Google):
  Google deve aparecer com **64 leads**; Meta com **0 leads** nesta janela (não é bug — é o
  dado real deste tenant de teste).
- [ ] **Dashboard → Funil por Estágio**: TOF deve concentrar os 64 leads (é onde a campanha
  Google está classificada); MOF e BOF devem aparecer com 0 leads, não com erro/branco.
- [ ] **Dashboard → Gráfico de Predições/Projeções**: a série histórica de leads deve ter
  valores diários reais (não uma linha zerada) — clique em qualquer ponto do fim de junho/início
  de julho e confirme que não é zero.
- [ ] **Dashboard → Mapa de Campanhas**: passe o mouse nos pontos do mapa — a soma dos leads
  exibidos por campanha, somada manualmente, deve dar 64 (sem contar a mesma campanha 2x em
  raios/localizações sobrepostas).
- [ ] **Dashboard → aba "Google Ads"** (só aparece se o filtro de rede = Google, ou "Todas" com
  dado real de Google no período): confirme que o **banner âmbar de aviso** aparece no topo,
  explicando que "conversões"/ROAS vêm da própria conta do Google Ads do cliente.
- [ ] **Portfolio** (`/admin/campanhas/portfolio`, período = 112 dias ou datas equivalentes):
  linha "Marketing Digital" (própria/tenant) deve mostrar **64 leads**, **R$ 244.823,19**.
- [ ] **Portfolio → Insights Cruzados** (`/admin/campanhas/portfolio/cross-insights`): a
  narrativa/dados da própria empresa devem citar CPL **R$ 3.825,36** (ou próximo, dependendo do
  arredondamento do texto).
- [ ] **Auditoria** (`/admin/campanhas/auditoria`, período = 30 dias = Janela B): score de
  Performance deve citar **CPL R$3331 crítico** (ou muito próximo). Confirme que o "Desperdício
  de Verba" NÃO lista a campanha "Google Search — Apartamentos SP" como zero-lead.
- [ ] **Briefing Estratégico** (gerar um novo, período = 30 dias): a narrativa deve mencionar os
  leads/CPL da campanha Google de forma coerente com a Janela B (não "0 leads, recomendo
  pausar" para a campanha Google).
- [ ] **Leads** (`/admin/campanhas/leads`, mesmo período/cliente da Janela A): o total de leads
  listados/estatística deve ser **64**.
- [ ] **Desperdício de Verba** (`/admin/campanhas/desperdicio`): confirme visualmente que a
  campanha Google **não aparece** na categoria "Gasto sem Leads" — se aparecer, é regressão.
- [ ] **Insights da IA** (cards no dashboard): a recomendação para a campanha Google deve ser
  algo como "DOWNSCALE — CPL crítico", **nunca** "PAUSE — gasto sem resultados" (essa frase é
  reservada às 3 campanhas Meta que genuinamente têm 0 leads no período).
- [ ] **Tracking Health** (widget no dashboard): rode a verificação — não deve travar/dar erro.
  O item "Leads 24h" pode legitimamente mostrar crítico/zero (é sobre as últimas 24 horas reais,
  não sobre o período do teste) — isso NÃO é bug.
- [ ] **Trocar o filtro de cliente para "Todos os Clientes"** em qualquer uma das telas acima:
  os números devem mudar (ficar maiores, incluindo outros clientes), nunca dar erro ou zerar.
- [ ] **Trocar o filtro de rede para "Google"** no Dashboard: CPL/leads devem refletir só a
  campanha Google (64 leads, R$ 213.154,39 nesta janela específica de rede).
- [ ] **Trocar o filtro de rede para "Meta"**: leads devem cair para valores próximos de zero
  neste tenant de teste (as 4 campanhas Meta genuinamente não têm lead na Janela A) — confirme
  que não aparece erro nem "undefined".

### O que reportar se algo divergir

Para qualquer item acima que não bater: nome da tela, filtros exatos usados (cliente/período/
rede), número esperado (da tabela) vs. número visto na tela, e um print se possível. Não
assuma "deve ser arredondamento" — diferenças de mais de R$0,01 ou de qualquer unidade de lead
são sinal real de bug, dado que a Trilha A já confirmou o valor exato via SQL puro.

---

## Status

**Trilha A: concluída, 0 discrepâncias encontradas** (14 consumidores + 3 casos de borda).
**Trilha B: pendente — aguardando execução manual pelo usuário.**
