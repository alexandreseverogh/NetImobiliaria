# PLANO ESTRATÉGICO — Unificação de Leads entre Campanhas, CRM e Mensageria

> **Status:** v1.1 (2026-07-20) — Arquitetura-alvo + **4 decisões tomadas** (§8) e seu **impacto
> técnico detalhado** (§9). Pendente só confirmação final do D3 (token vs. telefone).
> **Autor da análise:** Claude (sessão de reconciliação holística dos 3 módulos).
> **Natureza:** Definição de alto nível (executiva, comercial, estratégica) + arquitetura técnica
> detalhada + plano de testes por cenário de contratação. **Nenhum código foi alterado para
> produzir este documento** — ele parte do que *de fato existe* no banco e no código hoje.
> **Fonte da verdade deste plano:** verificação direta no schema PostgreSQL + leitura dos 10
> documentos de CRM em `docs/` + leitura do código de ingestão/atribuição/dashboard.

---

## 0. SUMÁRIO EXECUTIVO (C-Level)

A plataforma comercializa **três módulos independentes** — Gestão de Campanhas, CRM de Vendas e
Mensageria — que um tenant pode contratar isolados ou combinados. Hoje, o conceito de **"lead"**
está **fragmentado e inconsistente** entre eles, violando o princípio de *fonte única da verdade*:

- O módulo de **Campanhas conta "lead" de duas formas contraditórias ao mesmo tempo** (o painel
  conta *cliques*; a lista de leads conta *leads reais do CRM*) — dois números para a mesma palavra.
- O **clique pago de campanha nunca chega ao CRM** de forma automática no caminho de WhatsApp.
- A tabela `clientes` está **semanticamente sobrecarregada** (mistura consumidor pessoa física,
  comprador pessoa jurídica e cliente-da-agência).
- O funil exibido no dashboard de Campanhas é, em parte, **decorativo** (a etapa "negócio fechado"
  vem de um número da plataforma de anúncio que quase nunca é preenchido).

**A boa notícia:** a arquitetura correta **já foi concebida** (e parcialmente construída) pelo time
de CRM. Existe uma tabela canônica de lead (`leads_staging`), uma tabela de atribuição de campanha
(`marketing_eventos`), um endpoint único de ingestão (`/api/crm/leads`) e uma camada de captura de
CTAs (`CtaDestination`/`CtaInteraction`/`CtaSubmission`). Inclusive, **um caminho campanha→CRM que
NÃO depende de Mensageria já funciona** (webhook de Meta Lead Ads).

**O trabalho, portanto, não é inventar a fonte única — é consolidá-la:** conectar o módulo de
Campanhas à fonte canônica que o CRM já estabeleceu, completar as pontes que faltam, resolver a
sobrecarga da `clientes`, unificar a definição de "lead", e redesenhar as visões de funil — tudo
respeitando a **venda segregada dos módulos**.

**Impacto de negócio esperado:** atribuição de receita real de volta ao criativo/campanha (ROAS
verdadeiro, não o reportado pela plataforma), CPL e CPA honestos, e um funil ponta-a-ponta do R$
investido ao R$ faturado — que é o diferencial competitivo central do produto.

---

## 1. VISÃO COMERCIAL — Os três módulos como produtos separados

| Módulo | Slug | Features | O que entrega isolado |
|--------|------|----------|-----------------------|
| **Gestão de Campanhas** | `trafego-pago` | 11 | Lança/otimiza mídia paga (Meta/Google/TikTok), gera **interesse** (cliques/leads), mede CPL/ROAS |
| **CRM de Vendas** | (CRM) | 12 | Recebe leads de **todas as origens**, qualifica, distribui a corretores, trabalha o funil até o negócio fechado |
| **Mensageria** | `mensageria` | 6 | Inbox multicanal + bot; captura conversas (WhatsApp/webchat) e as transforma em contatos |

### 1.1. Princípio inegociável: independência de módulos

O fluxo de negócio **nunca** pode exigir a presença de um módulo que o tenant não contratou.
Concretamente:

- **Campanhas → lead no CRM** não pode depender de **Mensageria**. (Resolvido pela camada de
  captura — §3.3.)
- **CRM** deve funcionar recebendo leads de origens não-campanha (formulário do site, telefone,
  visita presencial, indicação) mesmo sem o módulo de Campanhas.
- **Mensageria** deve funcionar como canal de atendimento mesmo sem CRM (as conversas viram
  contatos internos do módulo, sem pipeline de vendas).

### 1.2. Matriz de contratação — comportamento esperado por combinação

> Legenda: **C** = Campanhas · **R** = CRM · **M** = Mensageria

| Combo | Campanhas gera lead efetivo no CRM? | Comportamento |
|-------|--------------------------------------|---------------|
| **C** | — (sem CRM) | Mostra interesse/cliques + funil de mídia; leads ficam listáveis/exportáveis no próprio módulo |
| **R** | sim (origens não-campanha) | Formulário do site, telefone, visita, indicação → pipeline completo |
| **M** | — (sem CRM) | Inbox/bot; conversas viram contatos do módulo, sem pipeline |
| **C + R** | **✅ sim** | Via **Lead Ads/formulário** → `/api/crm/leads` (independente de M). WhatsApp-CTA = entrada manual |
| **C + M** | — (sem CRM) | Conversa de WhatsApp capturada pela Mensageria, mas sem pipeline pra trabalhar |
| **R + M** | sim (origem WhatsApp) | Mensageria → CRM, sem atribuição de campanha |
| **C + R + M** | **✅ pleno** | Qualquer CTA (formulário OU WhatsApp) → lead com atribuição → pipeline → ganho → ROI ponta-a-ponta |

**O cenário crítico** é **C + R sem M**: precisa gerar lead efetivo no CRM a partir de campanha. É
possível hoje (Meta Lead Ads já faz), e o redesenho o torna a regra, não a exceção.

---

## 2. RECONCILIAÇÃO DA REALIDADE — Projetado × Construído × Divergente

Esta seção é o inventário honesto do que existe. É a base factual de todo o resto.

### 2.1. As tabelas de "lead" que coexistem hoje

| Tabela | Schema | Grão | O que é | Registros* |
|--------|--------|------|---------|-----------|
| `"Lead"` | `campanhasmarketingdigital` | 1 clique | **Evento de clique anônimo** no CTA (phoneClicked = número da EMPRESA, não do lead) | ~6.168 |
| `leads_staging` | `public` | 1 lead | **Lead canônico** (nome/telefone/status/score) — a fonte da verdade projetada do CRM | ~10 |
| `marketing_eventos` | `public` | 1 evento de atribuição | UTM + `fbclid`/`gclid` + `creative_id` + plataforma, FK → `leads_staging` | ~10 |
| `CtaInteraction` / `CtaSubmission` | `campanhasmarketingdigital` | interação/submissão | Camada de captura de mecanismos de CTA | — |

*Contagens do ambiente de desenvolvimento (inflado por dados de teste); ilustram a ordem de
grandeza da divergência, não produção.

### 2.2. Os caminhos de ingestão que existem

```
CAMINHO 1 — WhatsApp CTA (o desligado):
  clique no anúncio → /api/r/[trackingId] → INSERT campanhasmarketingdigital."Lead" (anônimo)
                                          → redirect wa.me/[número-da-EMPRESA]
  ❌ NÃO chama /api/crm/leads. NÃO cria leads_staging. Identidade nunca capturada aqui.

CAMINHO 2 — Meta Lead Ads (o correto, já funciona, SEM Mensageria):
  submit do formulário Meta → /api/public/meta-leads/webhook → /api/crm/leads
                            → INSERT leads_staging + marketing_eventos + dedup + distribuição
  ✅ Identidade (nome/telefone) capturada no submit. Independente de Mensageria.

CAMINHO 3 — Formulário do site (orgânico):
  /api/public/imoveis/prospects → INSERT leads_staging (+ qualificação IA)
  ✅ Independente de campanha e de Mensageria.

CAMINHO 4 — Mensageria (WhatsApp/webchat):
  webhook Evolution → ingestMessage → contacts (Mensageria)
  ⚠️ Cria contato na Mensageria; ligação com leads_staging ainda não cabeada.
```

### 2.3. As divergências críticas (os problemas reais)

1. **Dupla definição de "lead" DENTRO do módulo de Campanhas.** O **dashboard** (KPI "Leads",
   funil, "Onde está o Dinheiro?") conta a tabela de **cliques**. A **página `/admin/campanhas/
   leads`** conta `leads_staging` + `marketing_eventos`. São números diferentes para a mesma
   palavra, ambos em produção. *(Nota: a correção recente do "Onde está o Dinheiro?" leu a tabela
   de cliques — coerente com o desenho atual do dashboard, mas que a rigor deve convergir para a
   fonte canônica, como a página de leads já faz.)*

2. **O clique pago não alimenta a atribuição canônica.** `marketing_eventos` tem colunas para
   `fbclid`/`gclid`/`creative_id`, mas hoje só recebe origem de formulário/WhatsApp-orgânico — os
   cliques pagos (Caminho 1) ficam de fora. A atribuição de campanha no CRM está cega para o
   tráfego pago via WhatsApp.

3. **`clientes` sobrecarregada.** Mistura: (a) cliente-da-agência pessoa jurídica (origem
   'Plataforma', tem `segment_id`, estruturalmente carrega pixel/page/whatsapp), (b) comprador
   pessoa jurídica, e (c) consumidor pessoa física (origem 'Publico'). Três conceitos, uma tabela.

4. **Colisão conceitual de "campanha".** `campanhasmarketingdigital."Campaign"` (mídia paga) vs. a
   `campanhas_marketing` "emocional" do plano de CRM (projetada, **não construída**).

### 2.4. Projetado mas NÃO construído (gap de implementação)

- **Match Engine / dedupe** (casar lead novo com `clientes`/`proprietarios` por telefone, gravando
  `match_method`/`match_type`) — **projetado no plano mestre, não existe no banco** (sem coluna
  `match_method`, sem função de dedupe).
- **Modelo rico de `leads_staging`** (inteligência emocional, preferências de lazer/educação,
  venda casada, `intencao`, `perfil_negocio`) — **projetado, só parcialmente construído** (a tabela
  real tem ~24 colunas; a projetada, o dobro).
- **CRM agnóstico de domínio** (`DistributionContext` genérico para Saúde/Educação) — projetado; o
  motor de distribuição/transbordo real **ainda é acoplado a imóvel** (`imovel_id` → `corretor_fk`
  → match geográfico).

---

## 3. MODELO CANÔNICO ALVO

### 3.1. Princípio: uma fonte por conceito, módulos referenciam (não copiam)

O lead **não pertence** a Campanhas nem a CRM nem a Mensageria. Ele vive numa **camada canônica**,
e cada módulo adiciona uma *camada* por cima do mesmo registro:

| Camada | Dono conceitual | Tabela canônica | Adiciona |
|--------|-----------------|-----------------|----------|
| **Lead** (identidade + funil) | núcleo (compartilhado) | `leads_staging` | nome, telefone, status, score, origem, atribuição a corretor |
| **Atribuição de campanha** | Campanhas | `marketing_eventos` | de qual campanha/anúncio/criativo/UTM veio (FK → lead) |
| **Interesse/interação** | Campanhas | `CtaInteraction` | o clique/evento (pode ser anônimo até a identidade resolver) |
| **Conversa** | Mensageria | `contacts`/`messages` | o diálogo (FK → lead quando identificado) |
| **Workflow de vendas** | CRM | `leads_kanban` | posição no funil, negócio ganho/perdido, valor |

**Regra de ouro:** cada fato (o gasto, o lead, a conversa, a venda) existe em **um único lugar**.
Nada é duplicado entre schemas. Os módulos se **ligam por FK/referência**, nunca por cópia — é
assim que se obtém *fonte única da verdade* com módulos independentes.

### 3.2. `leads_staging` + `marketing_eventos` = a fonte canônica de lead

Formaliza-se o que já foi desenhado:

- **`leads_staging`** é a **única tabela de lead** da plataforma. Toda origem (campanha, site,
  telefone, visita, indicação, WhatsApp) resulta em (ou atualiza) uma linha aqui. `origem` é um
  atributo, não uma tabela separada.
- **`marketing_eventos`** é a **camada de atribuição** — preenchida quando a origem é campanha
  (UTM/click-id/criativo/plataforma).
- **`/api/crm/leads` (POST)** é o **único ponto de ingestão** — dedup + insert em `leads_staging` +
  insert em `marketing_eventos` + disparo de distribuição. Todos os caminhos de captura convergem
  para cá.

> **Consequência para o módulo de Campanhas:** o dashboard e a página de leads passam a ler a
> MESMA fonte (`leads_staging`), acabando com a dupla definição. "Cliques" e "Leads identificados"
> tornam-se **duas métricas distintas e nomeadas** (não mais a mesma palavra com dois números).

### 3.3. A camada de captura — o que desacopla Campanhas de Mensageria

O ponto-chave que resolve a exigência de independência da Mensageria: **a captura de identidade
depende do MECANISMO do CTA, não da Mensageria.** A plataforma tem (parcialmente) uma camada de
adaptadores de captura (`CtaDestination`/`CtaInteraction`/`CtaSubmission`), e todos desembocam no
`/api/crm/leads`:

| Adaptador de captura | Identidade capturada em | Precisa de Mensageria? | Estado |
|----------------------|-------------------------|------------------------|--------|
| **Meta/Google Lead Ads** (formulário nativo) | no submit | ❌ Não | ✅ construído (webhook) |
| **Formulário próprio / landing** | no submit | ❌ Não | ✅ construído (site) |
| **Entrada manual** (corretor digita) | na hora | ❌ Não | ✅ construído |
| **WhatsApp** (`wa.me`) | quando a mensagem chega | ⚠️ Sim (ou manual) | 🔴 clique anônimo, a cabear |

**Fluxo alvo do clique de campanha:**

```
CTA de formulário (Lead Ads/landing):
  clique → CtaInteraction (interesse, atribuição) → submit → /api/crm/leads
        → leads_staging + marketing_eventos (identidade + atribuição)   ✅ sem Mensageria

CTA de WhatsApp:
  clique → CtaInteraction (interesse anônimo + token de rastreio no deep-link)
        → mensagem chega:
            • COM Mensageria → parseia o token → /api/crm/leads (identidade + atribuição)
            • SEM Mensageria → permanece interesse anônimo; corretor pode registrar manual
```

Assim, **a Mensageria é apenas o adaptador do WhatsApp** — quando presente, resgata o CTA de
WhatsApp para o fluxo canônico; quando ausente, o tenant usa CTAs de formulário (recomendado) e o
fluxo campanha→CRM funciona igual.

### 3.4. A ponte que falta construir (o clique pago → canônico)

O único elo a construir de fato é conectar o **Caminho 1** (clique de campanha) à camada de
captura/ingestão:

1. **CTA de formulário como padrão recomendado** para tenants que querem lead identificado sem
   Mensageria: o wizard de campanha passa a oferecer "Formulário (Lead Ads)" além de "WhatsApp".
2. **Token de rastreio no deep-link do WhatsApp** (`wa.me/...?text=...#ref=<token>`): o
   `/api/r/[trackingId]` gera um `CtaInteraction` com token; quando a mensagem chega na Mensageria,
   o token liga a conversa ao clique original → `/api/crm/leads` com atribuição precisa (melhor que
   match por telefone, que quebra com número compartilhado/trocado).
3. **Deprecar a tabela de cliques como "lead":** `campanhasmarketingdigital."Lead"` deixa de ser
   "lead" e passa a ser explicitamente "interações/cliques" (métrica de mídia), OU migra para
   `CtaInteraction`. O KPI do dashboard passa a distinguir **Cliques** (mídia) de **Leads
   identificados** (canônico).

### 3.5. Nota de robustez multi-segmento

Toda a modelagem acima é **agnóstica de segmento**. `leads_staging` já é genérico (nome/telefone/
score/origem). O acoplamento a imóvel (`imovel_id`, roteamento por `corretor_fk`/geo) deve ser
tratado como **um adaptador de domínio** (conforme o plano "CRM Agnóstico Multi-Domínio" já previa,
via `DistributionContext`), não como regra do núcleo — para que Saúde, Veículos, etc. reusem o
mesmo motor.

---

## 4. RESOLUÇÃO DA SOBRECARGA DA `clientes`

Hoje `clientes` mistura três entidades. A separação-alvo:

| Entidade | O que é | Onde deve viver |
|----------|---------|-----------------|
| **Cliente-da-agência** (PJ) | Empresa para quem o tenant gerencia campanhas/CRM (tem segment_id, pixel, page, whatsapp) | Conceito de **sub-conta/cliente gerenciado** — permanece em `clientes` (ou tabela dedicada `managed_accounts`), é o `client_id` que já perpassa todos os módulos |
| **Consumidor** (PF) | Pessoa física que virou lead e depois comprador | **`leads_staging`** (lead) → ao fechar negócio, vira registro de **cliente-comprador** (relação com o negócio, não com a config de campanha) |
| **Comprador** (PJ) | Pessoa jurídica compradora | idem consumidor, com tipo_pessoa = PJ |

**Direção recomendada (a detalhar em fase técnica):** introduzir um discriminador explícito
`tipo_registro` / `tipo_pessoa` e **separar "conta gerenciada" de "contato/comprador"** — hoje
colapsados. Isso é pré-requisito para relatórios íntegros (ex.: "quantos leads viraram compradores"
não pode se confundir com "quantas empresas o tenant gerencia"). É uma migração sensível (a
`clientes` é referenciada por Campanhas, CRM e credenciais Meta) e terá plano próprio na §6.

---

## 5. AS VÁRIAS VISÕES DE FUNIL

Cada visão é **honesta sobre o que o módulo contratado consegue enxergar** e some/aparece conforme
o combo. Nenhuma finge enxergar o que não tem dado.

### Visão 1 — Funil de Mídia *(Campanhas; disponível sempre que há Campanhas)*
```
Investimento → Impressões → Cliques → Interesses (cliques em CTA)
```
- **Fonte:** `Insight` (impressões/cliques/spend) + `CtaInteraction` (cliques em CTA).
- **KPIs:** CTR, CPC, **Custo por Interesse**.
- **Honestidade:** termina no interesse. É o teto do que Campanhas sozinho sabe. Substitui o funil
  atual "decorativo" (que fingia mostrar conversão/venda via `Insight.conversions`).

### Visão 2 — Funil de Aquisição *(Campanhas + captura de identidade)*
```
Cliques → Contatos identificados (leads_staging) → [taxa clique→contato]
```
- **Fonte:** `CtaInteraction` (clique) → `CtaSubmission`/`leads_staging` (identificado).
- **KPI de ouro (hoje invisível):** **taxa clique→contato** — quantos que clicaram se identificaram.
  Diretamente acionável (muito clique, pouco contato = criativo/landing enganosos).
- **KPI:** **Custo por Lead Identificado** (o CPL *real*, não o "custo por clique" chamado de CPL hoje).

### Visão 3 — Funil Comercial *(CRM; independente de origem)*
```
Lead → Em Análise → Entendimento da Dor → Visita Agendada → Proposta → Fechamento / Perdido
```
- **Fonte:** `leads_kanban` + `kanban_colunas` (as etapas reais já existentes).
- **KPIs:** conversão por etapa, ciclo de venda (cycle time), valor, motivo de perda.
- **Independente de Campanhas:** funciona com leads de form/telefone/visita/indicação.

### Visão 4 — Funil de Receita / Unificado *(Campanhas + CRM)*
```
Investimento → Impressões → Cliques → Interesses → Leads Identificados →
              Qualificados → Visitas → Propostas → Ganhos → RECEITA
```
- **Fonte:** todas as camadas ligadas por `lead_uuid` + `marketing_eventos`.
- **KPIs de ouro:** **CPA real** (custo por negócio fechado), **ROAS real** (receita/investimento) —
  atribuídos de volta ao **criativo/campanha/ângulo**. Este é o funil que **transforma o produto**:
  responde "qual criativo gerou receita", não só "qual gerou clique".
- **Disponível só em C + R.** É o payoff comercial da integração.

> **Regra de renderização:** o dashboard compõe as visões que o tenant contratou. Ex.: só Campanhas
> → Visões 1 e 2 (parcial). Campanhas + CRM → todas. Só CRM → Visão 3. Nunca mostra uma etapa cujo
> dado o tenant não tem como alimentar.

---

## 6. PLANO DE MIGRAÇÃO (do fragmentado ao canônico, sem quebrar legado)

Fases incrementais, cada uma entregável e reversível. Ordem por dependência e risco.

| Fase | Entrega | Risco | Pronto quando |
|------|---------|-------|---------------|
| **F0 — Diagnóstico congelado** | Este documento + inventário de contagens reais em produção | Nenhum | Aprovado |
| **F1 — Unificar leitura no módulo de Campanhas** | Dashboard e página de leads leem a MESMA fonte; separar "Cliques" (mídia) de "Leads identificados" (canônico) nos KPIs | Baixo (só leitura) | Os dois números param de divergir; nomes distintos na UI |
| **F2 — Cabear clique de campanha → captura** | CTA de formulário (Lead Ads) no wizard + token de rastreio no deep-link WhatsApp → `CtaInteraction` | Médio | Clique pago gera `CtaInteraction` com atribuição |
| **F3 — Ingestão canônica dos leads de campanha** | Lead Ads/form → `/api/crm/leads`; WhatsApp+Mensageria → `/api/crm/leads` via token | Médio | Lead de campanha aparece em `leads_staging` com `marketing_eventos` |
| **F4 — Match Engine** | Construir o dedupe projetado (casa por telefone/email contra leads/contatos existentes, grava `match_method`) | Médio | Lead duplicado não gera 2 registros; origem rastreável |
| **F5 — Separar tipos na `clientes`** | Discriminador conta-gerenciada × contato/comprador; migração de dados | **Alto** (tabela muito referenciada) | Relatórios de "lead→comprador" íntegros; sem mistura PF/PJ/agência |
| **F6 — Funil unificado (Visão 4)** | Atribuição receita→criativo ponta-a-ponta, condicional por combo | Médio | CPA/ROAS reais no dashboard para tenants C+R |
| **F7 — CRM agnóstico de domínio** | Extrair acoplamento a imóvel para adaptador (`DistributionContext`) | Médio | Segmento não-imobiliário roteia lead sem código novo |

**Regras de migração:**
- Nada destrutivo: tabelas legadas preservadas até a paridade ser provada.
- Cada fase por trás de flag/feature quando tocar fluxo público.
- `campanhasmarketingdigital."Lead"` (cliques) só é deprecada como "lead" **depois** de F1–F3
  provarem a fonte canônica — nunca antes.

---

## 7. PLANO DE TESTES RIGOROSO — por cenário de contratação

Princípio: **cada combo de módulos é um contrato de comportamento** que precisa ser testado ponta a
ponta, incluindo a **degradação graciosa** (o que deve ficar oculto/manual quando um módulo falta).
Os testes cobrem o fluxo completo: **captura → ingestão → atribuição → qualificação → distribuição →
funil**.

### 7.1. Matriz mestre de cenários

| # | Combo | Fluxo a validar | Resultado esperado |
|---|-------|-----------------|--------------------|
| T1 | **C** | Campanha WhatsApp-CTA + form-CTA | Cliques e interesses contados; SEM pipeline; leads listáveis/exportáveis; funil de mídia (Visão 1/2) |
| T2 | **R** | Lead via form do site + entrada manual | `leads_staging` criado, qualificado, distribuído; funil comercial (Visão 3); **nenhuma** dependência de Campanhas/Mensageria |
| T3 | **M** | Conversa WhatsApp recebida | Contato criado na Mensageria; SEM pipeline de vendas; nenhum lead em `leads_staging` exigido |
| T4 | **C + R** (sem M) | **Lead Ads/form → /api/crm/leads** | Lead de campanha em `leads_staging` + `marketing_eventos`; entra no pipeline; **funciona sem Mensageria** |
| T5 | **C + R** (sem M) | WhatsApp-CTA sem Mensageria | Interesse/clique contado; identidade NÃO resolvida automaticamente; corretor registra manual; nada quebra |
| T6 | **C + M** (sem R) | WhatsApp-CTA + token | Conversa capturada e ligada ao clique; SEM pipeline (sem CRM); interesse atribuído |
| T7 | **R + M** (sem C) | WhatsApp → CRM | Conversa vira lead no pipeline; `marketing_eventos` vazio (sem campanha); sem erro |
| T8 | **C + R + M** | WhatsApp-CTA → token → Mensageria → CRM | Lead identificado com atribuição de campanha; pipeline; **Visão 4** (CPA/ROAS reais) |
| T9 | **C + R + M** | Lead Ads → CRM (paralelo ao WhatsApp) | Ambos os caminhos convergem em `leads_staging` sem duplicar (Match Engine) |

### 7.2. Casos de degradação graciosa (obrigatórios)

- **DG1:** Tenant **sem CRM** clica em "ver leads no pipeline" → funcionalidade oculta/bloqueada,
  não erro; leads permanecem exportáveis no módulo de Campanhas.
- **DG2:** Tenant **sem Mensageria** usa WhatsApp-CTA → dashboard mostra "interesse/clique" e um
  aviso claro de que a identificação automática requer Mensageria ou CTA de formulário. Nunca
  promete um lead que não vai materializar.
- **DG3:** Tenant **sem Campanhas** no CRM → funil comercial e leads funcionam; seções de
  atribuição de campanha (`marketing_eventos`) aparecem vazias/ocultas, sem quebrar.
- **DG4:** Módulo desprovisionado **no meio do ciclo de um lead** → o lead já existente continua
  íntegro; só as camadas do módulo removido deixam de ser alimentadas.

### 7.3. Testes de integridade da fonte única (anti-regressão)

- **I1:** Um mesmo lead que chega por **dois caminhos** (Lead Ads + WhatsApp) resulta em **UM**
  registro em `leads_staging` (Match Engine), com `marketing_eventos` acumulando as duas atribuições.
- **I2:** O número "Leads" do **dashboard** de Campanhas == o número da **página de leads** ==
  contagem real de `leads_staging` no escopo (fim da dupla definição).
- **I3:** "Cliques" (mídia) e "Leads identificados" (canônico) são **sempre exibidos como métricas
  distintas** — nunca a mesma palavra com dois significados.
- **I4:** Deprovisionar e reprovisionar um módulo **não duplica** nem perde leads.

### 7.4. Testes de atribuição (o coração do ROI)

- **A1:** Lead de campanha WhatsApp (via token) tem `marketing_eventos` com a campanha/anúncio/
  criativo **corretos** — não por adivinhação de telefone.
- **A2:** Negócio fechado (CRM) propaga para a **Visão 4** o CPA/ROAS atribuído ao criativo certo.
- **A3:** Lead sem origem de campanha (form do site) **não** recebe atribuição falsa de campanha.

> Cada linha desta seção vira um caso de teste executável (script + verificação de banco + verificação
> de UI ao vivo, no padrão já usado no projeto). A suíte deve rodar nos 7 combos antes de qualquer
> fase de migração ir a produção.

---

## 8. DECISÕES TOMADAS (2026-07-20)

As quatro decisões da §8 foram validadas com o usuário. Ficam registradas aqui; o **impacto
técnico detalhado de cada uma está na §9**.

| # | Decisão | Escolha do usuário |
|---|---------|--------------------|
| **D1** | Destino da tabela de cliques `campanhasmarketingdigital."Lead"` | **Migrar para `CtaInteraction`** (event_type='CLICK'). A tabela `Lead` deixa de existir como "lead" |
| **D2** | Sobrecarga da `clientes` | **Manter tabela única** + coluna discriminadora de tipo + ajuste na UI de clientes (sem tabela nova) |
| **D3** | Atribuição do WhatsApp-CTA | **Token de rastreio parseado no `ingestMessage`** (vale para qualquer canal da Mensageria, não só WhatsApp) — *pendente confirmação final do usuário sobre usar token vs. match por telefone* |
| **D4** | Ordem de execução | **Começar pela F1** (unificar leitura de "lead" no módulo de Campanhas) — pré-requisito natural da migração D1 |

---

## 9. IMPACTO TÉCNICO DAS DECISÕES

Verificação feita direto no schema + código (2026-07-20). Esta seção é o insumo da fase de
implementação — ainda **nenhum código foi alterado**.

### 9.1. D1 — Migração `Lead` → `CtaInteraction`

`CtaInteraction` é um **superset** de `Lead`. Mapa de campos:

| `Lead` (hoje) | → `CtaInteraction` | Observação |
|---------------|--------------------|------------|
| `id` (text) | `id` (uuid) | muda o tipo |
| `campaignId` | `campaign_id` | ✓ |
| `adId` | `ad_id` | ✓ |
| `phoneClicked` (NOT NULL) | *(descartado)* | era sempre o número da **empresa** — dado inútil, sem perda |
| `sourceUrl` | `referrer` | ✓ |
| `utmSource/Medium/Campaign/Content` | `utm_source/medium/campaign/content` | ✓ |
| `ipAddress` / `userAgent` | `ip_address` / `user_agent` | ✓ |
| `clickedAt` | `created_at` | ✓ |
| `tenant_id` / `client_id` | `tenant_id` / `client_id` | ✓ |
| *(não existe)* | **`event_type`** (VIEW/CLICK/SUBMIT) | o clique vira `event_type='CLICK'` |
| *(não existe)* | **`destination_id`** / **`cta_type`** | liga ao mecanismo de CTA |

**Pontos de código impactados:**
- **1 escrita:** `/api/r/[trackingId]` passa a gravar `CtaInteraction` (event_type='CLICK').
- **~16 leituras** (todas analytics do módulo de Campanhas): `dashboard/full`, `dashboard/funnel`,
  `dashboard/predictions`, `dashboard/segment`, `dashboard/campaign-map`, `portfolio`,
  `portfolio/cross-insights`, `iniciativas/[id]`, `iniciativas/[id]/briefing`, e os serviços
  `aiInsights`, `wastedSpendService`, `trackingHealthService`, `strategicBriefing`,
  `auditReportService`, `segmentIntelligenceService`. Dessas, ~11 usam `prisma.lead.*` (viram
  `prisma.ctaInteraction.*` + filtro `event_type='CLICK'`) e ~9 são SQL cru (troca de nome de
  tabela/colunas + o mesmo filtro).
- **Prisma:** model `Lead` (schema.marketing.prisma linha 306) substituído por model
  `CtaInteraction` (hoje a tabela só é acessada via SQL cru).
- **NÃO afeta** a página `/admin/campanhas/leads` — já lê a fonte canônica (`leads_staging`).

**Acoplamento com a F1:** ao virar "interações", os KPIs/funil hoje rotulados **"Leads"** passam a
contar **cliques**. Logo, a reetiquetagem (Cliques/Interesses × Leads identificados) **tem que sair
junto** — a migração D1 e a F1 são a mesma entrega. Risco: baixo conceitual, mecânico e espalhado
(16 arquivos), 100% confinado ao módulo de Campanhas.

### 9.2. D2 — Discriminador de tipo na `clientes`

Escolha **aditiva** — não quebra nenhuma das **7 FKs** que apontam para `clientes` (`Campaign`,
`Lead`, `MarketingInitiative`, `StrategicBriefing`, `client_benchmark_overrides`,
`imovel_prospects`×2).

**Banco:**
- 1 coluna nova `tipo_cliente` (valores sugeridos: `'conta_gerenciada'` = PJ cliente-da-agência;
  `'comprador_pj'`; `'consumidor_pf'`).
- Backfill: origem `'Plataforma'` → `conta_gerenciada`; origem `'Publico'` → `consumidor_pf`.

**UI (`src/app/admin/clientes/` — 4 páginas):** lista (badge + filtro por tipo); `novo`/`[id]/editar`
(seletor de tipo + campos condicionais — pixel/page/whatsapp só para `conta_gerenciada`);
`[id]` (detalhe).

**Nos 121 pontos que citam `clientes`:** a maioria **não muda**. Ganho de integridade real: os
seletores de cliente do módulo de Campanhas (`client_id` da campanha) passam a filtrar **só
`conta_gerenciada`** — hoje poderiam, em tese, listar um consumidor PF. Risco: baixo; parte sensível
é revisar os seletores para filtrar pelo tipo certo.

### 9.3. D3 — Token de rastreio (atribuição do WhatsApp-CTA)

**Mecanismo:** no CTA de WhatsApp, embute-se um código invisível no texto pré-preenchido do
`wa.me/[empresa]?text=...‹ref:TOKEN›`. Quando a mensagem chega, o token liga a conversa ao clique
exato — mais confiável que match por telefone (que quebra com número compartilhado/trocado/errado).

**Ponto de parse escolhido: `ingestMessage`** (`src/lib/mensageria/ingest.ts`) — por onde toda
mensagem passa, de qualquer canal — em vez do webhook Evolution bruto. Assim o mesmo mecanismo vale
para webchat/Instagram/etc. no futuro.

**Impacto (condicional à Mensageria — só roda nesse caminho):** 2 pontos de toque —
(1) `/api/r/[trackingId]` gera e embute o token; (2) `ingestMessage` ganha: achou token → chama a
ingestão canônica (`/api/crm/leads` com atribuição). Tenant sem Mensageria nunca executa isto (usa
CTA de formulário). **Alternativa** (se o token for recusado): match por telefone, menos confiável.
*Recomendação mantida: token via `ingestMessage`.*

### 9.4. D4 — F1 primeiro

F1 (unificar a leitura de "lead" no módulo de Campanhas: dashboard e página de leads lendo a mesma
fonte, com "Cliques" e "Leads identificados" como métricas distintas e nomeadas) é barata, de baixo
risco e — conforme §9.1 — **é a mesma entrega da migração D1**. É o ponto de partida.

---

**Documento:** `docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md` v1.1 (2026-07-20)
**Próxima revisão:** Confirmação final do D3 (token vs. telefone) e início da F1/D1.
