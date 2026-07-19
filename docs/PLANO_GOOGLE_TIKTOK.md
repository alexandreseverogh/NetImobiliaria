# PLANO — Google Ads + TikTok (Recorte: Gera Decisão)

> **Status:** 2026-07-19 — Planejamento documentado, pronto para implementação em fase paralela
> **Escopo:** Extensão multi-rede do sistema de campanhas de marketing digital
> **Coordenação:** Feature `ag-cockpit-camadas` (outro agente) já ~40% iniciada em Google Ads
> Ver `docs/AI_SYNC.md` seção "Frentes de IA em andamento"

---

## PARTE 0 — Princípios Inegociáveis

| Princípio | Regra |
|-----------|-------|
| **Portão do KPI** | Nenhum dado entra em tabela ou tela sem uma decisão amarrada (regra de agente ou decisão de negócio). Métrica de observação = descartada |
| **Multi-segmento por config** | Zero código por vertical. Toda diferença de segmento vive em `network_defaults` (JSONB) e nos benchmarks/ângulos que já existem por segmento |
| **Coordenação** | A Frente Google já está ~40% iniciada pelo outro agente (branch `feature/ag-cockpit-camadas`). Este plano audita + completa + tira do mock. **Nunca duplicar** — registrado em `docs/AI_SYNC.md` |
| **Fora de escopo** | ❌ SEO, Search Console, PageSpeed, Google Maps/GBP, SerpAPI, NAP · ❌ Quality Score/Auction/Device/Daypart como cards passivos · ❌ Hashtag/sound metrics do TikTok |
| **Reuso máximo** | Só se constrói o que a arquitetura ainda não faz. Agentes, dashboard consolidado, desperdício, briefing, fila de aprovação reaproveitados intactos |

---

## FASE 1 — GOOGLE ADS

### A1. Dependências Externas (Solicitar HOJE — Caminho Crítico)

| Dependência | Prazo Real | Bloqueia | Status |
|-------------|-----------|----------|--------|
| **Developer Token** (Google Ads API, nível Basic) | 5–15 dias úteis de aprovação | Tudo. Sem ele, nem teste | 🔴 **Crítico — solicitar agora** |
| **OAuth2 client** (client_id/secret/refresh_token) | 1 dia | Autenticação por tenant | ⏳ Pendente |
| **Conversion Action** em conta Google Ads | 1 dia | Otimização por lead | ⏳ Pendente |
| **customer_id por cliente** | por cliente | Multi-cliente | ⏳ Pendente |

**Ação imediata:** Solicitar developer token Google Ads API (é o único item com prazo externo real).

---

### A2. Modelo de Dados

#### A2.1 — Estender `campanhasmarketingdigital."Insight"`

Adicionar 4 colunas (grão: campanha-dia):

| Coluna | Tipo | KPI | Decisão |
|--------|------|-----|---------|
| `search_impression_share` | FLOAT | IS (contexto) | — |
| `search_budget_lost_is` | FLOAT | IS Lost (Budget) | `SCALE` — aumentar verba onde lead é barato |
| `search_rank_lost_is` | FLOAT | IS Lost (Rank) | Fraca — opcional |
| `conversions_value` | FLOAT | ROAS | `SCALE`/`KILL` — escalar ou matar campanha |

**SQL da migração:**
```sql
ALTER TABLE campanhasmarketingdigital."Insight" ADD COLUMN IF NOT EXISTS
  search_impression_share FLOAT DEFAULT 0,
  search_budget_lost_is FLOAT DEFAULT 0,
  search_rank_lost_is FLOAT DEFAULT 0,
  conversions_value FLOAT DEFAULT 0;
```

#### A2.2 — Nova Tabela: `GoogleSearchTerm`

Grão: termo de busca — NÃO cabe em `Insight` (grão diferente).

```sql
CREATE TABLE campanhasmarketingdigital."GoogleSearchTerm" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  campaign_id TEXT NOT NULL,
  ad_network VARCHAR(20) DEFAULT 'google',
  
  search_term VARCHAR(255) NOT NULL,
  match_type VARCHAR(20) NOT NULL,  -- BROAD, PHRASE, EXACT
  
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cost FLOAT DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  
  status VARCHAR(20) DEFAULT 'none',  -- 'none' | 'negated' | 'added_as_keyword'
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(tenant_id, campaign_id, search_term, date)
);
CREATE INDEX idx_google_search_term_campaign_date ON campanhasmarketingdigital."GoogleSearchTerm" (campaign_id, date);
CREATE INDEX idx_google_search_term_status ON campanhasmarketingdigital."GoogleSearchTerm" (status) WHERE status != 'none';
```

Sustenta: **negativação automática** (agente defensivo de maior ROI).

#### A2.3 — Nova Tabela: `GoogleNegativeKeyword`

Memória do que já foi negativado (evita duplicação pelo agente).

```sql
CREATE TABLE campanhasmarketingdigital."GoogleNegativeKeyword" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  campaign_id TEXT NOT NULL,
  
  term VARCHAR(255) NOT NULL,
  match_type VARCHAR(20) NOT NULL,
  added_by VARCHAR(20) NOT NULL,  -- 'agent' | 'human'
  added_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(tenant_id, campaign_id, term)
);
```

---

### A3. Completar o GoogleAdsAdapter (Tirar do Mock)

#### Método: `createCampaign`
**Status:** 🔴 Bloqueador crítico

- Criar Asset Group + linkar assets (headlines, descriptions, imagens, logos) com `field_type` correto
- Honrar `biddingStrategy` e `conversionGoal` do input (hoje ignorados)
- Vincular `audienceSignals`
- **Sem Asset Group:** a campanha não serve anúncio

#### Método: `uploadCreative`
**Status:** ⏳ Parcial

- Substituir hash mock por upload real de asset via `customer.assets.create`
- Retornar `resource_name` da Google Ads API

#### Método: `fetchInsights`
**Status:** ⏳ Parcial

- Parar de falsear reach/frequency
- Adicionar 4 colunas novas (A2.1): `conversions_value`, `search_impression_share`, `search_budget_lost_is`, `search_rank_lost_is`

#### Método: `addNegativeKeyword` (NOVO — Google-only)
**Status:** 🔴 Não existe ainda

```typescript
async addNegativeKeyword(
  campaignId: string,
  term: string,
  matchType: 'BROAD' | 'PHRASE' | 'EXACT'
): Promise<void>
```

Chamado pelo agente de negativação (A6).

#### Métodos: `validateCredentials`, `updateCampaignStatus`
**Status:** ✅ Já reais — não tocar

#### Método: `searchTargeting`
**Status:** ✅ Deixar como está (baixa prioridade)

---

### A4. Coleta de Métricas

| Nível | Como | Integração |
|-------|------|-----------|
| **Campanha-dia** (IS, ROAS, conversions_value) | Já flui por `agentMonitor` → `fetchInsights` → `Insight.upsert` | Apenas estender para os 4 campos novos (A2.1) |
| **Termo-dia** (Search Terms) | Coletor separado `collectGoogleSearchTerms()` no `agentMonitor` | Disparado só quando `networkCode === 'google'`, grava em `GoogleSearchTerm` |

---

### A5. Configuração por Segmento (Curadoria Multi-Vertical)

Preencher `system_segments.network_defaults.google` — uma linha JSONB por segmento:

```json
{
  "google": {
    "campaign_types": ["SEARCH", "PERFORMANCE_MAX"],
    "bidding_strategy": "MAXIMIZE_CONVERSIONS",
    "headline_max_chars": 30,
    "description_max_chars": 90,
    "negative_seed_terms": ["grátis", "como ser", "salário"],
    "impression_share_target": 80,
    "is_budget_lost_threshold_pct": 15
  }
}
```

**Zero código.** É o que garante que o ganho vale para qualquer vertical.

Segmentos a configurar: `imobiliaria`, `saude`, `carros`, `geral`, `master`.

---

### A6. Agentes e Regras de IA

#### Agente de Negativação (NOVO — único agente novo justificado)

**Tipo:** Serviço + regra automática

**Lógica:**
1. Lê `GoogleSearchTerm`: termo com `gasto > X%` (config) sem conversão
2. Propõe negativo → fila de Aprovações existente (reuso 100%)
3. Na aprovação humana: `addNegativeKeyword` + grava em `GoogleNegativeKeyword`
4. X vem de `network_defaults.google` (por segmento)

**Arquivo novo:** `src/lib/marketing/services/googleNegationService.ts`

#### Regra: `IMPRESSION_SHARE_OPPORTUNITY` (Nova)

Estende `aiInsights.ts`:

- IS Lost (Budget) alto em campanha com CPL < ideal → ação `SCALE`
- Reusa `agentDecisor` e `budgetPlanner` que já existem

#### Ação Nova: `ADD_NEGATIVE_KEYWORD`

Estende enum de ações do agentDecisor:

- Tipo defensivo (baixo risco)
- Entra na fila de aprovação como `PAUSE` / `DOWNSCALE`

#### Demais Agentes

✅ **Reuso 100%:** Decisor, Monitor, Wasted Spend, Briefing, Demand Radar, Anticipation — passam a cobrir Google sem alteração.

---

### A7. Dashboard (Mudança Mínima e Disciplinada)

| Onde | Mudança | O que NÃO fazer |
|------|---------|-----------------|
| **Painel consolidado** | + Filtro/seletor de rede · + Comparativo CPL por rede · Budget allocation inclui Google | Não empilhar KPI Google no painel principal |
| **Nova aba/drill Google** | IS Lost (Budget), Search Terms (com ação de negativar), ROAS | Não criar cards de QS/Device/Daypart/Auction |
| **Desperdício, Auditoria, Portfolio, Insights Cruzados** | Melhoram sozinhos (já agnósticos) | — |

---

### A8. Fluxo de Lançamento

| Item | Ação |
|------|------|
| **Wizard** | Bifurcar: Meta (atual) vs. Google (asset-based, sem segmentação granular). `GoogleAiMaxWizard` já existe parcial — completar, não recriar |
| **Config/credenciais** | Aba Google em Configurações já iniciada (`configuracoes/google-ads` + `google-auth`) — auditar e finalizar OAuth de produção |

---

### A9. Processos (Reuso de Infraestrutura Existente)

| Processo | Ação |
|----------|------|
| **Cron de sync (6h)** | Reusar — estender para o coletor de Search Terms |
| **Fila de aprovação** | Reusar — ações Google entram no mesmo fluxo |
| **Briefing WhatsApp (8h/18h)** | Reusar — passa a consolidar Google automaticamente |

---

### A10. Sequenciamento e Critério de Pronto (FASE 1 — Google)

| Passo | Entrega | Pronto Quando |
|-------|---------|--------------|
| **1** | Solicitar developer token | Solicitado (paralelo a tudo) |
| **2** | Migrations A2 (4 colunas + 2 tabelas) | Aplicadas localmente |
| **3** | Completar adapter A3 (create + upload + insights) | Campanha real serve anúncio e traz métricas reais |
| **4** | Coletor de Search Terms A4 | `GoogleSearchTerm` populando com termos reais |
| **5** | Config por segmento A5 | ≥ 2 segmentos com `network_defaults.google` |
| **6** | Agente de Negativação + regra IS A6 | Ação aparece na fila de aprovação e executa na aprovação |
| **7** | Dashboard A7 (filtro rede + CPL/rede + drill Google) | CPL Meta × Google lado a lado |

**DoD Fase 1 (Definition of Done):**
- Lançar campanha Google real
- Ver CPL comparável ao Meta
- Agente propor ≥ 1 negativo de verdade

---

## FASE 2 — TIKTOK (Só Após Fase 1 Estável)

### B1. Dependências Externas

| Dependência | Prazo |
|-------------|-------|
| App aprovado no TikTok for Business + Marketing API v1.3 | Aprovação (dias) |
| Access token por advertiser (OAuth) | Por cliente |

---

### B2. Modelo de Dados — Reuso Alto

| Item | Estado | Observação |
|------|--------|-----------|
| **Insight** (impressões, cliques, spend, conversões, CPL, ROAS) | ✅ Reuso | Grão campanha-dia já suporta |
| **Métricas de vídeo** (videoViews3s, thruplayViews, videoViews25/50/75/100Pct) | ✅ Já existem | Criadas na FASE 5 p/ Meta — TikTok reusa |
| **ad_network='tiktok'** em Campaign/Insight | ✅ Coluna já existe | Só novo valor de enum |
| **Search Terms / Negativação** | ❌ N/A | Não se aplica ao TikTok (não é rede de busca) |

**Resultado:** TikTok **não cria tabela nova** — reusa infraestrutura de métricas de vídeo existente.

---

### B3. Adapter TikTok (Do Stub à Produção)

| Item | Ação |
|------|------|
| **Biblioteca** | SDK oficial `tiktok-business-api-sdk` (JS) — não usar MCP como backend |
| **createCampaign** | Modelo campanha → ad group → ad (parecido com Meta, reusa `CreateCampaignInput`, não o `GoogleCampaignInput`) |
| **uploadCreative** | Upload de vídeo (não imagem) |
| **fetchInsights** | Métricas base + retenção de vídeo → mapear nas colunas de vídeo já existentes |
| **updateCampaignStatus, validateCredentials** | Implementar no padrão Meta |

---

### B4. KPIs TikTok (Portão: Gera Decisão)

| KPI | Decisão | Estado |
|-----|---------|--------|
| **CPL/rede, ROAS, alocação** | "qual canal rende → realocar" | ✅ Reuso total |
| **Hook Rate / retenção 3s** | "criativo prende? senão, trocar (REFRESH_CREATIVE)" | ✅ Infra já existe (colunas + regra de Hook) |
| ❌ **Hashtag/sound/trending** | Vaidade | Fora de escopo |

---

### B5. Configuração por Segmento

Preencher `system_segments.network_defaults.tiktok` — mesma mecânica JSONB por vertical.

**Zero código.**

---

### B6. Pipeline de Criativo — Único Investimento Novo Real

| Item | Ação |
|------|------|
| **creativeGenerationService** | Adicionar template de vídeo (TikTok é vídeo-first). Meta já tem endpoints de vídeo — reaproveitar o que der |
| **creativeAnalysisService (Vision)** | Reuso — análise de criativo é universal |

---

### B7. Dashboard e Agentes

| Item | Estado |
|------|--------|
| **Painel consolidado** | TikTok entra no filtro de rede + CPL/rede automaticamente |
| **Drill TikTok** | Hook Rate / retenção de vídeo (reusa componente de Hook do Meta) |
| **Agentes** | Reuso 100% — Decisor, Wasted Spend, Briefing, REFRESH_CREATIVE por Hook baixo |

---

### B8. Sequenciamento e Critério de Pronto (FASE 2 — TikTok)

| Passo | Pronto Quando |
|-------|--------------|
| **1** | App aprovado + token |
| **2** | Adapter no SDK oficial (create/upload-vídeo/insights) |
| **3** | `network_defaults.tiktok` em ≥ 2 segmentos |
| **4** | Template de vídeo no gerador de criativo |

**DoD Fase 2:**
- Lançar campanha TikTok real
- Ver CPL no consolidado com Meta + Google
- Agente propor REFRESH por Hook Rate baixo

---

## PARTE C — Governança Transversal

### Tema: Governança de KPI

**Regra:** Toda proposta de novo KPI passa pelo portão "isso muda uma decisão?". Se não, não entra.

**Aplicação:**
- `search_impression_share` — SIM (impacta `SCALE`)
- `search_rank_lost_is` — Fraca (raramente impacta decisão)
- Hashtag/sound do TikTok — NÃO (vaidade)

---

### Tema: Multi-Segmento

**Regra:** Antes de cada rede ir a produção, ≥ 2 segmentos configurados via `network_defaults` — prova de que não é mono-vertical.

---

### Tema: Coordenação

**Regra:** Registrar em `docs/AI_SYNC.md` que Google está sendo completado (não duplicar o outro agente); TikTok só depois.

**Status atual:** Outro agente em `feature/ag-cockpit-camadas` já iniciou Google Ads. Este plano audita + completa + coordena.

---

### Tema: Teste

**Regra:** Cada adapter validado com conta real antes de habilitar o agente a executar. Adapter mock **nunca aciona ação automática**.

---

### Riscos Principais

| Risco | Mitigação |
|-------|-----------|
| Colisão com o outro agente no Google | Coordenar via `docs/AI_SYNC.md` — divisão clara de responsabilidades |
| Adapter em mock acionando ação real | Gate de "adapter validado" antes de liberar agente automático |
| TikTok vídeo → custo novo de pipeline | Verificar ROI do template de vídeo antes de escalar |

---

## Resumo de Esforço e Reuso

| Frente | Tabelas Novas | Colunas Novas | Agentes Novos | Reuso |
|--------|---------------|---------------|---------------|-------|
| **Google** | 2 (GoogleSearchTerm, GoogleNegativeKeyword) | 4 em Insight | 1 (Negativação) | ~30 agentes, dashboard consolidado, desperdício, briefing, fila de aprovação |
| **TikTok** | 0 | 0 (reusa vídeo) | 0 (reusa REFRESH_CREATIVE) | Tudo acima + colunas de vídeo |

**Leitura estratégica:**
- Google exige o grosso do trabalho novo (adapter real + negativação + IS)
- TikTok é quase pura configuração + adapter no SDK oficial + um template de vídeo
- Plataforma já foi construída multi-rede, métricas de vídeo já existem

---

## Próximos Passos

1. **Ação imediata:** Solicitar Developer Token Google Ads API (5–15 dias)
2. **Paralelo a tudo:** Auditar branch `feature/ag-cockpit-camadas` — ver o que já foi feito de Google
3. **Sessão seguinte:** Iniciar Passo 2 (Migrations A2) assim que Developer Token tiver perspectiva de chegada
4. **Registrar:** Atualizar `docs/AI_SYNC.md` com este plano e divisão de responsabilidades

---

**Documento:** `docs/PLANO_GOOGLE_TIKTOK.md` v1.0 (2026-07-19)  
**Próxima revisão:** Após Developer Token recebido ou após auditoria de `feature/ag-cockpit-camadas`
