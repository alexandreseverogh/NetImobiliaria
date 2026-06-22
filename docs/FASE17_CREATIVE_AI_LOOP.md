# FASE 17 — Creative AI Loop: Biblioteca Diversa + Circuito Fechado do Agente

> **Status:** 🔲 PLANEJADA
> **Pré-requisitos:** FASE 6 (análise de criativos), FASE 6.5 (geração Sharp/SVG), FASE 15 (agente autônomo com REFRESH_CREATIVE)
> **Prioridade:** ALTA — fecha o circuito de valor que justifica toda a inteligência de criativos
> **Duração estimada:** ~6–8 dias úteis distribuídos nas sub-fases

---

## 1. Problema a Resolver

O agente já detecta fadiga de criativo (`frequência > 1.3× threshold`) e cria ação `REFRESH_CREATIVE`.
Hoje essa ação fica eternamente em `PENDING_APPROVAL` sem nenhuma consequência prática, porque:

1. **Não há substituição automática** — alguém precisa manualmente escolher outro criativo, subir no Meta e pausar o fatigado
2. **A biblioteca é homogênea** — as variações geradas (FASE 6.5) são recortes do mesmo ativo, com mesmo hook_type e ângulo emocional; não resolvem fadiga de verdade
3. **Não existe rastreamento de desempenho por criativo gerado** — impossível saber se a variação performou melhor ou pior

A FASE 17 resolve esses três pontos em sequência lógica.

---

## 2. Visão do Produto — O Que Muda Para o Usuário

**Antes (hoje):**
> Agente detecta criativo fatigado → cria ação no painel → usuário lê a notificação → ignora ou não sabe o que fazer → nada acontece → CPL sobe.

**Depois (FASE 17 completa):**
> Agente detecta criativo fatigado → seleciona melhor substituto da biblioteca (hook_type diferente, menor CPL histórico) → atualiza o anúncio no Meta via API → notifica o usuário *do que foi feito* → registra para análise de desempenho comparativo.

O usuário gerencia resultados, não tarefas operacionais.

---

## 3. Arquitetura da Solução

```
┌────────────────────────────────────────────────────────────────┐
│  FASE 17-A: Geração de Criativos Diversos via IA               │
│  (resolve o problema da biblioteca homogênea)                  │
│                                                                 │
│  Foto do Imóvel (existente)                                     │
│       +                                                         │
│  Hook Image IA (novo) ──→ Composite Sharp ──→ MinIO             │
│       +                                                         │
│  Copy diversificado LLM (headline+CTA por hook_type)           │
└──────────────────────────────┬─────────────────────────────────┘
                               │ CreativeAsset com metadados
┌──────────────────────────────▼─────────────────────────────────┐
│  FASE 17-B: Seleção Inteligente (Library Intelligence)         │
│  (resolve o problema da escolha do substituto)                 │
│                                                                 │
│  Quando agente detecta fadiga em Ad X:                         │
│  1. Query: assets do mesmo tenant/segmento                     │
│  2. Filtra: hook_type ≠ hook_type atual + nunca usado nesse Ad │
│  3. Score: CPL_histórico × confidence_analise × diversidade    │
│  4. Seleciona top candidato                                    │
└──────────────────────────────┬─────────────────────────────────┘
                               │ asset_id do substituto
┌──────────────────────────────▼─────────────────────────────────┐
│  FASE 17-C: Substituição Automática via Meta API               │
│  (resolve o problema da execução manual)                       │
│                                                                 │
│  1. Upload imagem → Meta Media Library                         │
│  2. Cria AdCreative no Meta com nova imagem + copy             │
│  3. Atualiza Ad existente: POST /{ad_id} {creative_id}         │
│  4. Registra AgentAction REFRESH_CREATIVE como EXECUTED        │
│  5. Notifica usuário via WhatsApp do que foi feito             │
└──────────────────────────────┬─────────────────────────────────┘
                               │ ad_id + creative_id_meta
┌──────────────────────────────▼─────────────────────────────────┐
│  FASE 17-D: Rastreamento de Desempenho Comparativo             │
│  (resolve o problema de não saber se melhorou)                 │
│                                                                 │
│  Tabela CreativePerformance:                                   │
│  asset_id | ad_id | período | impressões | CTR | CPL | CPC     │
│                                                                 │
│  Dashboard: "variações geradas pela IA" vs "originais"        │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. SUB-FASE 17-A: Geração de Criativos Diversos via IA

### 4.1. Problema central
A biblioteca atual tem criativos do mesmo ângulo emocional (ex: foto frontal do imóvel).
Fadiga de criativo é fadiga de padrão visual — trocar a mesma foto por um recorte da mesma foto não resolve.

### 4.2. O que gerar (sem inventar o imóvel)
A propriedade deve aparecer autêntica. A diversidade vem do **contexto emocional ao redor**:

| Hook Type | Conceito | Como Gerar |
|---|---|---|
| `aspiration` | Família celebrando mudança | DALL-E 3 / Flux: "família feliz recebendo chaves de imóvel, luz natural, estilo fotorrealista" |
| `social_proof` | Depoimento visual | LLM gera texto de depoimento fictício + overlay tipográfico |
| `urgency` | Countdown / últimas unidades | Overlay SVG com temporizador + badge "última unidade" |
| `problem_solution` | Contraste antes/depois | Colagem: imagem de apartamento alugado pequeno + imagem do imóvel |
| `curiosity` | Teaser parcial | Sharp: crop 20% da fachada + blur + badge "descubra" |
| `lifestyle` | Cena de uso do espaço | DALL-E 3: "sala de estar moderna com família, varanda, vista de cidade" |

### 4.3. Tecnologias e Custos

**Opção A — DALL-E 3 (OpenAI)**
- Endpoint: `POST /v1/images/generations` com `model: "dall-e-3"`
- Custo: ~$0.04 por imagem 1024×1024, ~$0.08 por 1792×1024
- Vantagem: qualidade alta, integração simples via OpenAI SDK
- Limitação: não faz img2img nativo (sem misturar com foto existente)

**Opção B — Stable Diffusion via Replicate (recomendada)**
- Endpoint: `replicate.run("stability-ai/stable-diffusion-xl-base-1.0", {...})`
- Custo: ~$0.003 por imagem (10× mais barato que DALL-E)
- Vantagem: suporta img2img + inpainting (modifica foto existente)
- Caso de uso matador: inpainting de background da foto do imóvel mantendo estrutura

**Opção C — Flux (Black Forest Labs) via Replicate ou API própria**
- Modelo mais recente, qualidade superior ao SDXL
- Custo: ~$0.003–0.006 por imagem
- Vantagem: melhor para fotorrealismo, menos "IA demais"

**Opção recomendada para MVP da FASE 17-A:**
> Flux via Replicate para hook images + Sharp para composite final.
> A foto do imóvel fica em posição fixa (30% inferior ou lateral).
> Imagem gerada ocupa o contexto/cenário (70% superior).

### 4.4. Pipeline de Geração

```
Input: tenant_id + concept (hook_type + headline + cta) + source_asset_id
         │
         ▼
1. LLM gera prompt otimizado para o hook_type
   (ex: hook="aspiration" → "happy Brazilian family celebrating new home, 
    modern apartment exterior visible in background, golden hour lighting, 
    photorealistic, no text")
         │
         ▼
2. Flux/DALL-E gera hook_image (1080×1080)
         │
         ▼
3. Sharp composite:
   - hook_image como background
   - foto do imóvel redimensionada (corner ou bottom strip)
   - SVG overlay com headline + CTA (gerados por LLM para o hook_type)
         │
         ▼
4. Upload MinIO → CreativeAsset com:
   - aiGenerated: true
   - hookType: 'aspiration' (do conceito)
   - generationMethod: 'flux-composite'
   - sourcePrompt: (o prompt usado)
         │
         ▼
5. Gate de aprovação (CreativeGenerationJob → NEEDS_REVIEW)
   ou auto-aprovação se dentro de parâmetros de qualidade
```

### 4.5. Schema — Novos Campos Necessários

```sql
-- Adicionar em CreativeAsset
ALTER TABLE campanhasmarketingdigital."CreativeAsset"
  ADD COLUMN IF NOT EXISTS generation_method VARCHAR(50),   -- 'sharp-crop' | 'flux-composite' | 'dalle3' | 'manual'
  ADD COLUMN IF NOT EXISTS source_prompt     TEXT,          -- prompt usado para gerar (auditoria)
  ADD COLUMN IF NOT EXISTS hook_type         VARCHAR(50);   -- duplicado da análise para filtragem rápida

-- Nova tabela para rastreamento de prompts e custos
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."CreativeGenerationLog" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  asset_id        UUID REFERENCES campanhasmarketingdigital."CreativeAsset"(id),
  provider        VARCHAR(30) NOT NULL,  -- 'replicate' | 'openai' | 'anthropic'
  model           VARCHAR(80) NOT NULL,  -- 'flux-1.1-pro' | 'dall-e-3'
  prompt          TEXT,
  cost_usd        NUMERIC(8,5),          -- custo real da chamada
  duration_ms     INTEGER,
  success         BOOLEAN DEFAULT true,
  error_message   TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### 4.6. Novos Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/marketing/services/aiImageGenerationService.ts` | Wrapper para Flux/DALL-E via Replicate/OpenAI |
| `src/lib/marketing/services/creativeComposerService.ts` | Refactor do creativeGenerationService: separa geração de imagem base da composição Sharp |
| `src/app/api/admin/campanhas/criativos/generate/ai/route.ts` | Endpoint POST que aceita `{ hook_type, concept, source_asset_id, formats }` |

---

## 5. SUB-FASE 17-B: Library Intelligence (Seleção do Substituto)

### 5.1. Algoritmo de Seleção

Quando o agente executa `runDecisor()` e detecta `REFRESH_CREATIVE` para um Ad:

```typescript
async function selectBestCreativeSubstitute(params: {
  tenantId:        string;
  currentAssetId:  string;    // criativo fatigado
  currentHookType: string;    // hook_type do fatigado
  adId:            string;    // ad_id do Meta
  campaignId:      string;
}): Promise<CreativeAsset | null>
```

**Query de seleção — critérios por prioridade:**

```sql
SELECT
  a.id,
  a.storage_url,
  a.original_name,
  an.hook_type,
  an.emotional_tone,
  -- Score composto: menor CPL histórico + maior confidence + maior diversidade de hook
  (
    COALESCE(1.0 / NULLIF(perf.avg_cpl, 0), 0.5) * 0.5 +   -- 50%: performance histórica
    COALESCE(an.llm_confidence, 0.5)              * 0.3 +   -- 30%: confiança da análise
    CASE WHEN an.hook_type != $current_hook_type THEN 0.2   -- 20%: diversidade de hook
         ELSE 0.0 END
  ) AS score
FROM campanhasmarketingdigital."CreativeAsset" a
LEFT JOIN campanhasmarketingdigital."CreativeAnalysis" an ON an.asset_id = a.id
LEFT JOIN campanhasmarketingdigital."CreativePerformance" perf
  ON perf.asset_id = a.id AND perf.tenant_id = $tenant_id
WHERE
  a.tenant_id    = $tenant_id
  AND a.id       != $current_asset_id
  AND a.is_active = true
  AND an.analysis_status = 'done'
  -- Nunca reusar um criativo que já foi parado por fadiga nesse ad
  AND a.id NOT IN (
    SELECT DISTINCT asset_id
    FROM campanhasmarketingdigital."CreativeRotationHistory"
    WHERE ad_id = $ad_id AND reason = 'fatigue'
  )
ORDER BY score DESC
LIMIT 1;
```

### 5.2. Tabelas Novas Necessárias

```sql
-- Performance histórica por criativo (alimentada a cada sync do agente)
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."CreativePerformance" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  asset_id        UUID NOT NULL REFERENCES campanhasmarketingdigital."CreativeAsset"(id),
  ad_id           VARCHAR(50),      -- Meta ad_id
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  impressions     INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  leads           INTEGER DEFAULT 0,
  spend           NUMERIC(10,2),
  ctr             NUMERIC(8,6),
  cpl             NUMERIC(10,2),
  cpc             NUMERIC(10,2),
  avg_frequency   NUMERIC(6,3),
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(asset_id, ad_id, period_start)
);

-- Histórico de rotações (evitar reusar criativos que falharam)
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."CreativeRotationHistory" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  ad_id           VARCHAR(50) NOT NULL,
  asset_id_from   UUID,             -- criativo substituído
  asset_id_to     UUID,             -- criativo substituto
  reason          VARCHAR(30),      -- 'fatigue' | 'manual' | 'test'
  executed_at     TIMESTAMP DEFAULT NOW(),
  executed_by     VARCHAR(50)       -- 'agent' | user_id
);
```

---

## 6. SUB-FASE 17-C: Substituição Automática via Meta API

### 6.1. Fluxo Completo

```
agentDecisor detecta REFRESH_CREATIVE para ad_id X
         │
         ▼
1. selectBestCreativeSubstitute() → asset Y
         │
         ▼
2. uploadCreativeToMeta(asset Y) →
   POST /act_{ad_account_id}/adimages (multipart binário)
   → image_hash do Meta
         │
         ▼
3. createMetaAdCreative(image_hash, headline, cta) →
   POST /act_{ad_account_id}/adcreatives
   → creative_id do Meta
         │
         ▼
4. updateMetaAd(ad_id, creative_id) →
   POST /{ad_id} { creative: { creative_id } }
   → confirmação
         │
         ▼
5. registrar AgentAction REFRESH_CREATIVE como EXECUTED
   + CreativeRotationHistory
   + notificar via WhatsApp: 
     "🎨 Criativo substituído automaticamente em [campanha X].
      Frequência estava em 2.8 (limite: 2.0).
      Novo criativo: [nome] (hook: aspiração).
      CPL anterior: R$48. Acompanhe nos próximos 3 dias."
```

### 6.2. Novos Métodos em MetaAdsAdapter

```typescript
// src/lib/marketing/meta/MetaAdsAdapter.ts (novos métodos)

async uploadImageToMetaLibrary(
  imageBuffer:   Buffer,
  mimeType:      string,
  adAccountId:   string,
  accessToken:   string,
): Promise<{ imageHash: string }>

async createAdCreative(params: {
  adAccountId:  string;
  imageHash:    string;
  pageId:       string;
  headline:     string;
  description?: string;
  callToAction: string;
  linkUrl:      string;
  accessToken:  string;
}): Promise<{ creativeId: string }>

async updateAdCreative(params: {
  adId:       string;
  creativeId: string;
  accessToken: string;
}): Promise<{ success: boolean }>
```

### 6.3. Mudança em agentDecisor.ts

**Hoje:** `REFRESH_CREATIVE` gera ação com `status = PENDING_APPROVAL` e para.

**Depois:** `REFRESH_CREATIVE` passa a ser **ação defensiva** (como PAUSE e DOWNSCALE):

```typescript
// Antes
const OFFENSIVE_TYPES = ['SCALE', 'REFRESH_CREATIVE', 'ADJUST_AUDIENCE', 'REALLOCATE_BUDGET'];

// Depois
const DEFENSIVE_TYPES = ['PAUSE', 'DOWNSCALE', 'REFRESH_CREATIVE'];  // REFRESH vira defensivo
const OFFENSIVE_TYPES = ['SCALE', 'ADJUST_AUDIENCE', 'REALLOCATE_BUDGET'];
```

**Condição para ser defensivo:** somente se `selectBestCreativeSubstitute()` encontrar candidato válido. Se não encontrar → mantém `PENDING_APPROVAL` com mensagem "nenhum criativo substituto disponível — biblioteca muito pequena".

### 6.4. Fallback de Segurança

- Se não há candidato na biblioteca → ação fica `PENDING_APPROVAL` (sem travar)
- Se Meta API falha → ação fica `PENDING_APPROVAL` com `error_message` no WhatsApp
- Se criativo substituto também fatica em 7 dias → próximo ciclo do agente faz nova rotação
- Máximo de 2 rotações automáticas por Ad por semana (evitar loop)

---

## 7. SUB-FASE 17-D: Rastreamento de Desempenho Comparativo

### 7.1. Alimentação da Tabela CreativePerformance

A cada ciclo do agente (`/api/agent/tick`), para cada Ad sincronizado:

```typescript
// Em metaSyncService.ts ou agentDecisor.ts
await upsertCreativePerformance({
  tenantId:    campaign.tenant_id,
  assetId:     ad.creative_asset_id,    // FK para CreativeAsset
  adId:        ad.meta_ad_id,
  periodStart: yesterday,
  periodEnd:   today,
  impressions: adInsights.impressions,
  clicks:      adInsights.clicks,
  leads:       adInsights.leads,
  spend:       adInsights.spend,
  ctr:         adInsights.ctr,
  cpl:         adInsights.cpl,
  avgFrequency: adInsights.frequency,
});
```

**Desafio técnico:** o Ad na tabela `Ad` precisa ter o FK `creative_asset_id` para rastrear qual `CreativeAsset` está rodando. Hoje esse campo pode não existir.

```sql
ALTER TABLE campanhasmarketingdigital."Ad"
  ADD COLUMN IF NOT EXISTS creative_asset_id UUID 
  REFERENCES campanhasmarketingdigital."CreativeAsset"(id);
```

### 7.2. UI — Painel de Desempenho de Criativos

Nova seção na página `admin/campanhas/criativos`:

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Desempenho por Criativo                                 │
│                                                             │
│  [Original] Foto fachada frente                            │
│  CTR 1.2% | CPL R$52 | Freq. 3.1 | 14 dias ativo          │
│  ↳ Substituído por: "Variação IA - Aspiração"              │
│                                                             │
│  [IA 🤖] Variação IA - Aspiração (gerado 2026-06-22)       │
│  CTR 1.8% | CPL R$38 | Freq. 0.9 | 3 dias ativo           │
│  ↳ +50% CTR | -27% CPL vs original ✅                     │
│                                                             │
│  [IA 🤖] Variação IA - Urgência                            │
│  Aguardando dados (< 24h ativo)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Onde Encaixar no Plano de Fases

```
FASE 6    ✅ Análise de criativos (Vision LLM)
FASE 6.5  ✅ Geração Sharp/SVG + gate de aprovação
FASE 15   ✅ Agente autônomo (PAUSE, DOWNSCALE, REFRESH_CREATIVE pendente)
FASE 16   ✅ Postagem orgânica Meta/Instagram

FASE 17-A 🔲 IA para geração de hook images diversas (Flux/DALL-E + Sharp composite)
              → Infra independente, pode rodar sem agente
              → Entrega: biblioteca com hook_types variados

FASE 17-B 🔲 Library Intelligence — algoritmo de seleção de substituto
              → Depende de 17-A (precisa de criativos diversos) e dados de performance
              → Entrega: selectBestCreativeSubstitute() funcional

FASE 17-C 🔲 Meta API Update — substituição automática do criativo no Ad
              → Depende de 17-B + MetaAdsAdapter expandido
              → REFRESH_CREATIVE vira ação defensiva
              → Entrega: loop fechado agente → meta → notificação

FASE 17-D 🔲 Rastreamento e painel comparativo
              → Pode rodar em paralelo com 17-C
              → Entrega: dashboard "IA vs original" com CTR/CPL
```

**Sequência recomendada:** 17-A → 17-B → 17-C (paralelo com 17-D)

**17-A e 17-B são pura infraestrutura** (sem toque no agente).
**17-C é a expansão do agente** — fecha o circuito.
**17-D é UI/analytics** — entrega valor de observabilidade.

---

## 9. Dependências e Riscos

| Risco | Mitigação |
|---|---|
| Replicate/Flux indisponível | Fallback para DALL-E 3 (mesma interface OpenAI SDK) |
| Meta API rejeitar imagem gerada (política de conteúdo) | Validar aspect ratio + tamanho antes; gate de aprovação humana em 17-A |
| Biblioteca ainda pequena → sem substituto | Agente mantém PENDING_APPROVAL com alerta "biblioteca insuficiente" |
| Custo de geração de imagem por tenant | Teto configurável por tenant (ex: max 20 gerações/mês no tier TRIAL) |
| Criativo gerado por IA não performa melhor | 17-D rastreia → agente aprende pelo CreativePerformance; próxima rotação usa dados reais |

---

## 10. Critérios de Aceitação da FASE 17

- [ ] **17-A:** dado um `source_asset_id` e `hook_type`, o sistema gera imagem via Flux+Sharp e salva em MinIO com metadados corretos
- [ ] **17-A:** custo de geração é registrado em `CreativeGenerationLog`
- [ ] **17-B:** `selectBestCreativeSubstitute()` retorna o criativo com maior score quando há candidatos válidos, e `null` quando não há
- [ ] **17-B:** criativos que já causaram fadiga em um Ad nunca são selecionados para aquele Ad
- [ ] **17-C:** agente executa REFRESH_CREATIVE automaticamente (sem aprovação), atualiza o Ad no Meta e registra em `CreativeRotationHistory`
- [ ] **17-C:** notificação WhatsApp informa: criativo substituído, frequência anterior, hook_type novo
- [ ] **17-C:** máximo 2 rotações automáticas por Ad por semana é respeitado
- [ ] **17-D:** `CreativePerformance` é alimentada a cada ciclo do agente
- [ ] **17-D:** painel na UI exibe CTR/CPL por criativo com comparativo original × IA

---

*Documento criado em: 2026-06-22*
*Próxima revisão: ao iniciar implementação de 17-A*
