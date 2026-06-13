# 🎯 Gabarito de Teste — Dashboard de Campanhas

> **Gerado em:** 2026-06-12 · Dataset `seed_ms_` (tenant Marketing Digital)
> **Objetivo:** confrontar os números abaixo com o que aparece em `/admin/campanhas/dashboard`.

---

## ⚠️ Como usar este gabarito (leia antes)

1. **Período importa.** O dashboard abre em **"Hoje"** (1 dia) — sensível à hora atual, **não** confira por aqui.
   Use os botões **`7d`** e **`30d`**; este gabarito é calculado para essas duas janelas (por data, determinístico).
2. **A janela desliza.** Os números valem para teste feito em **2026-06-12**. Em outro dia, a janela de 7/30 dias
   muda e os totais mudam junto (o seed usa curvas diárias). Regenere rodando as queries do final se for testar depois.
3. **Fórmulas usadas** (idênticas aos endpoints):
   - `CTR = Σcliques / Σimpressões × 100`
   - `CPC = Σgasto / Σcliques` · `CPM = Σgasto / Σimpressões × 1000`
   - `CPL = Σgasto / total de leads` · `Budget/dia = Σ AdSet.dailyBudget / 100`
   - `Hook Rate = Σ video_views_3s / Σimpressões × 100`
4. **Tolerância:** arredondamentos podem gerar diferença de ±0,01 no último dígito. Diferença grande = bug a investigar.

---

## 🧭 Regra de isolamento (o teste mais importante)

Ao trocar de segmento, **nenhum** número de outro segmento pode aparecer. Confira a soma de controle:

| Janela | Σ Gasto TODOS os segmentos | Σ Leads TODOS |
|---|---:|---:|
| 30 dias | R$ 123.959,79 | 3.779 |
| 7 dias  | R$ 32.454,71 | 971 |

Se você somar o "Gasto total" exibido em cada segmento isoladamente, **tem que bater** com a linha acima.

---

# 1️⃣ MODO "TODOS OS CLIENTES" (por segmento)

Selecione o segmento → ClientSelector em **"Todos os Clientes"**. O dashboard mostra o **ranking de clientes**
(rank 1 = menor CPL) + **benchmark do segmento** (mediana real do período).

### 🏠 Imobiliário — janela 30d  · benchmark: CPL ideal 35 / crítico 80
**Benchmark exibido:** CPL mediano **28,54** · CTR mediano **2,16%** · Gasto total **R$ 44.307,83** · Leads **1.436**

| Rank | Cliente | Gasto | Leads | CPL | CTR | Status |
|---|---|---:|---:|---:|---:|:---:|
| 1 | Alexandre Severo | R$ 12.827,09 | 453 | **28,32** | 2,16% | 🟢 ok |
| 2 | Minha Empresa | R$ 14.242,31 | 499 | **28,54** | 2,54% | 🟢 ok |
| 3 | Imobiliária Premium | R$ 17.238,43 | 484 | **35,62** | 1,46% | 🟢 ok |

### 🩺 Saúde Digital — janela 30d · benchmark: CPL ideal 25 / crítico 60
**Benchmark exibido:** CPL mediano **22,77** · CTR mediano **2,04%** · Gasto total **R$ 24.025,27** · Leads **1.076**

| Rank | Cliente | Gasto | Leads | CPL | CTR | Status |
|---|---|---:|---:|---:|---:|:---:|
| 1 | Gisele Cesse | R$ 10.878,27 | 592 | **18,38** | 2,65% | 🟢 ok |
| 2 | Clínica OdontoVida | R$ 13.147,00 | 484 | **27,16** | 1,43% | 🟢 ok |

### 🚗 Venda de Carros — janela 30d · benchmark: CPL ideal 45 / crítico 100
**Benchmark exibido:** CPL mediano **49,82** · CTR mediano **1,71%** · Gasto total **R$ 39.493,70** · Leads **814**

| Rank | Cliente | Gasto | Leads | CPL | CTR | Status |
|---|---|---:|---:|---:|---:|:---:|
| 1 | AutoMax Veículos | R$ 20.883,29 | 485 | **43,06** | 1,97% | 🟢 ok |
| 2 | RodaBoa Concessionária | R$ 18.610,41 | 329 | **56,57** | 1,44% | 🟡 warn |

### 🛍️ Geral — janela 30d · benchmark: CPL ideal 30 / crítico 80
**Benchmark exibido:** CPL mediano **35,61** · CTR mediano **1,48%** · Gasto total **R$ 16.132,99** · Leads **453**

| Rank | Cliente | Gasto | Leads | CPL | CTR | Status |
|---|---|---:|---:|---:|---:|:---:|
| 1 | Loja Mix Geral | R$ 16.132,99 | 453 | **35,61** | 1,48% | 🟡 warn |

> **Status:** 🟢 ok = CPL ≤ ideal×1,15 · 🟡 warn = entre ideal×1,15 e crítico · 🔴 critical = > crítico.
> Nenhum cliente fica 🔴 no agregado (campanhas `pause` sem leads são diluídas pelas demais do cliente).

---

# 2️⃣ MODO CLIENTE / "MINHA EMPRESA" — KPI Cards (modo full)

Selecione o segmento → escolha **um cliente** (ou "Minha Empresa"). Os 11–12 cards no topo devem bater:

### Janela 30 dias

| Cliente | Gasto | Impressões | Alcance | Cliques | CTR | CPC | CPM | Conv. | Leads | CPL | Budget/dia | Hook Rate |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Alexandre Severo** | 12.827,09 | 522.695 | 365.894 | 11.276 | 2,16% | 1,14 | 24,54 | 269 | 453 | 28,32 | 270,00 | 5,60% |
| **Imobiliária Premium** | 17.238,43 | 845.575 | 591.910 | 12.355 | 1,46% | 1,40 | 20,39 | 287 | 484 | 35,62 | 390,00 | 3,26% |
| **Minha Empresa** (own) | 14.242,31 | 507.435 | 355.212 | 12.898 | 2,54% | 1,10 | 28,07 | 301 | 499 | 28,54 | 250,00 | 5,10% |
| **Gisele Cesse** | 10.878,27 | 429.935 | 300.962 | 11.401 | 2,65% | 0,95 | 25,30 | 357 | 592 | 18,38 | 210,00 | 5,22% |
| **Clínica OdontoVida** | 13.147,00 | 712.275 | 498.600 | 10.200 | 1,43% | 1,29 | 18,46 | 287 | 484 | 27,16 | 305,00 | 3,06% |
| **AutoMax Veículos** | 20.883,29 | 779.460 | 545.637 | 15.358 | 1,97% | 1,36 | 26,79 | 291 | 485 | 43,06 | 450,00 | 3,76% |
| **RodaBoa Concessionária** | 18.610,41 | 833.175 | 583.230 | 11.994 | 1,44% | 1,55 | 22,34 | 197 | 329 | 56,57 | 440,00 | 3,43% |
| **Loja Mix Geral** | 16.132,99 | 792.875 | 555.020 | 11.760 | 1,48% | 1,37 | 20,35 | 269 | 453 | 35,61 | 340,00 | 3,26% |

### Janela 7 dias (KPIs principais)

| Cliente | Gasto | Impressões | Cliques | CTR | CPC | Conv. | Leads | CPL |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Alexandre Severo** | 3.331,95 | 135.420 | 2.971 | 2,19% | 1,12 | 71 | 115 | 28,97 |
| **Imobiliária Premium** | 4.502,12 | 220.700 | 3.255 | 1,47% | 1,38 | 75 | 123 | 36,60 |
| **Minha Empresa** (own) | 3.704,15 | 137.060 | 3.468 | 2,53% | 1,07 | 80 | 132 | 28,06 |
| **Gisele Cesse** | 2.845,74 | 117.060 | 3.095 | 2,64% | 0,92 | 94 | 156 | 18,24 |
| **Clínica OdontoVida** | 3.487,25 | 186.300 | 2.734 | 1,47% | 1,28 | 75 | 123 | 28,35 |
| **AutoMax Veículos** | 5.407,75 | 204.960 | 4.028 | 1,97% | 1,34 | 73 | 124 | 43,61 |
| **RodaBoa Concessionária** | 4.914,04 | 217.500 | 3.187 | 1,47% | 1,54 | 48 | 83 | 59,21 |
| **Loja Mix Geral** | 4.261,71 | 207.100 | 3.131 | 1,51% | 1,36 | 71 | 115 | 37,06 |

> **Hook Rate** aparece em vermelho (< 8%) — esperado: só ~metade das campanhas tem vídeo, diluindo a taxa global.

---

# 3️⃣ Tabela de Campanhas + Insights da IA esperados

Selecione **um cliente** → role até a tabela "Campanhas" e a seção "Insights da IA".

| Cliente | Campanha | Status | Budget/dia | Insight de IA esperado |
|---|---|:---:|---:|:---:|
| Alexandre | Localização Premium | ACTIVE | 150,00 | 🟢 **SCALE** |
| Alexandre | Últimas Unidades | ACTIVE | 120,00 | 🟠 **ALERT** (freq > 3) |
| Premium | Financiamento Facilitado | ACTIVE | 160,00 | 🟢 **SCALE** |
| Premium | Valor da Parcela | **PAUSED** | 100,00 | 🔴 **PAUSE** (CTR < 1%, 0 leads) |
| Premium | Diferencial Construtora | ACTIVE | 130,00 | 🟠 **ALERT** |
| OdontoVida | Equipe Especializada | ACTIVE | 110,00 | 🟢 **SCALE** |
| OdontoVida | Tecnologia Moderna | ACTIVE | 95,00 | 🔴 **PAUSE** |
| OdontoVida | Custo Acessível | ACTIVE | 100,00 | 🟠 **ALERT** |
| AutoMax | Preço Imbatível | ACTIVE | 180,00 | 🟢 **SCALE** |
| AutoMax | Consumo Eficiente | ACTIVE | 120,00 | 🟡 **OPTIMIZE** (CPL alto) |
| AutoMax | Zero Entrada | ACTIVE | 150,00 | 🟠 **ALERT** |
| RodaBoa | Tecnologia Embarcada | **PAUSED** | 130,00 | 🔴 **PAUSE** |
| Loja Mix | Prova Social | ACTIVE | 100,00 | 🔴 **PAUSE** |

> Os insights da IA são **rule-based** e usam o benchmark de **cada segmento** — a mesma campanha em segmentos
> diferentes pode gerar insight diferente. É exatamente o que a separação por segmento testa.

---

# 4️⃣ Checklist de Verificação

- [ ] **Isolamento:** trocar Imobiliário → Saúde → Carros → Geral; nenhum número "vaza" entre segmentos.
- [ ] **Soma de controle:** Σ gasto dos 4 segmentos (30d) = R$ 123.959,79.
- [ ] **Ranking:** no modo "Todos os Clientes", rank 1 sempre = menor CPL do segmento.
- [ ] **Benchmark = mediana:** o CPL mediano exibido bate com a tabela do bloco 1.
- [ ] **KPI cards** (cliente individual) batem com o bloco 2 (testar 7d e 30d).
- [ ] **Status colorido** (🟢🟡🔴) coerente com o CPL vs benchmark do segmento.
- [ ] **Tabela de campanhas:** Premium "Valor da Parcela" e RodaBoa "Tecnologia" aparecem como **PAUSED**.
- [ ] **Radar de Demanda** renderiza por segmento (ângulos endógenos = `declared_angle` das campanhas).
- [ ] **Briefing / Insights da IA** aparecem separados por segmento no modo agregado.

---

# 📐 Queries de regeneração (se testar em outra data)

Para recalcular o gabarito com a janela deslizada, rode (troque `30` por `7` conforme o período):

```sql
-- KPIs por cliente (modo full) — janela de N dias
WITH camp AS (
  SELECT c.id, COALESCE(cl.nome,'Minha Empresa') cliente, s.name seg
  FROM campanhasmarketingdigital."Campaign" c
  LEFT JOIN public.clientes cl ON cl.uuid=c.client_id
  LEFT JOIN public.tenants t ON t.id=c.tenant_id
  LEFT JOIN public.system_segments s ON s.id=COALESCE(cl.segment_id,t.segment_id)
  WHERE c."metaCampaignId" LIKE 'seed_ms_%'),
ins AS (SELECT "campaignId", SUM(impressions) impr, SUM(reach) reach, SUM(clicks) clk,
        SUM(spend) spend, SUM(conversions) conv
        FROM campanhasmarketingdigital."Insight" WHERE date >= CURRENT_DATE - 30 GROUP BY "campaignId"),
lds AS (SELECT "campaignId", COUNT(*) leads FROM campanhasmarketingdigital."Lead"
        WHERE "clickedAt" >= CURRENT_DATE - 30 GROUP BY "campaignId")
SELECT camp.seg, camp.cliente,
  ROUND(SUM(ins.spend)::numeric,2) gasto, SUM(ins.impr) impressoes, SUM(ins.reach) alcance,
  SUM(ins.clk) cliques, SUM(ins.conv) conversoes,
  ROUND((SUM(ins.clk)::numeric/NULLIF(SUM(ins.impr),0)*100),2) ctr,
  ROUND((SUM(ins.spend)::numeric/NULLIF(SUM(ins.clk),0)),2) cpc,
  ROUND((SUM(ins.spend)::numeric/NULLIF(SUM(ins.impr),0)*1000),2) cpm,
  SUM(COALESCE(lds.leads,0)) leads,
  ROUND((SUM(ins.spend)::numeric/NULLIF(SUM(lds.leads),0)),2) cpl
FROM camp LEFT JOIN ins ON ins."campaignId"=camp.id LEFT JOIN lds ON lds."campaignId"=camp.id
GROUP BY camp.seg, camp.cliente ORDER BY camp.seg, cpl NULLS LAST;
```

O benchmark de cada segmento (modo "Todos os Clientes") é a **mediana** dos CPLs/CTRs dos clientes daquele segmento.
