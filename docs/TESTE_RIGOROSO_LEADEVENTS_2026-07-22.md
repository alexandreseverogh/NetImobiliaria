# Teste Rigoroso Pós-Consolidação — leadEvents.ts (2026-07-22)

> **Contexto:** depois de encontrar 2 bugs reais seguidos no cálculo de CPL (Google usando
> conversões reais; Meta contando lead de formulário) e consolidar TODO o módulo de Campanhas
> numa fonte única (`src/lib/marketing/services/leadEvents.ts`, 16 arquivos migrados — ver
> `docs/CHECKPOINT.md`), o usuário pediu uma verificação independente e rigorosa, que cresceu em
> 5 frentes complementares: técnica sobre dado existente (Trilha A, Claude), manual em todas as
> telas sobre dado existente (Trilha B, usuário), dado novo ao vivo atravessando os 3 módulos —
> Campanhas, CRM, Mensageria — incluindo agentes de IA (Trilha C, colaborativa), validação contra
> as APIs reais do Meta/Google (Trilha D, bloqueada em pré-requisitos de conta/infra) e uma
> camada de simulação pra testar sem depender de credencial real (Trilha E, escopo ainda em
> decisão). Este documento registra a metodologia e o roteiro completo das cinco.

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
- **Janela B (últimos N dias corridos a partir de HOJE — usada em telas sem seletor de data
  customizado: Auditoria, Briefing, **Portfolio**): não é uma data fixa — desloca sozinha a
  cada dia que passa. **Por isso, telas que só suportam "dias corridos" nunca devem ser
  conferidas contra um número decorado** (ele fica errado no dia seguinte, por definição, não
  por bug) — devem ser conferidas contra `dashboard/full` pedindo a MESMA janela de N dias a
  partir de hoje, e os dois têm que bater entre si. Essa foi uma falha real do primeiro rascunho
  deste documento, encontrada pelo usuário ao testar Portfolio: instruía usar "período = 112
  dias" (opção que **não existe** no seletor — Portfolio só tem 7/14/30/60/90) e comparar contra
  um valor absoluto (R$244.823,19, da Janela A) que uma janela rolante nunca poderia reproduzir.

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

**Atenção ao formato:** os cards de KPI do topo do Dashboard (`KpiCard`/`formatCurrencyCompact`)
abreviam valores ≥ R$1.000 em "K" (milhares, 1 casa decimal) — nunca mostram centavos no texto.
As demais telas (Portfolio, Auditoria, narrativa de Briefing/Cross-Insights) usam
`formatCurrency` normal, com centavos. A coluna "formato do card" abaixo é o que você realmente
vai ver nos cards do Dashboard; a coluna "valor exato" é pra Portfolio/Auditoria/Briefing, **e
também aparece passando o mouse por cima do número no card** (tooltip nativo do navegador).

| Métrica | Valor exato — Janela A (fixo, sempre válido) | Formato do card — Janela A |
|---|---|---|
| Leads | **64** | **64** (não abrevia) |
| Gasto | **R$ 244.823,19** | **R$ 245K** |
| Gasto Google | R$ 213.154,39 | R$ 213K |
| Gasto Meta | R$ 31.668,80 | R$ 31,7K |
| CPL | **R$ 3.825,36** | **R$ 3,8K** |
| CPL Google | R$ 3.330,54 | R$ 3,3K |
| CPL Meta | — (0 leads, indefinido) | — |

**Janela B não tem mais números fixos na tabela** (removidos — ficavam errados a cada dia que
passava, já que é uma janela rolante "hoje - N dias"). Pras telas que só suportam Janela B
(Portfolio, Auditoria, Briefing), o método de verificação é sempre: pedir a `dashboard/full` a
mesma janela de N dias a partir de hoje e confirmar que os dois batem entre si — nunca comparar
contra um número escrito neste documento.
| Cliques | 32.734 | — | — |
| Impressões | 1.138.814 | — | — |
| CTR | 2,87% | — | — |

### Checklist tela por tela

- [ ] **Dashboard → Visão Geral** (`/admin/campanhas/dashboard`, período = Janela A, cliente =
  Minha Empresa): card "Leads" = **64** (exibido sem abreviação). Card "Gasto Total" = **R$ 245K**
  (passe o mouse por cima pra conferir o valor exato, R$ 244.823,19, no tooltip). Card "CPL
  Médio" = **R$ 3,8K** (tooltip: R$ 3.825,36).
- [ ] **Dashboard → CPL por Rede** (mesmo escopo, mesma tela — seção de breakdown Meta×Google):
  Google deve aparecer com **64 leads**; Meta com **0 leads** nesta janela (não é bug — é o
  dado real deste tenant de teste).
- [ ] **Dashboard → Funil por Estágio**: TOF deve concentrar os 64 leads (é onde a campanha
  Google está classificada); MOF e BOF devem aparecer com 0 leads, não com erro/branco.
- [ ] **Dashboard → Gráfico de Predições/Projeções** (aba **Inteligência Profunda** — não Visão
  Executiva nem Análise de Dados; role até abaixo do Farol de Milha e **clique em "▸ Projeções
  por regressão linear (legado)" pra expandir**, é um `<details>` recolhido por padrão): dentro,
  o gráfico "Leads Diários" deve ter valores diários reais (não uma linha zerada) — clique em
  qualquer ponto do fim de junho/início de julho e confirme que não é zero.
- [x] **Dashboard → Mapa de Campanhas** ("Geolocalização das Campanhas" — aparece tanto em Visão
  Executiva quanto em Inteligência Profunda, mesmo componente): **clique** em cada pino do mapa
  (não é hover — o popup do Leaflet abre só com clique) pra ver o nome de cada campanha daquele
  local + leads/gasto agregados do local. Some manualmente os leads de cada pino — deve dar 64
  (sem contar a mesma campanha 2x se ela aparecer em mais de um pino).
  ✅ **Confirmado pelo usuário (2026-07-25):** Barueri (1 camp., 0 leads, R$11.927,02) + São Paulo
  (3 camp., 64 leads, R$232.896,17) = **64 leads** e **R$244.823,19** — bate exato com a
  referência nas duas métricas.
- [ ] **Dashboard → aba "Google Ads"** (só aparece se o filtro de rede = Google, ou "Todas" com
  dado real de Google no período): confirme que o **banner âmbar de aviso** aparece no topo,
  explicando que "conversões"/ROAS vêm da própria conta do Google Ads do cliente.
- [ ] **Portfolio** (`/admin/campanhas/portfolio`) — **atenção: o seletor de período aqui só
  tem 7/14/30/60/90 dias corridos a partir de hoje, não tem range customizado nem "112 dias"**
  (correção deste documento — a versão anterior pedia uma opção que não existe). Escolha
  qualquer preset (ex.: 30 dias) e confira a linha "Marketing Digital" (própria/tenant) contra
  `dashboard/full?startDate=<hoje-N dias>&endDate=<hoje>&clientId=own` pedido pra você (ou peça
  pro Claude rodar) com o MESMO N — os dois têm que mostrar exatamente o mesmo leads e gasto.
  **Não decore um valor fixo aqui** — a janela rolante muda todo dia.
- [ ] **Portfolio → Insights Cruzados** (`/admin/campanhas/portfolio/cross-insights`): mesma
  ressalva de janela rolante do item acima. A narrativa/dados da própria empresa devem citar um
  CPL coerente com o gasto/leads mostrados no Portfolio na mesma janela (spend ÷ leads).
- [x] **Auditoria** (`/admin/campanhas/auditoria`, período = 30 dias): mesma ressalva — confira
  o CPL citado no score de Performance contra `dashboard/full` pedindo os últimos 30 dias a
  partir de hoje (não contra um valor decorado). Confirme que o "Desperdício de Verba" NÃO lista
  a campanha "Google Search — Apartamentos SP" como zero-lead.
  ✅ **Confirmado pelo usuário (2026-07-25):** janela 25/06–25/07/2026. `dashboard/full` retornou
  spend R$213.154,39 / 64 leads / CPL R$3.330,54 — bate exato com "CPL R$3331 crítico" da
  Auditoria (95,2x acima do ideal R$35,00 = 3330,54/35). "Desperdício de Verba" listou a campanha
  Google com **"64 lead(s)"** explícito ao lado do CPL — corretamente na categoria de CPL
  crítico, não na categoria mais grave de zero-lead.
- [x] **Briefing Estratégico** (gerar um novo, período = 30 dias): a narrativa deve mencionar os
  leads/CPL da campanha Google de forma coerente com os dados reais da janela de 30 dias atual
  (não "0 leads, recomendo pausar" para a campanha Google).
  ✅ **Confirmado pelo usuário (2026-07-25):** Google Search — Apartamentos SP recebeu
  recomendação de DOWNSCALE ("revisar o criativo e considerar a redução do orçamento diário em
  30%"), nunca "pausar" — enquanto as 3 campanhas Meta genuinamente sem lead (Alto Padrão —
  Alphaville, MD Premium, MD Financiamento) corretamente receberam "Pausar". Bônus: o chip de
  Ângulo no rodapé já mostra "Sem ângulo classificado" (não mais "unknown"), confirmando o fix
  anterior ao vivo no navegador.
- [x] **Leads** (`/admin/campanhas/leads`, "Leads Capturados") — **correção deste documento:**
  esta tela **nunca vai mostrar 64**, e isso é esperado, não bug. Ela lista contatos reais do
  CRM (`leads_staging` — o próprio subtítulo da página já avisa: "leads com ação real
  confirmada"), enquanto o 64 do Dashboard/Portfolio/Auditoria vem de `leadEvents.ts`, que pro
  Google conta `Insight.conversions` — um número agregado reportado pela API do Google Ads,
  **sem nenhuma identidade de contato anexada** (exigiria integração de Formulário de Lead do
  Google + webhook, não configurada nesta campanha de teste). As 64 conversões do Google nunca
  viram uma linha em `leads_staging`, então é estruturalmente impossível essa tela mostrá-las.
  ✅ **Confirmado pelo usuário (2026-07-25) e verificado no banco:** 7 leads reais (escopo
  próprio, Janela A) — número bate exato com `COUNT(DISTINCT lead_uuid)` em `leads_staging`
  direto no banco, tanto em "Minha Empresa" quanto "Todos os Clientes" (os 7 clientes externos
  não têm nenhum contato real nesse período). **Duas definições de "lead" coexistem no sistema,
  ambas corretas no seu contexto:** sinal de conversão pra CPL (inclui Google, sem identidade) vs.
  contato real de CRM (só esta tela) — vale documentar isso como conceito pra evitar confusão
  futura de quem usa a plataforma.
  ✅ **Implementado (2026-07-25):** a partir da dúvida do usuário ("deveria exibir cliques/
  interesses gerados pelos CTAs? ou 'sinal de conversão' vs 'contato real'?"), adicionado novo
  card "Sinal de Interesse (Meta)" nesta página — `CtaInteraction.WHATSAPP_CLICK` +
  `CtaSubmission` válida (mesmo filtro de dedupe do `leadEvents.ts`), no mesmo escopo tenant/
  cliente/data da tela. Banner explicativo permanente adicionado acima dos filtros, explicando
  as duas métricas em texto simples. Testado ao vivo (escopo "own", Janela A):
  `totalLeads=7` + `sinalInteresseMeta=29` — conferido via SQL direto (1 WHATSAPP_CLICK + 28
  CtaSubmission = 29). Commit `cbaeece`.
  ✅ **Ampliado (2026-07-25):** discussão de UX levou a 3 melhorias na mesma tela — (1) reordem
  dos cards (Sinal de Interesse primeiro, já que a tela é acessada dentro do módulo de
  Marketing Digital); (2) rótulo "Leads Hoje" ganhou a data explícita (independe do filtro De/
  Até); (3) gráfico "Leads por Dia" virou "Sinal de Interesse × Total Leads por Dia" (2 linhas,
  zero-preenchido) pra visualizar o funil sinal→contato dia a dia. **Achado real durante a
  implementação:** 24 linhas de `CtaSubmission` (com `lead_uuid` preenchido) em todo o banco
  eram resíduo órfão de sessões de teste anteriores — apontavam pra `lead_uuid` de leads de
  teste já apagados do `leads_staging`, mas a própria linha de `CtaSubmission` nunca foi limpa
  junto (19 no tenant Marketing Digital, 5 no tenant-bancada "Teste RAG"). Isso inflava
  `sinalInteresseMeta` (29 → 10 após a limpeza) e distorcia o gráfico novo (06/07 mostrava 17
  sinais/0 leads antes da limpeza; depois, 1 sinal/0 leads — um gap real e pequeno, não mais
  um artefato de teste). Confirmado sem nenhuma referência pendente em `mensageria.contacts`
  antes de remover; `DELETE` das 24 linhas órfãs executado, 0 restantes confirmado.
  `sinalInteresseMeta` atual pra esta janela: **10** (não mais 29).
- [x] **Desperdício de Verba** (`/admin/campanhas/desperdicio`): confirme visualmente que a
  campanha Google **não aparece** na categoria "Gasto sem Leads" — se aparecer, é regressão.
  ✅ **Confirmado pelo usuário (2026-07-25)**, escopo "Todos os Clientes", 30 dias: "Sem Leads"
  mostra corretamente `R$ 0,00 / 0 campanha(s)` (Google não está lá); "CPL Crítico" mostra
  `R$ 210.914,39 / 1 campanha(s)`, com a campanha "Google Search — Apartamentos SP" listada
  explicitamente em "Top Campanhas com Desperdício": `CPL R$ 3.330,54 vs ideal R$ 35,00 — 64
  lead(s)` — confirma que o desperdício é reconhecido pelo CPL crítico real (não por falta de
  lead), e o `64 lead(s)` explícito bate com o valor de referência de sempre da Janela A/janela
  rolante equivalente.
- [x] **Insights da IA** (cards no dashboard): a recomendação para a campanha Google deve ser
  algo como "DOWNSCALE — CPL crítico", **nunca** "PAUSE — gasto sem resultados" (essa frase é
  reservada às 3 campanhas Meta que genuinamente têm 0 leads no período).
  ✅ **Confirmado pelo usuário (2026-07-25)**, segmento Imobiliário, período 01/04-21/07: card
  "DOWNSCALE — CPL crítico — reduzir orçamento" pra "Google Search — Apartamentos SP" (CPL
  R$3.330,54, 95,2× o ideal de R$35) · as 3 campanhas Meta com "PAUSE — Gasto sem resultados"
  batem exatamente com as 3 que genuinamente têm 0 leads (Alto Padrão — Alphaville, MD
  Captação Própria Premium, MD Captação Própria Financiamento) — nenhum falso PAUSE pra Google.
  **Achado secundário, não bloqueante, registrado pra decisão futura:** a MESMA campanha Google
  também recebeu um card "SCALE — Campanha com bom desempenho" (CTR 4,11%, 64 leads ≥ mínimo de
  5) — conselho oposto ao DOWNSCALE na mesma tela. Investigado em `aiInsights.ts`: são 2 regras
  independentes (`RULES`, linhas ~140 e ~181) que avaliam sinais diferentes (volume/engajamento
  vs. eficiência de custo) sem nenhuma reconciliação entre si — nada impede as duas de disparar
  juntas pra uma campanha com volume alto mas CPL inflado (exatamente o caso do Google, dado o
  aviso já existente na UI sobre `Insight.conversions` poder incluir ações que não são lead de
  verdade). Não corrigido nesta rodada — é uma decisão de produto (priorizar DOWNSCALE quando os
  dois disparam? mostrar os dois com uma nota de conflito? é intencional mostrar sinais
  independentes?), a discutir com o usuário antes de mexer no motor de regras.
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

## Trilha C — Dado novo, ao vivo, nos 3 módulos (Campanhas + CRM + Mensageria)

### Por que esta trilha existe e como difere de A/B

A/B testam se o **cálculo sobre dado já existente** está certo. A Trilha C testa o **caminho de
escrita**: um lead novo, de verdade, entrando pelo canal certo, sendo atribuído à campanha certa,
aparecendo no CRM, na Mensageria (quando aplicável) e nos dashboards de Campanhas — e disparando
a reação certa dos agentes de IA. É a única das três que efetivamente cria e depois remove dado.

**Divisão de responsabilidade, pra ser honesto sobre o que é possível hoje:** gasto/impressões/
cliques (`Insight`) só existem via sincronização real com a API do Meta/Google — não há nenhum
formulário na UI pra digitar "R$500 de gasto" manualmente, então essa parte é semeada por mim via
SQL (mesmo padrão de todo dado de teste já usado neste projeto, ex. `seed-demo-campaigns.sql`).
**Tudo que é evento de lead, CRM e Mensageria você pode fazer ao vivo, pela tela real** — e nos
pontos em que simulo eu mesmo uma chamada (ex.: webhook), você acompanha o dashboard atualizando
em tempo real, igual fiz nos meus próprios testes da Trilha A.

**Limiares reais do segmento Imobiliário (conferidos no banco, usados pra escolher os números
abaixo):** CPL ideal R$35 · CPL crítico R$80 · CTR mínimo 0,8% · frequência máxima 3,0x · gasto
sem lead R$50 · mínimo de leads pra escalar 5 · mínimo de dias rodando 3.

### Cliente de teste (isolamento)

Crie 1 cliente novo em `/admin/clientes/novo`: **"TRILHA C — Cliente Teste"** (herda o segmento
Imobiliário do tenant). Todos os cenários abaixo usam esse cliente — nunca "Minha Empresa" nem um
cliente real — pra ficar 100% isolado e fácil de remover no final.

### Visão geral dos cenários (números escolhidos deliberadamente para cada resultado)

| # | Campanha | Rede | Canal de lead | Gasto | Leads | CPL | Resultado esperado |
|---|---|---|---|---|---|---|---|
| 1 | TRILHA C · Sucesso | Meta | Clique WhatsApp | R$300 (5d) | 15 | R$20 | **SCALE**, status `ok` |
| 2 | TRILHA C · Crítico | Meta | — (zero lead) | R$400 (4d) | 0 | — | **PAUSE**, `ZERO_LEADS_SPEND` |
| 3 | TRILHA C · Atenção | Google | Conversão real (API) | R$520 (4d) | 8 | R$65 | **OPTIMIZE/ALERT**, `ELEVATED_CPL_SPEND` |
| 4 | TRILHA C · Site Próprio | Meta | Mecanismo C (`ref`) | R$150 (3d) | 3 | R$50 | Atribuição correta (testa o fix do `ref` ao vivo) |
| 5 *(opcional)* | TRILHA C · Fadiga | Meta | Clique WhatsApp | R$250 (6d) | 2 | R$125 | **ALERT** (frequência > 3x), não confundir com PAUSE |

Cenário 1 fica deliberadamente **bem** abaixo do ideal (não só "ok, na média") pra confirmar que o
sistema reconhece sucesso genuíno, não só ausência de problema — é comum um teste só cobrir "vai
dar erro?" e esquecer de provar que o caminho feliz também está correto.

### Fase 0 — Setup (feito por mim, antes de você começar a clicar)

1. Criar as campanhas 1-4 (e 5, se topar o cenário opcional) vinculadas ao cliente de teste, com
   `Insight` semeado dia a dia batendo os números da tabela acima.
2. Campanha 3 é a única em rede Google — nova campanha de teste, não reaproveita a fixture
   antiga, pra também confirmar que uma campanha Google **nova** funciona de ponta a ponta.
3. Devolvo os IDs reais (campaignId, trackingId de cada Ad) antes de você começar a Fase 1.

### Fase 1 — Gerar o lead de cada cenário (o coração desta trilha)

- [ ] **Cenário 1 (Sucesso):** simulo 15 cliques de WhatsApp reais via `/api/r/{trackingId}`
  (o mesmo endpoint que um clique real no anúncio usaria), distribuídos ao longo dos 5 dias.
  Você acompanha o dashboard antes/depois.
- [ ] **Cenário 2 (Crítico):** nenhum lead — é o ponto do cenário. Só confirme depois que a
  campanha aparece com **zero** leads em todo lugar, nunca com um número "quase certo" tipo 1 ou 2.
- [ ] **Cenário 3 (Atenção, Google):** as 8 conversões vêm direto do `Insight.conversions`
  (mesmo mecanismo real da API do Google) — sem ação de clique necessária, já semeado na Fase 0.
- [ ] **Cenário 4 (Site Próprio — testa o fix do Mecanismo C ao vivo):** **você mesmo** dispara,
  via `curl` ou Postman (te passo o comando exato com o `trackingId` real da campanha 4), uma
  chamada real a `POST /api/public/cta/ingest` com o campo `ref` preenchido — reproduzindo
  exatamente o cenário "site próprio do cliente" que você descreveu. Repita 3x com dados
  diferentes (nome/e-mail/telefone) pra gerar os 3 leads.
- [ ] **Cenário 5 opcional (Fadiga):** simulo o crescimento de frequência dia a dia (2,0x → 3,8x)
  junto com o gasto semeado na Fase 0.

### Fase 2 — CRM (Kanban, negócio fechado, lead avulso)

- [ ] **Kanban** (`/crm/kanban`): confirme que os leads dos cenários 1, 3 e 4 aparecem
  corretamente distribuídos (segmento Imobiliário, mesma regra de distribuição já testada antes).
- [ ] **Negócio Fechado (Visão 4):** pegue **1 lead do Cenário 1** e mova manualmente no Kanban
  até o estágio "fechamento", com `valor_venda` = **R$450.000**. Depois confira em
  `/admin/campanhas/dashboard` (Visão 4 — Funil de Receita): CPA real deve ficar em torno de
  **R$300** (gasto total da campanha ÷ 1 negócio) e ROAS em torno de **1.500x**
  (450.000 ÷ 300) — números bem redondos de propósito, fáceis de conferir de cabeça.
- [ ] **Lead avulso / visita presencial (fora do escopo de CPL, de propósito):** crie 1 lead
  manualmente via `NovoLeadModal` (botão "Novo Lead" no CRM), sem vincular a nenhuma campanha —
  simulando alguém que visitou o estande presencialmente. Confirme que ele aparece normalmente
  no Kanban, mas **não aparece em nenhuma tela do módulo de Campanhas** (não deveria — não há
  gasto de campanha por trás; é exatamente a fronteira discutida antes de eu tocar em código).

### Fase 3 — Mensageria (atribuição e conversa orgânica)

- [ ] **Conversa orgânica de WhatsApp, sem campanha:** mande uma mensagem de WhatsApp de teste
  sem nenhum clique prévio em anúncio (ex.: número de teste perguntando "Olá, vi um imóvel na
  região X, ainda está disponível?"). Confirme em `/mensageria`: a conversa aparece com o badge
  **"WhatsApp orgânico"** (não o nome de nenhuma campanha) — e confirme que esse contato **não**
  aumenta o contador de leads em nenhuma tela de Campanhas.
- [ ] **Atribuição real:** abra a conversa do Cenário 1 (se o clique de WhatsApp simulado na
  Fase 1 gerar resposta) e confirme o badge mostrando o nome real **"TRILHA C · Sucesso"**.
- [ ] **KPI "Vindas de campanha"** (`/mensageria/analytics`): deve refletir a proporção correta
  entre a conversa orgânica (não conta) e a conversa atribuída (conta).

### Fase 4 — De volta aos dashboards de Campanhas (o resultado final de tudo acima)

Use o cliente "TRILHA C — Cliente Teste" no seletor em cada tela:

- [ ] **Dashboard → Visão Geral:** 4 campanhas (5 com a opcional), leads totais = 15+0+8+3(+2) =
  **26** (ou 28 com a opcional), CPL médio combinado.
- [ ] **Dashboard → CPL por Rede:** Meta e Google devem aparecer separados, cada um com o CPL
  correto da sua própria campanha (Meta ≈ R$26,15 combinando cenários 1+2+4; Google = R$65).
- [ ] **Insights da IA:** confira as 3-4 recomendações — **Cenário 1 → SCALE**, **Cenário 2 →
  PAUSE**, **Cenário 3 → OPTIMIZE/ALERT**, nunca invertidas ou trocadas entre si.
- [ ] **Desperdício de Verba:** Cenário 2 em `ZERO_LEADS_SPEND` (categoria mais grave); Cenário 3
  em `ELEVATED_CPL_SPEND`; Cenário 1 em nenhuma categoria de desperdício.
- [ ] **Portfolio:** linha do cliente teste com status agregado; **atenção a uma nuance real que
  vale a pena observar, não é bug**: o Cenário 2 (gasto real, zero lead) tende a aparecer como
  `nodata` no Portfolio (CPL indefinido) mas como o pior caso em Desperdício de Verba — são
  definições diferentes de "sem dado" em telas diferentes; confirme que isso não parece
  contraditório/confuso na prática, e se parecer, reporte como achado de UX.
- [ ] **Auditoria:** rode uma nova auditoria pro cliente teste — score deve refletir a mistura
  (1 campanha ótima + 1 péssima + 1 mediana), não só a média simples.
- [ ] **Mapa de Campanhas:** se as campanhas de teste tiverem localização configurada, confirme
  que aparecem no mapa com os leads corretos.

### Fase 5 — Agentes (decisão automática, aprovação, briefing)

- [ ] Disparo manual do sync/decisor (cron `POST /api/cron/campanhas/sync`, o mesmo que roda
  sozinho a cada 6h — não dá pra esperar o agendamento real durante o teste).
- [ ] Confirme em `AgentAction` (posso consultar direto no banco pra você, ou expor numa tela se
  preferir): uma ação **SCALE** ou **OPTIMIZE** pro Cenário 1 (`PENDING_EXECUTION` — auto-executa;
  a chamada real à API do Meta vai falhar sem token de produção, mas o **registro da decisão**
  deve existir e estar correto) e uma ação **PAUSE**/**ALERT** pro Cenário 2
  (`PENDING_APPROVAL` — deveria gerar notificação, mesmo que o envio real de WhatsApp/Slack falhe
  sem credenciais configuradas).
- [ ] Teste os links `GET /api/agent/approve/[id]` e `/reject/[id]` da ação pendente do Cenário 2
  — confirme que aprovam/rejeitam corretamente (não exigem JWT, só o UUID da ação).
- [ ] Gere um **Briefing Estratégico** novo pro cliente teste (botão real na UI) — a narrativa
  deve citar corretamente qual campanha performou bem e qual precisa de atenção, com os números
  certos (não pode, por exemplo, recomendar pausar o Cenário 1).

### Sequência recomendada (ordem de acesso pelos 3 módulos)

Pensada pra espelhar a jornada real de um lead — mais fácil de acompanhar do que pular entre
telas soltas:

1. **CRM** → criar o cliente de teste (`/admin/clientes/novo`)
2. *(eu semeio as campanhas 1-5 — Fase 0)*
3. **Campanhas** → gerar os leads dos Cenários 1, 3, 4 (Fase 1) — acompanhando o dashboard
   atualizar a cada passo, não só no final
4. **CRM** → Kanban: conferir distribuição, mover 1 lead do Cenário 1 até "fechamento" (Fase 2)
5. **CRM** → criar o lead avulso (visita presencial), confirmar que fica fora de Campanhas
6. **Mensageria** → conversa orgânica + conferir atribuição real (Fase 3)
7. **Campanhas** → dashboards completos, agora com todo o dado no lugar (Fase 4)
8. **Campanhas** → disparar agentes, checar `AgentAction`, aprovar/rejeitar, gerar briefing (Fase 5)

### Limpeza ao final

Antes de considerar a Trilha C encerrada, eu removo (e confirmo 0 linhas residuais, mesmo padrão
de toda esta auditoria): as 4-5 campanhas de teste + `Insight` associado, os leads/CtaInteraction/
CtaSubmission/marketing_eventos/leads_kanban de cada cenário, a conversa de Mensageria orgânica,
o `AgentAction` gerado, e o cliente "TRILHA C — Cliente Teste" em si.

---

## Trilha D — Validação contra as APIs reais do Meta e do Google (pendente, bloqueada em pré-requisitos)

### Por que existe

A/B/C provam que nosso código calcula certo **dado um payload no formato que o Meta/Google
documentam enviar**. Nenhuma delas prova que o Meta/Google realmente entregam esse payload nesse
formato, em condições reais — nem que nosso fluxo de OAuth/webhook funciona contra a infra real
deles. Isso só se resolve com credenciais reais (não precisa ser "produção" aberta a clientes).

### Duas camadas de custo (Meta)

- **Camada 1, custo zero:** criar campanha real via API com `status: PAUSED` (valida token/API de
  criação sem nunca rodar) + usar o recurso de "lead de teste" do próprio Meta Ads Manager num
  Formulário Instantâneo real (valida a entrega real do webhook — HTTPS, assinatura, formato do
  payload — sem gastar nada).
- **Camada 2, gasto real pequeno:** só a sincronização real de métricas (`Insight.spend/
  impressions` de verdade) e um clique real de anúncio exigem anúncio efetivamente rodando —
  decisão de gasto ainda não tomada pelo usuário, fica em aberto.

### Estado atual dos pré-requisitos (levantado em 2026-07-22)

| Pré-requisito | Status |
|---|---|
| Conta Meta Business | ✅ existe |
| App registrado no Meta for Developers (App ID/App Secret) | ✅ já existe |
| Deploy de staging na VPS (URL pública HTTPS pro webhook) | ⏳ **usuário quer decidir separadamente — não fazer sem confirmação explícita** |
| Conta Google Ads | ❌ não existe — precisa ser criada pelo usuário (cadastro com dado da empresa, não é algo que o Claude deva fazer) |
| Manager Account + conta de teste do Google Ads | ❌ depende do item acima |
| Developer Token do Google Ads | ❌ depende dos itens acima |

### Próximos passos reais, na ordem, quando o usuário decidir avançar

1. Usuário decide sobre o deploy de staging na VPS (pré-requisito pro webhook real do Meta,
   Camada 1 e 2).
2. Usuário cria a conta Google Ads (quando quiser) → Claude ajuda a configurar Manager Account +
   conta de teste + Developer Token + credenciais em `tenant_network_credentials`.
3. Com staging no ar: testar Camada 1 do Meta (campanha pausada via API + lead de teste no
   Formulário Instantâneo) — zero custo.
4. Decisão de gasto real pequeno pra Camada 2 do Meta (spend sync + clique real) — ainda em
   aberto, não decidir sem confirmação explícita do usuário.

---

## Trilha E — Camada de simulação (adapter fake, sem depender de credencial real)

### Por que é uma trilha separada da D, não parte dela

D e E resolvem problemas opostos. D valida que a integração real com Meta/Google funciona —
precisa de credencial real, está bloqueada até o usuário decidir os pré-requisitos. E valida que
**nossa própria lógica** (dashboards, alertas, agentes) reage corretamente a uma resposta de rede
— não depende de nada externo, pode rodar agora, e continua útil depois de D estar pronta, como
ferramenta de regressão rápida e repetível.

### Por que não é só "mais dado semeado" (o que já fazemos)

Dado semeado direto no banco (ex.: `google-test-imoveis-sp-001`) testa só o **lado de leitura**
— pula inteiramente o código de integração (o cron de sync nunca roda de verdade contra nada, a
criação de campanha via wizard nunca é exercitada). Um **adapter fake**, implementando a mesma
interface `AdNetworkService` já usada por `MetaAdsAdapter`/`GoogleAdsAdapter` e plugado na mesma
fábrica (`buildNetworkService`, `src/lib/marketing/networks/factory.ts`), faz o cron real
(`agentMonitor.syncMetrics()`) e a criação de campanha real (`POST /campaigns`) rodarem de
verdade — só a resposta do "outro lado" é simulada. Isso pega uma classe de bug que dado semeado
nunca pegaria: erro de mapeamento campo-a-campo na resposta do adapter (já aconteceu uma vez
neste projeto — extração errada de `resource_name` na resposta do Google), comportamento do cron
quando um tenant falha, o fluxo inteiro de lançamento de campanha ponta a ponta.

### O que isso NÃO substitui

Não testa OAuth real, entrega real de webhook, nem peculiaridades reais de payload que não
documentamos/imaginamos — se o nosso entendimento da API estiver errado, o simulador "confirma"
um bug como certo. Não deve tentar replicar fielmente pacing de orçamento/leilão (opaco de
propósito, não dá pra replicar e não precisamos). Dado simulado deve ficar sempre claramente
rotulado, nunca se misturar silenciosamente com dado real.

### Escopo — ainda não decidido pelo usuário

Três níveis de esforço/cobertura considerados, aguardando decisão:
1. **Só `fetchInsights`** (métricas) — cobre cron de sync + agentes/alertas/dashboards, ~90% do
   que falta testar de verdade, menor esforço.
2. **Insights + `createCampaign`** — fecha também o fluxo do Wizard ponta a ponta ("Opção A
   pendente", registrada há tempo no projeto).
3. **Tudo** (Insights + campanha + `fetchSearchTerms`/`addNegativeKeyword` do Google) —
   cobertura completa dos métodos usados hoje.

**Nenhum código foi escrito ainda — só a proposta e a metodologia estão registradas.**

---

## Status

**Trilha A: concluída, 0 discrepâncias encontradas** (14 consumidores + 3 casos de borda).
**Trilha B: pendente — aguardando execução manual pelo usuário.**
**Trilha C: pendente — roteiro definido, aguardando início (Fase 0 a cargo do Claude).**
**Trilha D: pendente — bloqueada em pré-requisitos de infraestrutura/conta, decisões do usuário
ainda em aberto (ver tabela acima). Não avançar nenhum item sem confirmação explícita.**
**Trilha E: proposta registrada — aguardando o usuário decidir o escopo (1, 2 ou 3 acima) antes
de qualquer implementação.**
