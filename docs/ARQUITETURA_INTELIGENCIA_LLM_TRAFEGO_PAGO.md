# Arquitetura de Inteligencia Artificial — Modulo de Trafego Pago

> Documento tecnico-estrategico que mapeia **toda a logica de inteligencia artificial**
> aplicada ao modulo de gestao de trafego pago, com foco na atuacao do LLM como
> **gestor senior de trafego pago autonomo**.

---

## 1. Visao Geral da Arquitetura de Inteligencia

O sistema de inteligencia opera em **tres camadas** que se complementam:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CAMADA DE APRESENTACAO                          │
│   Dashboard UI  ←→  Cards Insights  ←→  Briefing Panel  ←→  WhatsApp  │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                     CAMADA DE INTELIGENCIA (3 motores)                  │
│                                                                         │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────────────┐  │
│  │  MOTOR 1     │   │  MOTOR 2         │   │  MOTOR 3               │  │
│  │  Rule-Based  │──▶│  LLM Strategist  │──▶│  Autonomous Agent      │  │
│  │  (sem LLM)   │   │  (com LLM)       │   │  (Rule + LLM + Acao)  │  │
│  └──────────────┘   └──────────────────┘   └────────────────────────┘  │
│                                                                         │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                        CAMADA DE DADOS                                  │
│  Insight (metricas)  ←→  Lead  ←→  Campaign/AdSet/Ad  ←→  Meta API    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Principio Arquitetural: Resiliencia sem Dependencia

O sistema foi projetado para que **nenhuma funcionalidade critica dependa exclusivamente do LLM**.
Toda inteligencia possui um caminho rule-based como fallback:

```
Pedido de Inteligencia
    │
    ▼
┌─ LLM disponivel? ─┐
│  SIM               │  NAO
│  ▼                 │  ▼
│  Gera com LLM      │  Fallback rule-based
│  (analise rica)     │  (alertas + metricas brutas)
│  ▼                 │  ▼
└── Resultado entregue ao usuario ──┘
```

---

## 2. MOTOR 1 — Insights Rule-Based (sem LLM)

### 2.1. Arquivo-Fonte

`src/lib/marketing/services/aiInsights.ts`

### 2.2. Objetivo

Deteccao **deterministica** de anomalias e oportunidades, executando em tempo real,
sem custo de API, sem latencia de rede, com resultados 100% reproduziveis.

### 2.3. Dados de Entrada

Para cada campanha, o motor consome:

```
┌───────────────────────────────────────────────┐
│              CampaignData                     │
├───────────────────────────────────────────────┤
│ campaignId      : UUID da campanha            │
│ campaignName    : Nome para exibicao          │
│ insights[]      : Ultimas 14 entradas diarias │
│ leads           : COUNT total de leads        │
│ totalSpend      : Soma de spend (R$)          │
│ avgCtr          : (totalClicks/totalImp)*100   │
│ avgCpc          : totalSpend/totalClicks (R$)  │
│ avgFrequency    : Media de frequency           │
│ trend           : 'up' | 'down' | 'stable'   │
│ daysRunning     : Qtd de dias com dados       │
└───────────────────────────────────────────────┘
```

### 2.4. Calculo de Tendencia (trend)

```
trend = calculateTrend(insights[])

Logica:
  - Se insights < 4 dias → 'stable'
  - Divide insights em 2 metades (recente vs. antiga)
  - Calcula media de CPC de cada metade
  - Se CPC recente > CPC antigo * 1.15 → 'up'    (piora de 15%+)
  - Se CPC recente < CPC antigo * 0.85 → 'down'  (melhora de 15%+)
  - Caso contrario → 'stable'
```

### 2.5. As 6 Regras de Deteccao

```
┌──────┬────────────────────────┬──────────────────────────────────────┬──────────────────────────────┐
│ #    │ TIPO                   │ CONDICAO DE DISPARO                  │ CONFIANCA                    │
├──────┼────────────────────────┼──────────────────────────────────────┼──────────────────────────────┤
│  1   │ PAUSE                  │ CTR < 1% por >= 3 dias               │ min(0.9, 0.6 + (dias-3)*0.1)│
│      │ "CTR muito baixo"      │                                      │ Ex: 3d=0.6, 6d=0.9          │
├──────┼────────────────────────┼──────────────────────────────────────┼──────────────────────────────┤
│  2   │ ALERT                  │ Frequencia media > 3.0               │ min(0.95, 0.7+(freq-3)*0.05) │
│      │ "Fadiga de anuncio"    │                                      │ Ex: 3.5=0.725, 5.0=0.8      │
├──────┼────────────────────────┼──────────────────────────────────────┼──────────────────────────────┤
│  3   │ ALERT                  │ trend='up' AND CPC > 0               │ Fixo: 0.70                   │
│      │ "CPC em alta"          │ AND dias >= 5                        │                              │
├──────┼────────────────────────┼──────────────────────────────────────┼──────────────────────────────┤
│  4   │ PAUSE                  │ Spend > R$50 AND leads = 0           │ min(0.95, 0.75+spend/500)    │
│      │ "Gasto sem resultados" │ AND dias >= 3                        │ Ex: R$100=0.95               │
├──────┼────────────────────────┼──────────────────────────────────────┼──────────────────────────────┤
│  5   │ SCALE                  │ Leads > 5 AND CTR > 2%               │ min(0.9, 0.6 + leads*0.02)   │
│      │ "Bom desempenho"       │                                      │ Ex: 10 leads=0.8             │
├──────┼────────────────────────┼──────────────────────────────────────┼──────────────────────────────┤
│  6   │ OPTIMIZE               │ Leads > 0 AND Spend > 0             │ Fixo: 0.75                   │
│      │ "CPL acima do ideal"   │ AND CPL (spend/leads) > R$20         │                              │
└──────┴────────────────────────┴──────────────────────────────────────┴──────────────────────────────┘
```

### 2.6. Diagrama de Fluxo — Geração de Insights

```
                    generateAiInsights(campaignId?, tenantId?, clientId?)
                                        │
                                        ▼
                            ┌─ Buscar campanhas ─┐
                            │ WHERE tenantId      │
                            │ WHERE clientId      │
                            └────────┬────────────┘
                                     │
                         ┌───────────▼───────────┐
                         │  Para CADA campanha:   │
                         │                        │
                         │  1. Buscar ultimos     │
                         │     14 Insight (DESC)  │
                         │                        │
                         │  2. Contar leads       │
                         │     (WHERE campaignId) │
                         │                        │
                         │  3. Se 0 insights →    │
                         │     SKIP               │
                         │                        │
                         │  4. Calcular:          │
                         │     - totalSpend       │
                         │     - totalImpressions  │
                         │     - totalClicks      │
                         │     - avgFrequency     │
                         │     - avgCtr           │
                         │     - avgCpc           │
                         │     - trend            │
                         │                        │
                         │  5. Avaliar 6 regras   │──── Regra disparou?
                         │     em sequencia       │     SIM → push insight
                         └───────────┬────────────┘     NAO → proxima regra
                                     │
                                     ▼
                        ┌────────────────────────────┐
                        │  Ordenar por confianca DESC │
                        │  Retornar array de insights │
                        └────────────────────────────┘
```

### 2.7. Onde e Exibido

- **Dashboard** → Secao "Insights da IA" — cards coloridos com borda lateral
  - PAUSE → borda vermelha, badge vermelho
  - SCALE → borda verde, badge verde
  - OPTIMIZE → borda amarela, badge amarelo
  - ALERT → borda laranja, badge laranja
- Nota na UI: "Analise automatica baseada em metricas de CTR, CPC, frequencia e CPL — sem dependencia de LLM"

---

## 3. MOTOR 2 — Briefing Estrategico com LLM (Gestor Senior)

### 3.1. Arquivos-Fonte

- `src/lib/marketing/services/strategicBriefing.ts` — logica de geracao
- `src/lib/marketing/services/llmClient.ts` — factory multi-provider
- `src/app/api/admin/campanhas/briefings/generate/route.ts` — endpoint manual
- `src/app/api/cron/campanhas/briefing/route.ts` — endpoint cron

### 3.2. Objetivo

O LLM atua como um **gestor senior de trafego pago imobiliario** que:
- Recebe **todos os dados numericos** do periodo
- Recebe **todos os alertas** do Motor 1 (rule-based)
- Produz uma **analise estrategica contextualizada** com recomendacoes acionaveis
- Entrega o resultado em formato estruturado (JSON) para renderizacao na UI e envio via WhatsApp

### 3.3. Tipos de Briefing

```
┌──────────────┬────────────────┬──────────────────────────────────────────────┐
│ Tipo         │ Periodo Base   │ Foco Estrategico                             │
├──────────────┼────────────────┼──────────────────────────────────────────────┤
│ morning      │ 7 dias         │ Resumo do dia anterior, alertas urgentes,    │
│              │                │ plano de acao para o dia que comeca           │
├──────────────┼────────────────┼──────────────────────────────────────────────┤
│ closing      │ 1 dia          │ Performance de hoje, comparacao com metas,   │
│              │                │ recomendacoes para amanha                     │
├──────────────┼────────────────┼──────────────────────────────────────────────┤
│ manual       │ 7 dias         │ Analise completa e estrategica sob demanda   │
└──────────────┴────────────────┴──────────────────────────────────────────────┘
```

### 3.4. Fluxo Completo de Geracao

```
generateStrategicBriefing(type, tenantId?, clientId?)
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  FASE 1: COLETA DE CONTEXTO — gatherBriefingContext()           │
│                                                                  │
│  Para CADA campanha do tenant:                                   │
│    ├── Buscar insights do periodo atual                          │
│    ├── Buscar insights do periodo anterior (comparacao)          │
│    ├── Contar leads do periodo atual                             │
│    ├── Contar leads do periodo anterior                          │
│    └── Calcular metricas:                                        │
│         ├── totalSpend, totalClicks, totalImpressions            │
│         ├── totalReach, totalConversions                         │
│         ├── avgCtr, avgCpc, avgCpm, avgFrequency                 │
│         ├── leads, cpl (spend/leads)                             │
│         ├── dailyBudget (do primeiro AdSet)                      │
│         ├── daysRunning                                          │
│         └── spendTrend (up/down/stable)                          │
│                                                                  │
│  Agregar totais globais:                                         │
│    ├── spend, clicks, impressions, leads totais                  │
│    ├── Mesmo para periodo anterior                               │
│    └── Calcular deltas percentuais                               │
│                                                                  │
│  Chamar generateAiInsights() → ruleInsights (Motor 1)            │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  Se 0 campanhas com dados → retorna briefing VAZIO              │
│  (performanceSummary: "Nenhuma campanha com dados no periodo")   │
└──────────────────────────────┬───────────────────────────────────┘
                               │ (tem dados)
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  FASE 2: CONSTRUCAO DO PROMPT — buildPrompt()                   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              PROMPT ENVIADO AO LLM                         │  │
│  │                                                            │  │
│  │  ROLE: "Voce e um especialista senior em trafego pago     │  │
│  │         para o mercado imobiliario brasileiro"             │  │
│  │                                                            │  │
│  │  CONTEXTO TEMPORAL:                                        │  │
│  │    morning → foco em resumo + plano do dia                 │  │
│  │    closing → foco em performance hoje + recomendacoes      │  │
│  │    manual  → analise completa e estrategica                │  │
│  │                                                            │  │
│  │  DADOS INJETADOS:                                          │  │
│  │    ├── JSON das campanhas com todas as metricas            │  │
│  │    ├── Totais do periodo (spend, clicks, imp, leads)       │  │
│  │    ├── Deltas vs periodo anterior (% variacao)             │  │
│  │    └── Alertas do Motor de Regras (rule-based)             │  │
│  │                                                            │  │
│  │  INSTRUCOES DE ANALISE (5 focos):                          │  │
│  │    1. Canibalizacao entre campanhas                        │  │
│  │    2. Realocacao de budget                                 │  │
│  │    3. Fadiga criativa e saturacao de publico               │  │
│  │    4. Otimizacao de CPL                                    │  │
│  │    5. Tendencias preocupantes ou oportunidades             │  │
│  │                                                            │  │
│  │  FORMATO DE RESPOSTA: JSON estruturado                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  FASE 3: CHAMADA AO LLM                                         │
│                                                                  │
│  getLlmClient(tenantId) → LlmClient                              │
│  llm.complete(prompt, maxTokens=2000) → texto bruto              │
│                                                                  │
│  Parsing:                                                        │
│    text.match(/\{[\s\S]*\}/) → extrai JSON do texto             │
│    JSON.parse() → objeto estruturado                             │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                   ┌───────────┴───────────┐
                   │ LLM SUCESSO?          │
                   │                       │
              SIM  │                  NAO  │
                   ▼                       ▼
┌────────────────────────┐  ┌──────────────────────────────────┐
│ Briefing Rico:         │  │ FALLBACK Rule-Based:             │
│ - urgentAlerts[]       │  │ - urgentAlerts = regras PAUSE    │
│ - performanceSummary   │  │ - performanceSummary = metricas  │
│ - campaignAnalysis[]   │  │   brutas + "LLM indisponivel"   │
│ - budgetRecommendations│  │ - campaignAnalysis = CTR-based   │
│ - actionItems[]        │  │   (CTR<1=critical, <2=warning)   │
│ - tomorrowPlan         │  │ - actionItems = descricoes das   │
│                        │  │   regras disparadas              │
└──────────┬─────────────┘  └───────────────┬──────────────────┘
           │                                │
           └────────────┬───────────────────┘
                        ▼
              ┌──────────────────────┐
              │  Persistir no banco  │
              │  StrategicBriefing   │
              │  (type, content,     │
              │   summary, tenant,   │
              │   client)            │
              └──────────────────────┘
```

### 3.5. Estrutura do JSON Gerado pelo LLM

```json
{
  "urgentAlerts": [
    "Campanha 'Lancamento Aurora' gastou R$120 sem nenhum lead — pausar imediatamente"
  ],

  "performanceSummary":
    "Nos ultimos 7 dias, o investimento total foi de R$1.450 gerando 23 leads (CPL R$63).
     CTR medio de 1.8%, com destaque para 'Residencial Boa Vista' (CTR 3.2%, 12 leads).",

  "campaignAnalysis": [
    {
      "campaignName": "Lancamento Aurora",
      "status": "critical",
      "recommendation": "Pausar e testar novos criativos. CTR 0.4% indica criativo ou publico inadequado.",
      "priority": "high"
    },
    {
      "campaignName": "Residencial Boa Vista",
      "status": "healthy",
      "recommendation": "Escalar budget de R$30/dia para R$50/dia. Performance excelente com CPL R$18.",
      "priority": "high"
    }
  ],

  "budgetRecommendations": [
    "Transferir R$20/dia do 'Lancamento Aurora' para 'Residencial Boa Vista'",
    "Total ideal do periodo: R$1.200 (reducao de 17% com melhor alocacao)"
  ],

  "actionItems": [
    "Pausar 'Lancamento Aurora' e criar 3 variantes de criativo para teste A/B",
    "Aumentar budget do 'Residencial Boa Vista' para R$50/dia",
    "Renovar criativos do 'Edificio Sol' — frequencia de 4.2x indica fadiga"
  ],

  "tomorrowPlan":
    "Focar na criacao de 3 novos criativos para substituir os fadigados.
     Monitorar CPL do 'Boa Vista' apos aumento de budget."
}
```

### 3.6. Os 5 Eixos de Analise que o LLM Avalia

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  EIXO 1: CANIBALIZACAO                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ O LLM identifica campanhas com publicos sobrepostos que competem   │    │
│  │ entre si pelos mesmos usuarios, inflando CPC e desperdicando budget │    │
│  │                                                                     │    │
│  │ Dados usados: locations, interests, ageMin/ageMax, genders         │    │
│  │ Sinal: duas campanhas com targeting similar e CPC crescente        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  EIXO 2: REALOCACAO DE BUDGET                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Analisa performance relativa entre campanhas e sugere              │    │
│  │ redistribuicao de budget de low-performers para high-performers     │    │
│  │                                                                     │    │
│  │ Dados usados: dailyBudget, CPL, CTR, leads por campanha           │    │
│  │ Logica: Campanha A (CPL R$60) vs Campanha B (CPL R$15)            │    │
│  │         → Transferir budget de A para B                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  EIXO 3: FADIGA CRIATIVA E SATURACAO                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Detecta quando criativos perderam eficacia por excesso de          │    │
│  │ exposicao ao mesmo publico                                         │    │
│  │                                                                     │    │
│  │ Dados usados: avgFrequency, spendTrend, CTR ao longo dos dias     │    │
│  │ Sinal: frequencia > 3 + CTR declinante + CPC crescente            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  EIXO 4: OTIMIZACAO DE CPL                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Foco especifico do mercado imobiliario: cada lead no WhatsApp      │    │
│  │ tem alto valor. O LLM analisa o custo por lead e sugere            │    │
│  │ otimizacoes especificas para reduzir CPL                           │    │
│  │                                                                     │    │
│  │ Dados usados: spend, leads (WhatsApp clicks), CTR, CPC            │    │
│  │ Contexto: CPL ideal para imobiliario = R$10-20                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  EIXO 5: TENDENCIAS E OPORTUNIDADES                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Identifica padroes emergentes nos dados que regras fixas           │    │
│  │ nao capturariam: sazonalidades, mudancas de comportamento,        │    │
│  │ oportunidades de novos publicos ou formatos                        │    │
│  │                                                                     │    │
│  │ Dados usados: deltas vs periodo anterior, variacao diaria,        │    │
│  │               objective da campanha, tendencia de spend            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.7. Ciclo de Vida dos Briefings

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  08:00 ──── CRON MATINAL ──────────────────────────────────────────────  │
│  │                                                                       │
│  │  Para cada tenant com campanhas ativas:                               │
│  │    1. gatherBriefingContext(periodDays=7)                             │
│  │    2. buildPrompt(type='morning')                                     │
│  │    3. LLM.complete() ou fallback                                      │
│  │    4. Persistir StrategicBriefing (type='morning')                    │
│  │    5. Formatar para WhatsApp (4096 chars max)                         │
│  │    6. Enviar via Evolution API + Slack Webhook                        │
│  │                                                                       │
│  18:00 ──── CRON FECHAMENTO ───────────────────────────────────────────  │
│  │                                                                       │
│  │  Mesmo fluxo, mas:                                                    │
│  │    - periodDays = 1 (apenas hoje)                                     │
│  │    - type = 'closing'                                                 │
│  │    - Foco em resultados do dia e plano para amanha                    │
│  │                                                                       │
│  MANUAL ──── BOTAO NO DASHBOARD ───────────────────────────────────────  │
│  │                                                                       │
│  │  POST /api/admin/campanhas/briefings/generate {type:'manual'}         │
│  │    - periodDays = 7                                                   │
│  │    - type = 'manual'                                                  │
│  │    - Apenas persiste no banco (sem envio WhatsApp/Slack)              │
│  │    - Exibido na UI do Dashboard imediatamente                         │
│  │                                                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.8. Formato WhatsApp do Briefing

```
*BRIEFING MATINAL — 25/05/2026*

*ALERTAS URGENTES*
- Campanha "Aurora" gastou R$120 sem nenhum lead — pausar imediatamente

*RESUMO*
Nos ultimos 7 dias, investimento de R$1.450 gerando 23 leads (CPL R$63)...

*CAMPANHAS*
🔴 *Lancamento Aurora*: Pausar e trocar criativo
🟢 *Residencial Boa Vista*: Escalar budget para R$50/dia
🟡 *Edificio Sol*: Renovar criativos — fadiga detectada

*BUDGET*
- Transferir R$20/dia do Aurora para Boa Vista

*ACOES*
- Pausar Aurora e criar 3 variantes para teste A/B
- Aumentar budget do Boa Vista

*AMANHA*
Focar na criacao de novos criativos...
```

Limitacao: truncado a 4096 caracteres para compatibilidade WhatsApp.

---

## 4. MOTOR 3 — Agente Autonomo (Rule-Based + LLM + Execucao)

### 4.1. Arquivos-Fonte

- `src/lib/marketing/services/agentDecisor.ts` — logica de decisao
- `src/lib/marketing/services/agentMonitor.ts` — orquestrador cron
- `src/lib/marketing/services/agentNotificador.ts` — canais de notificacao
- `src/app/api/agent/approve/[id]/route.ts` — aprovacao via link
- `src/app/api/agent/reject/[id]/route.ts` — rejeicao via link

### 4.2. Objetivo

Sistema autonomo que **monitora, decide e executa** acoes nas campanhas Meta Ads,
operando com supervisao humana minima. O LLM enriquece as decisoes, mas **nao** e
o decisor — as regras do Motor 1 sao a base.

### 4.3. Fluxo Completo do Agente

```
    CRON a cada 6h (AGENT_SYNC_SCHEDULE)
                │
                ▼
    ┌─── syncMetrics() ───────────────────────────────────────────────┐
    │                                                                  │
    │  1. Buscar campanhas com metaCampaignId (publicadas no Meta)     │
    │  2. Agrupar por tenant                                           │
    │  3. Para cada tenant:                                            │
    │     a. Buscar credenciais Meta (public.tenants → meta_token)     │
    │     b. Fallback: META_ACCESS_TOKEN do .env                       │
    │     c. Para cada campanha:                                       │
    │        - meta.getCampaignInsights(id, 30 dias)                   │
    │        - Para cada dia retornado:                                │
    │          UPSERT Insight (id = campaignId-dateStart)               │
    │          Campos: impressions, reach, clicks, spend,              │
    │                  cpc, cpm, ctr, frequency, breakdowns            │
    │                                                                  │
    └──────────────────────────────────┬───────────────────────────────┘
                                       │
                                       ▼
    ┌─── runDecisor(tenantId) ─────────────────────────────────────────┐
    │                                                                   │
    │  1. generateAiInsights(tenantId) → Motor 1                        │
    │                                                                   │
    │  2. Filtrar: confidence >= AGENT_CONFIDENCE_THRESHOLD (0.85)      │
    │                                                                   │
    │  3. Para cada insight de alta confianca:                          │
    │     ┌──────────────────────────────────────────────────────────┐  │
    │     │ a. Deduplicacao: ja existe AgentAction nas ultimas 24h? │  │
    │     │    SIM → SKIP                                           │  │
    │     │    NAO → continuar                                      │  │
    │     │                                                          │  │
    │     │ b. enrichWithClaude(insight)  ◄── PAPEL DO LLM          │  │
    │     │    - Envia ao LLM: campanha + insight + dados            │  │
    │     │    - Pede: "Enriqueca com contexto pratico, max 180ch"  │  │
    │     │    - Retorno: descricao mais acionavel e contextual     │  │
    │     │    - Fallback: mantem descricao original se LLM falhar  │  │
    │     │                                                          │  │
    │     │ c. Criar AgentAction no banco com status baseado no tipo │  │
    │     └──────────────────────────────────────────────────────────┘  │
    │                                                                   │
    │  4. Matriz de Decisao:                                            │
    │                                                                   │
    │     ┌───────────────┬───────────────────┬───────────────────────┐ │
    │     │ TIPO          │ CLASSIFICACAO     │ ACAO                  │ │
    │     ├───────────────┼───────────────────┼───────────────────────┤ │
    │     │ PAUSE         │ DEFENSIVO         │ PENDING_EXECUTION     │ │
    │     │               │                   │ → executa imediatamente│ │
    │     │               │                   │ → pausa no Meta API   │ │
    │     │               │                   │ → notifica pos-fato   │ │
    │     ├───────────────┼───────────────────┼───────────────────────┤ │
    │     │ SCALE         │ OFENSIVO          │ PENDING_APPROVAL      │ │
    │     │               │                   │ → envia links WhatsApp│ │
    │     │               │                   │ → aguarda aprovacao   │ │
    │     │               │                   │ → se aprovado: +30%   │ │
    │     │               │                   │   no dailyBudget      │ │
    │     ├───────────────┼───────────────────┼───────────────────────┤ │
    │     │ ALERT         │ INFORMATIVO       │ NOTIFIED              │ │
    │     │ OPTIMIZE      │                   │ → apenas notifica     │ │
    │     │               │                   │ → nenhuma acao auto   │ │
    │     └───────────────┴───────────────────┴───────────────────────┘ │
    │                                                                   │
    └───────────────────────────────────────────────────────────────────┘
```

### 4.4. Papel Especifico do LLM no Agente — enrichWithClaude()

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     enrichWithClaude(insight, tenantId)                  │
│                                                                          │
│  PROMPT:                                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ "Especialista em trafego pago imobiliario. Enriqueca esta         │  │
│  │  recomendacao com contexto pratico em portugues BR.               │  │
│  │  Maximo 180 caracteres."                                          │  │
│  │                                                                    │  │
│  │  Campanha: {insight.campaignName}                                 │  │
│  │  Insight: {insight.title}                                         │  │
│  │  Dados: {insight.description}                                     │  │
│  │  Confianca: {confidence}%                                         │  │
│  │                                                                    │  │
│  │  Responda APENAS JSON: {"description": "texto enriquecido"}       │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ENTRADA (rule-based):                                                   │
│    "A campanha 'Aurora' tem CTR de 0.4% nos ultimos 5 dias.             │
│     Considere pausar e trocar o criativo."                               │
│                                                                          │
│  SAIDA (LLM-enriched):                                                   │
│    "CTR 0.4% em 5 dias indica criativo esgotado. Pause, teste 3         │
│     variantes com angulos diferentes (seguranca, lazer, investimento)."  │
│                                                                          │
│  VALOR AGREGADO PELO LLM:                                                │
│    ├── Contexto imobiliario (seguranca, lazer, investimento)             │
│    ├── Acao especifica (3 variantes, angulos diferentes)                 │
│    └── Linguagem profissional para o gestor                              │
│                                                                          │
│  FALLBACK: Se LLM falhar → mantem descricao original do Motor 1         │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.5. Fluxo de Aprovacao via WhatsApp

```
     Agente detecta SCALE (campanha performando bem)
                    │
                    ▼
     ┌─────────────────────────────────────────┐
     │  Cria AgentAction                       │
     │  status = PENDING_APPROVAL              │
     └────────────────┬────────────────────────┘
                      │
                      ▼
     ┌─────────────────────────────────────────┐
     │  notifyApprovalRequired()               │
     │                                         │
     │  Envia WhatsApp + Slack:                │
     │  ┌───────────────────────────────────┐  │
     │  │ 🤖 Agente — Aprovacao Necessaria  │  │
     │  │                                   │  │
     │  │ Campanha: Residencial Boa Vista   │  │
     │  │ Acao: Bom desempenho — escalar    │  │
     │  │ Confianca: 87%                    │  │
     │  │                                   │  │
     │  │ ✅ Aprovar: /api/agent/approve/id │  │
     │  │ ❌ Rejeitar: /api/agent/reject/id │  │
     │  └───────────────────────────────────┘  │
     └────────────────┬────────────────────────┘
                      │
           ┌──────────┴──────────┐
           ▼                     ▼
     ┌───────────┐         ┌───────────┐
     │ APROVAR   │         │ REJEITAR  │
     │ (clique)  │         │ (clique)  │
     └─────┬─────┘         └─────┬─────┘
           │                     │
           ▼                     ▼
     ┌─────────────────┐  ┌──────────────┐
     │ PENDING_EXECUTION│  │ REJECTED     │
     │       │         │  │ (fim)        │
     │       ▼         │  └──────────────┘
     │ executeAction() │
     │  - AdSet budget │
     │    * 1.30 (+30%) │
     │       │         │
     │       ▼         │
     │ EXECUTED         │
     │ notifyExecuted() │
     └─────────────────┘
```

### 4.6. Ciclo de Estados da AgentAction

```
                  ┌────────────────────────┐
                  │    Insight detectado    │
                  │    (confidence >= 85%)  │
                  └───────────┬────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         DEFENSIVO       OFENSIVO        INFORMATIVO
         (PAUSE)         (SCALE)         (ALERT/OPTIMIZE)
              │               │               │
              ▼               ▼               ▼
    ┌─────────────────┐ ┌───────────────┐ ┌──────────┐
    │ PENDING_EXECUTION│ │PENDING_APPROVAL│ │ NOTIFIED │
    └────────┬────────┘ └───────┬───────┘ └──────────┘
             │                  │
             ▼           ┌──────┴──────┐
      ┌──────────┐       ▼             ▼
      │ EXECUTED │  ┌──────────┐  ┌──────────┐
      └──────────┘  │ EXECUTED │  │ REJECTED │
             OU     └──────────┘  └──────────┘
      ┌──────────┐
      │  FAILED  │ (erro na Meta API)
      └──────────┘
```

---

## 5. Infraestrutura LLM Multi-Provider

### 5.1. Arquivo-Fonte

`src/lib/marketing/services/llmClient.ts`

### 5.2. Arquitetura da Factory

```
getLlmClient(tenantId?)
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Buscar config do tenant:                                    │
│     SELECT llmProvider, llmModel, llmApiKey                     │
│     FROM campanhasmarketingdigital."Settings"                   │
│     WHERE tenant_id = $1                                        │
│                                                                 │
│  2. Fallback: ANTHROPIC_API_KEY do .env                         │
│                                                                 │
│  3. Roteamento por provider:                                    │
│                                                                 │
│     ┌────────────────────────────────────────────────────────┐  │
│     │  provider === 'anthropic'                              │  │
│     │  → @anthropic-ai/sdk (SDK nativo)                      │  │
│     │  → messages.create({ model, max_tokens, messages })    │  │
│     └────────────────────────────────────────────────────────┘  │
│                                                                 │
│     ┌────────────────────────────────────────────────────────┐  │
│     │  provider !== 'anthropic' (openai, gemini, groq, etc)  │  │
│     │  → Buscar base_url na tabela LlmModel                 │  │
│     │  → openai SDK com baseURL customizada                   │  │
│     │  → chat.completions.create({ model, max_tokens, ... }) │  │
│     └────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3. Providers e Modelos Suportados (23 modelos)

```
┌──────────────┬────────────────────────────────┬─────────────────────────────────┐
│ Provider     │ Base URL                       │ Modelos                         │
├──────────────┼────────────────────────────────┼─────────────────────────────────┤
│ anthropic    │ (SDK nativo)                   │ claude-sonnet-4-5, opus, haiku  │
│ openai       │ https://api.openai.com/v1      │ gpt-4o, gpt-4o-mini            │
│ gemini       │ (Google AI Studio)             │ gemini-2.5-flash, gemini-pro   │
│ groq         │ https://api.groq.com/openai/v1 │ llama-3.1-70b, mixtral         │
│ deepseek     │ https://api.deepseek.com       │ deepseek-chat, deepseek-coder  │
│ openrouter   │ https://openrouter.ai/api/v1   │ (meta-catalogo)                │
│ kimi         │ (Moonshot)                     │ moonshot-v1-8k                 │
│ qwen         │ (DashScope)                    │ qwen-turbo, qwen-plus          │
└──────────────┴────────────────────────────────┴─────────────────────────────────┘
```

### 5.4. Interface Unificada

```typescript
interface LlmClient {
  provider: string;     // ex: 'anthropic', 'groq'
  model: string;        // ex: 'claude-sonnet-4-5'
  complete(prompt: string, maxTokens?: number): Promise<string>;
}
```

Todos os pontos do sistema que usam LLM chamam apenas `getLlmClient(tenantId)` →
`client.complete(prompt)`. A troca de provider/modelo e **transparente**.

---

## 6. Projecoes Preditivas (Regressao Linear — sem LLM)

### 6.1. Arquivo-Fonte

`src/app/api/admin/campanhas/dashboard/predictions/route.ts`

### 6.2. Funcionamento

```
Dados historicos (ate 60 dias)
         │
         ▼
┌───────────────────────────────────────────────┐
│  Agregar por dia:                             │
│  - spend, clicks, impressions                  │
│  - CTR = (clicks/impressions) * 100           │
│  - CPC = spend / clicks                      │
│  - leads (raw query GROUP BY date)            │
│                                               │
│  Para cada metrica:                           │
│  1. Regressao linear: y = slope * x + intercept│
│  2. Calcular desvio padrao (stdDev)            │
│  3. Projetar N dias (default: 30):             │
│     - predicted = max(0, slope * x + intercept)│
│     - upperBound = predicted + 1.5 * stdDev   │
│     - lowerBound = max(0, predicted - 1.5*std)│
└───────────────────────────────────────────────┘
         │
         ▼
Metricas projetadas: spend, leads, CTR, CPC
(com bandas de confianca upper/lower)
```

**Nota:** Este motor NAO usa LLM. E puramente estatistico.
Oportunidade futura: o LLM poderia interpretar as projecoes e gerar
recomendacoes contextuais ("se a tendencia de CPC continuar, atingiremos
R$X em 2 semanas — considere ajustar publico agora").

---

## 7. Mapa de Todos os Pontos de Uso do LLM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ONDE O LLM E CHAMADO NO SISTEMA                          │
│                                                                             │
│  PONTO 1: Briefing Estrategico                                              │
│  ├── Arquivo: strategicBriefing.ts → generateStrategicBriefing()            │
│  ├── Trigger: manual (botao) | cron 08h | cron 18h                         │
│  ├── Prompt: ~2000 tokens (contexto completo + instrucoes)                  │
│  ├── maxTokens resposta: 2000                                               │
│  ├── Formato: JSON estruturado (6 campos)                                   │
│  └── Fallback: briefing rule-based com metricas brutas                      │
│                                                                             │
│  PONTO 2: Enriquecimento de Acoes do Agente                                 │
│  ├── Arquivo: agentDecisor.ts → enrichWithClaude()                          │
│  ├── Trigger: automatico (apos regra disparar com confianca >= 0.85)        │
│  ├── Prompt: ~200 tokens (campanha + insight + confianca)                   │
│  ├── maxTokens resposta: 200                                                │
│  ├── Formato: JSON simples {"description": "..."}                           │
│  └── Fallback: mantem descricao original da regra                           │
│                                                                             │
│  PONTO 3: Teste de Conexao                                                  │
│  ├── Arquivo: settings/llm/test/route.ts                                    │
│  ├── Trigger: botao "Testar Conexao" na pagina de configuracoes             │
│  ├── Prompt: "Responda apenas OK para confirmar conexao."                   │
│  ├── maxTokens resposta: 20                                                 │
│  └── Retorno: { success, provider, model, response }                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Relacionamento entre os 3 Motores

```
                    ┌──────────────────────────────┐
                    │     DADOS DO META ADS         │
                    │  (Insight, Lead, Campaign)    │
                    └──────────────┬───────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
    │   MOTOR 1       │  │   MOTOR 2       │  │  PREDICOES      │
    │   Rule-Based    │  │   LLM Briefing  │  │  Regressao      │
    │                 │  │                 │  │  Linear          │
    │  aiInsights.ts  │  │ strategic       │  │  predictions     │
    │                 │  │ Briefing.ts     │  │  /route.ts       │
    └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
             │                    │                    │
             │ ALIMENTA           │ CONSOME            │
             ├────────────────────┘                    │
             │                                         │
             │  ┌────────────────────────────────┐     │
             └──▶   MOTOR 3 — AGENTE AUTONOMO   │     │
                │   agentDecisor.ts              │     │
                │                                │     │
                │   1. Consome regras (Motor 1)  │     │
                │   2. Enriquece com LLM         │     │
                │   3. Decide e executa          │     │
                │   4. Notifica via WhatsApp     │     │
                └────────────────────────────────┘     │
                                                       │
    ┌──────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│                    DASHBOARD UI                                   │
│                                                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────┐ │
│  │ KPIs +       │ │ Graficos     │ │ Insights     │ │ Briefing│ │
│  │ Deltas       │ │ Multi-Metrica│ │ Rule-Based   │ │ LLM     │ │
│  │              │ │ + Funil      │ │ (Motor 1)    │ │ (Motor 2│ │
│  │              │ │ + Predicoes  │ │              │ │         │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9. Glossario de Metricas e Limiares

```
┌────────────────┬──────────────────────────────────────────────────────────┐
│ Metrica        │ Definicao no sistema                                    │
├────────────────┼──────────────────────────────────────────────────────────┤
│ CTR            │ (clicks / impressions) * 100 — armazenado como %        │
│                │ < 1% = critico | 1-2% = alerta | > 2% = saudavel       │
├────────────────┼──────────────────────────────────────────────────────────┤
│ CPC            │ spend / clicks — em Reais (R$)                          │
│                │ Tendencia de alta >= 15% = alerta                       │
├────────────────┼──────────────────────────────────────────────────────────┤
│ CPM            │ (spend / impressions) * 1000 — custo por mil impressoes │
├────────────────┼──────────────────────────────────────────────────────────┤
│ CPL            │ spend / leads — custo por lead WhatsApp                 │
│                │ > R$20 = otimizar | Ideal imobiliario: R$10-20         │
├────────────────┼──────────────────────────────────────────────────────────┤
│ Frequency      │ Media de vezes que cada pessoa viu o anuncio            │
│                │ > 3.0 = fadiga criativa                                 │
├────────────────┼──────────────────────────────────────────────────────────┤
│ Spend          │ Gasto em Reais (R$)                                     │
│                │ > R$50 sem leads = gasto sem resultado                  │
├────────────────┼──────────────────────────────────────────────────────────┤
│ Leads          │ Cliques no WhatsApp rastreados via UTM                  │
│                │ > 5 com CTR > 2% = sinal de SCALE                      │
├────────────────┼──────────────────────────────────────────────────────────┤
│ Daily Budget   │ Orcamento diario em centavos (int) → /100 para Reais   │
│                │ SCALE aplica multiplicador de 1.3x (+30%)               │
├────────────────┼──────────────────────────────────────────────────────────┤
│ Confidence     │ Score 0.0–1.0 calculado pelas regras                    │
│                │ >= 0.85 (AGENT_CONFIDENCE_THRESHOLD) = acao autonoma    │
├────────────────┼──────────────────────────────────────────────────────────┤
│ Trend          │ Comparacao CPC metade recente vs. metade antiga         │
│                │ > 1.15x = 'up' | < 0.85x = 'down' | else = 'stable'   │
└────────────────┴──────────────────────────────────────────────────────────┘
```

---

## 10. Tabelas do Banco Envolvidas na Inteligencia

```
┌──────────────────────┐     ┌──────────────────────┐
│     Campaign         │     │      Insight          │
│ ─────────────────    │     │ ─────────────────     │
│ id               PK  │◄────│ campaignId       FK   │
│ name                 │     │ date                  │
│ objective            │     │ impressions           │
│ status               │     │ reach                 │
│ tenantId             │     │ clicks                │
│ clientId             │     │ spend                 │
│                      │     │ cpc, cpm, ctr         │
│ adSets[] ──────┐     │     │ conversions           │
└────────────────┤─────┘     │ frequency             │
                 │           │ engagement             │
                 ▼           │ breakdowns (JSON)      │
┌──────────────────────┐     │ tenantId               │
│       AdSet          │     └──────────────────────┘
│ ─────────────────    │
│ id               PK  │     ┌──────────────────────┐
│ campaignId       FK  │     │       Lead            │
│ dailyBudget (cents)  │     │ ─────────────────     │
│ ageMin, ageMax       │     │ id               PK   │
│ genders[]            │     │ campaignId       FK   │
│ locations (JSON)     │     │ adId             FK   │
│ interests (JSON)     │     │ phoneClicked          │
│ scheduleDays[]       │     │ utmSource/Campaign    │
│ ads[] ───────┐       │     │ utmContent            │
└──────────────┤───────┘     │ clickedAt             │
               │             │ tenantId, clientId    │
               ▼             └──────────────────────┘
┌──────────────────────┐
│        Ad            │     ┌──────────────────────┐
│ ─────────────────    │     │   AgentAction         │
│ id               PK  │     │ ─────────────────     │
│ adSetId          FK  │     │ id               PK   │
│ creativeType         │     │ campaignId       FK   │
│ images[]             │     │ campaignName          │
│ body, headline       │     │ type (PAUSE/SCALE/..) │
│ ctaType              │     │ title, description    │
│ trackingId           │     │ confidence (0.0-1.0)  │
└──────────────────────┘     │ status               │
                             │   PENDING_APPROVAL    │
┌──────────────────────┐     │   PENDING_EXECUTION   │
│ StrategicBriefing    │     │   EXECUTED            │
│ ─────────────────    │     │   REJECTED            │
│ id               PK  │     │   FAILED              │
│ tenantId             │     │   NOTIFIED            │
│ clientId             │     │ executedAt            │
│ type (morning/       │     │ tenantId              │
│       closing/manual)│     └──────────────────────┘
│ content (JSON)       │
│ summary              │     ┌──────────────────────┐
│ createdAt            │     │     AiInsight         │
└──────────────────────┘     │ ─────────────────     │
                             │ id               PK   │
┌──────────────────────┐     │ campaignId       FK   │
│      Settings        │     │ type                  │
│ ─────────────────    │     │ title                 │
│ tenantId     UNIQUE  │     │ description           │
│ llmProvider          │     │ confidence            │
│ llmModel             │     │ tenantId              │
│ llmApiKey            │     └──────────────────────┘
│ creativesPath        │
│ publicDomain         │     ┌──────────────────────┐
└──────────────────────┘     │     LlmModel          │
                             │ ─────────────────     │
                             │ provider              │
                             │ modelId               │
                             │ baseUrl               │
                             │ qualityScore (1-5)    │
                             │ isFree, isRecommended │
                             │ contextWindow         │
                             └──────────────────────┘
```

---

## 11. Resumo Executivo — O que o LLM Provê

| Funcionalidade | Motor | Usa LLM? | Fallback | Trigger |
|---|---|---|---|---|
| Deteccao de CTR baixo | Rule-Based | Nao | N/A | Tempo real |
| Deteccao de fadiga criativa | Rule-Based | Nao | N/A | Tempo real |
| Deteccao de CPC em alta | Rule-Based | Nao | N/A | Tempo real |
| Deteccao de gasto sem resultado | Rule-Based | Nao | N/A | Tempo real |
| Deteccao de campanha performando | Rule-Based | Nao | N/A | Tempo real |
| Deteccao de CPL alto | Rule-Based | Nao | N/A | Tempo real |
| **Briefing matinal com analise** | **LLM** | **Sim** | Rule-based | Cron 08h |
| **Briefing de fechamento** | **LLM** | **Sim** | Rule-based | Cron 18h |
| **Briefing manual sob demanda** | **LLM** | **Sim** | Rule-based | Botao UI |
| **Analise de canibalizacao** | **LLM** | **Sim** | Nao existe | Via briefing |
| **Sugestao de realocacao budget** | **LLM** | **Sim** | Nao existe | Via briefing |
| **Plano de acao diario** | **LLM** | **Sim** | Nao existe | Via briefing |
| **Enriquecimento de acoes agente** | **LLM** | **Sim** | Descricao crua | Cron 6h |
| Projecoes de spend/leads/CTR/CPC | Regressao Linear | Nao | N/A | Tempo real |
| Pausa automatica de campanha | Agente (Rule) | Regras | N/A | Cron 6h |
| Escalar budget (+30%) | Agente (Rule) | Regras | N/A | Aprovacao |
| Notificacao WhatsApp/Slack | Notificador | Nao | N/A | Pos-acao |
| Teste de conexao LLM | Settings | Sim | N/A | Botao UI |

---

*Documento gerado em 25/05/2026 — reflete o estado atual do codigo-fonte.*
