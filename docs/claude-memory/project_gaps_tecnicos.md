---
name: project-gaps-tecnicos
description: "Gaps técnicos do dashboard de campanhas — separação clara entre o que funciona, o que está ausente e o que é risco no modo \"Todas\""
metadata: 
  node_type: memory
  type: project
  originSessionId: d21342fc-66d5-476a-a1c4-1ccdb881c8e1
---

# Gaps Técnicos — Dashboard /admin/campanhas/dashboard (2026-06-12)

## ATENÇÃO: Dois projetos distintos

- **`C:\NetImobiliária\Trafegopago\`** — app standalone Express+Vite (porta 3001/5173). Dashboard LEGADO em `/dashboard`
- **`C:\NetImobiliária\net-imobiliaria\`** — app principal Next.js (porta 3000). Dashboard REAL em `/admin/campanhas/dashboard`

Toda análise de dashboard é sobre o app **net-imobiliaria**.

---

## O que já funciona CORRETAMENTE no net-imobiliaria

| Feature | Arquivo | Status |
|---|---|---|
| `ClientSelector` com default `'own'` | `ClientSelector.tsx` | ✅ Nunca restaura do sessionStorage |
| `clientId='own'` → filter `clientId = null` | `dashboard/full/route.ts` L40-42 | ✅ Isola campanhas sem cliente |
| `clientId=uuid` → filter por cliente | `dashboard/full/route.ts` L43-44 | ✅ Segmento único garantido |
| AI Insights por segmento com benchmarks próprios | `aiInsights.ts` | ✅ `mapCampaignSegments` + `benchmarksBySegment` |
| AI Insights respeitam `clientId` | `aiInsights.ts` L251-254 | ✅ `clientId='own'` → `clientId=null` |
| Briefings com `segmentName` | `dashboard/page.tsx` L695-704 | ✅ Exibe segmento no card |
| TrackingHealth breakdown por cliente no modo "Todas" | `page.tsx` L626-651 | ✅ |

---

## Gaps Reais — focados no modo `clientFilter = 'all'`

### Gap 1 — KPI Cards somam métricas de segmentos incompatíveis ⚠️
Quando `clientFilter === 'all'`, os 11 cards (Gasto, CTR, CPL, etc.) somam campanhas de
Saúde Digital + Imobiliário + sem cliente. Um CPL de R$15 e R$120 vira R$67 — número inútil.

**Localização:** `dashboard/page.tsx` L401-416 — KPI Grid não tem separação por segmento.
**O que falta:** No modo "Todas", os KPIs deveriam ou (a) mostrar por segmento, ou (b) ter aviso de que os totais são uma mistura.

### Gap 2 — Tabela de campanhas sem coluna de cliente/segmento ⚠️
No modo "Todas", a tabela mostra Nome, Status, Ciclo, Objetivo, Budget — mas não indica o cliente ou segmento de cada campanha.

**Localização:** `dashboard/page.tsx` L799-858 — colunas da tabela.
**O que falta:** Coluna "Cliente" ou badge de segmento na tabela.

### Gap 3 — Gráficos de performance sem breakdown no modo "Todas" ⚠️
Performance Multi-Métrica, CPL Timeline e Funil Clássico agregam tudo sem separação.

**Localização:** `dashboard/page.tsx` L437-514 — seção Retrovisor.

---

## Gaps no app LEGADO (Trafegopago standalone)

Estes afetam o app Express antigo, NÃO o dashboard principal:

1. **`server/prisma/schema.prisma`** — `client_id` não mapeado no model Campaign
2. **`server/src/services/aiInsights.ts`** — busca campanhas sem `tenantId`
3. **`server/src/services/agentMonitor.ts`** — `syncMetrics()` sem filtro de tenant
4. **`server/src/services/strategicBriefing.ts`** — `tenantId` opcional nos crons
5. **`server/src/authDb.ts`** — não retorna `segment_id` do tenant

---

## Prioridade de Correção para o Dashboard Principal

1. **Tabela de campanhas** — adicionar coluna "Cliente" (badge com segmento) no modo "Todas"
2. **KPI Cards no modo "Todas"** — adicionar aviso ou breakdown por segmento
3. **Gráficos** — separar série por segmento ou adicionar legenda de contexto

**Why:** Identificado em análise de 2026-06-12. O ClientSelector foi bem implementado, mas o modo "Todas" pode enganar ao mostrar KPIs blended.

**How to apply:** Qualquer feature que toque a visualização de campanhas no modo `all` deve considerar a apresentação por segmento, nunca apenas o total agregado.
