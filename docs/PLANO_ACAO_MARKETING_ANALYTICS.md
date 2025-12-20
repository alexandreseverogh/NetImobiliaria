# 📊 PLANO DE AÇÃO — Marketing & Analytics (Meta + YouTube) + Canal Chatbot (WhatsApp)

**Objetivo:** estruturar **tabelas + CRUD + tracking + KPIs + dashboards (Metabase/Superset)** para medir retorno de campanhas com máxima estratificação e acelerar a operação com **chatbot WhatsApp** como canal separado.

---

## 🎯 Princípios (para não “enganar” o ROI)

- **Estratificação máxima** exige:
  - IDs de plataforma (quando disponíveis): `campaign_id`, `adset/adgroup_id`, `ad_id`, `creative_id`
  - UTMs padronizadas: `utm_campaign`, `utm_content`
  - Click IDs: `fbclid/fbp/fbc` (Meta) e `gclid/wbraid/gbraid` (Google) + `ytclid` (quando aplicável)
  - Eventos do funil **do anúncio até a proposta**
- **YouTube não pode ser medido só por clique**: precisa contemplar *view-through* (atribuição por visualização).
- **Chatbot WhatsApp** é **canal separado** e deve ter métricas próprias (qualidade, autonomia, custo e gargalos).

---

## 1) Modelo de Dados (tabelas) — campanha → grupo → anúncio → criativo

```sql
-- 1) Campanhas (nível “campanha” do anunciante)
CREATE TABLE marketing_campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plataforma VARCHAR(20) NOT NULL, -- "meta" | "youtube"
  nome VARCHAR(255) NOT NULL,
  objetivo VARCHAR(50) NOT NULL, -- "leads" | "trafego" | "mensagens" | "conversoes" | etc
  status VARCHAR(20) NOT NULL DEFAULT 'ativa', -- "ativa" | "pausada" | "encerrada"
  data_inicio DATE,
  data_fim DATE,

  -- Estratificação estratégica
  tag_sonho VARCHAR(100),          -- opcional (se usar)
  bairro_cluster VARCHAR(120),     -- opcional
  ticket_cluster VARCHAR(60),      -- ex: "300-500","500-800"
  publico_alvo JSONB,              -- idade/interesses/lookalike etc (descrição)

  -- IDs externos
  external_campaign_id VARCHAR(100), -- Meta campaign id / Google Ads campaign id
  utm_campaign VARCHAR(255),         -- padrão único e estável

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2) Conjuntos/AdSets (Meta) ou AdGroups (YouTube/Google Ads)
CREATE TABLE marketing_grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID REFERENCES marketing_campanhas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ativa',
  orcamento_diario DECIMAL(12,2),
  segmentacao JSONB, -- placements, geo, idade, interesses, etc
  external_group_id VARCHAR(100),
  utm_content VARCHAR(255), -- opcional (quando usar por grupo)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3) Anúncios (nível “ad”)
CREATE TABLE marketing_anuncios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID REFERENCES marketing_grupos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ativa',
  external_ad_id VARCHAR(100),
  placement JSONB, -- ex: feed/stories/reels/youtube_instream etc
  utm_term VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4) Criativos (nível “creative”)
CREATE TABLE marketing_criativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anuncio_id UUID REFERENCES marketing_anuncios(id) ON DELETE CASCADE,
  creative_id VARCHAR(120), -- id do criativo na plataforma (quando existir)
  formato VARCHAR(50),      -- "video","image","carousel","text"
  gancho VARCHAR(120),      -- ex: "segurança","fim_do_aluguel"
  mensagem TEXT,
  asset_url TEXT,           -- link do vídeo/arte
  variacoes JSONB,          -- headlines, thumbnails, etc
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mkt_campanhas_plataforma ON marketing_campanhas(plataforma, status);
CREATE INDEX idx_mkt_campanhas_utm_campaign ON marketing_campanhas(utm_campaign);
CREATE INDEX idx_mkt_grupos_campanha ON marketing_grupos(campanha_id);
CREATE INDEX idx_mkt_anuncios_grupo ON marketing_anuncios(grupo_id);
CREATE INDEX idx_mkt_criativos_anuncio ON marketing_criativos(anuncio_id);
```

---

## 2) Tracking: Eventos + Atribuição (UTM/Click IDs + Geo)

```sql
CREATE TABLE marketing_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),

  -- Identidade e contexto
  session_id VARCHAR(64),
  lead_uuid UUID,
  imovel_id INTEGER,

  -- Evento
  evento VARCHAR(50) NOT NULL, -- "LandingView","LeadStarted","LeadSubmitted","WhatsAppClick","VisitScheduled","ProposalSent"
  page_url TEXT,
  referrer TEXT,
  device JSONB,

  -- Atribuição e estratificação
  utm JSONB,          -- utm_source/medium/campaign/content/term
  click_ids JSONB,    -- { fbclid, fbp, fbc, gclid, wbraid, gbraid, ytclid }
  platform_ids JSONB, -- { campaign_id, adset_id/adgroup_id, ad_id, creative_id }

  -- Geo como dimensão (pode vir da geolocalização por IP)
  geo JSONB           -- { city, region, country }
);

CREATE INDEX idx_mkt_eventos_evento_data ON marketing_eventos(evento, created_at DESC);
CREATE INDEX idx_mkt_eventos_utm_campaign ON marketing_eventos((utm->>'utm_campaign'));
CREATE INDEX idx_mkt_eventos_platform_campaign ON marketing_eventos((platform_ids->>'campaign_id'));
```

**Regras essenciais:**
- Persistir UTMs/click IDs no primeiro acesso e reaplicar nos eventos seguintes da mesma sessão.
- Guardar `event_id` (quando integrar Pixel/CAPI) para deduplicação.

---

## 3) Meta (Facebook/Instagram) — tracking e retorno

- **Captação**: Lead Ads + Click-to-WhatsApp/Direct.
- **Tracking**:
  - Pixel (front) + **CAPI** (back) com `event_id`.
  - Click IDs: `fbclid`, `fbp`, `fbc`.

**KPIs-chave (Meta):**
- CPL, CPLQ, taxa de SQL, visita/lead, proposta/visita
- Breakdown por: `campaign/adset/ad/creative`, `utm_campaign/utm_content`, geo, placement.

---

## 4) YouTube (Google Ads) — mesma atenção do Meta (incluindo view-through)

**Risco clássico:** medir só clique e concluir “não funciona”. No YouTube, boa parte do impacto é por **visualização** (view-through).

- **Tracking**:
  - UTMs + `gclid` (e `wbraid/gbraid` quando ocorrer).
  - Conversões via GA4/Google Ads (ideal).

**KPIs-chave (YouTube):**
- CPV, VTR, retenção/tempo médio de visualização
- Conversões por janela (1/7/28 dias) separando *click-through* vs *view-through*
- Down-funnel: SQL/visita/proposta quando conseguir ligar ao lead

---

## 5) CRUD (Admin) — gerenciamento operacional das campanhas

**Telas sugeridas:**
- Campanhas (criar/editar/pausar/encerrar + tagging)
- Grupos/Adsets (segmentação, budget)
- Criativos (biblioteca + versões)

**Endpoints sugeridos:**
- `GET/POST /api/admin/marketing/campanhas`
- `GET/PUT/DELETE /api/admin/marketing/campanhas/:id`
- `GET/POST /api/admin/marketing/grupos`
- `GET/POST /api/admin/marketing/anuncios`
- `GET/POST /api/admin/marketing/criativos`
- `GET /api/admin/marketing/analytics?...` (quando fizer UI interna)

---

## 6) KPIs (estratificação máxima) — do anúncio até a proposta

**Produto (mid-funnel):**
- LeadStart Rate = `LeadStarted / LandingView`
- LeadSubmit Rate = `LeadSubmitted / LeadStarted`
- WhatsApp Rate = `WhatsAppClick / LandingView`

**Operação (bottom-funnel):**
- **SQL Rate (fonte da verdade)**: lead em Kanban = `contatados`
- Visita/Lead, Proposta/Visita

**Financeiro (ROI):**
- CPL, CPLQ
- CAC estimado e comissão por campanha (quando houver ligação com fechamento)

**Breakdowns obrigatórios:**
- Plataforma → campanha → grupo → anúncio → criativo
- UTM → geo → device/placement
- Tagging (tag_sonho, clusters), quando aplicável

---

## 7) Dashboards no Metabase/Superset (como construir)

**Como será feito:**
- Criar **views** no PostgreSQL (camada “semântica”)
- No Metabase/Superset, criar charts com filtros globais
- Agendar relatórios e alertas

### 7.1 Views recomendadas (base do BI)

**Funil por campanha (UTM):** `vw_funnel_por_utm_campaign`
- Colunas: `utm_campaign`, `landing_views`, `lead_started`, `lead_submitted`, `whatsapp_clicks`, `contatados`, `visitas`, `propostas`

**Scorecard de criativos:** `vw_creative_scorecard`
- Chave: `utm_content` (ou `creative_id`)
- Inclui rates e volumes por etapa

**Geo performance:** `vw_geo_performance`
- Chaves: `region`, `city`
- Inclui rates e volumes

### 7.2 Exemplo de query (funil por utm_campaign)

```sql
WITH f AS (
  SELECT
    COALESCE(utm->>'utm_campaign', 'sem_utm_campaign') AS utm_campaign,
    COUNT(*) FILTER (WHERE evento='LandingView')   AS lv,
    COUNT(*) FILTER (WHERE evento='LeadStarted')   AS ls,
    COUNT(*) FILTER (WHERE evento='LeadSubmitted') AS sub,
    COUNT(*) FILTER (WHERE evento='WhatsAppClick') AS wa
  FROM marketing_eventos
  WHERE created_at >= $1 AND created_at < $2
  GROUP BY 1
)
SELECT
  utm_campaign,
  lv, ls, sub, wa,
  CASE WHEN lv>0 THEN (ls::decimal/lv) ELSE 0 END AS leadstart_rate,
  CASE WHEN ls>0 THEN (sub::decimal/ls) ELSE 0 END AS leadsubmit_rate,
  CASE WHEN lv>0 THEN (wa::decimal/lv) ELSE 0 END AS whatsapp_rate
FROM f
ORDER BY sub DESC;
```

---

## 8) Chatbot WhatsApp (canal separado) — taxonomia de eventos e KPIs

### 8.1 Regras do canal (decisão atual)
- **Handoff** (passar para corretor) **apenas quando o lead pedir**.
- **SQL operacional** quando o lead entra em Kanban = **`contatados`**.

### 8.2 Eventos mínimos do chatbot (para BI)

> Sugestão: usar a mesma tabela `marketing_eventos` com `utm/click_ids/geo` e diferenciar via `evento` + `device/channel` no payload, ou criar uma tabela `chatbot_eventos`. MVP: reaproveitar `marketing_eventos`.

Eventos recomendados:
- `ChatStarted`
- `CriteriaCaptured` (bairro/ticket/quartos etc.)
- `PropertySuggested`
- `LeadSubmitted` (quando capturar contato)
- `HandoffRequested` (lead pediu humano)

### 8.3 KPIs do chatbot
- Chats iniciados (dia/semana)
- Chat → LeadSubmitted
- Chat → SQL (Kanban contatados)
- Taxa de Handoff (pedido)
- Drop-off por etapa (onde abandonam)
- “Sem resultados” e motivos
- Custo por SQL do chatbot (quando registrar custo WhatsApp + tokens)

### 8.4 Painéis do chatbot (Metabase/Superset)
- **Visão executiva** (volumes + conversões + handoff rate)
- **Funil do bot** (ChatStarted → CriteriaCaptured → PropertySuggested → LeadSubmitted → Contatados)
- **Gargalos** (top perguntas/etapas com abandono; sem resultados; intenções)

---

## ✅ Próximos passos

- [ ] Criar as tabelas de marketing/tracking
- [ ] Definir padrão de UTMs + persistência por sessão
- [ ] Implementar coleta de eventos do site e do WhatsApp
- [ ] Montar views no Postgres para BI
- [ ] Construir dashboards no Metabase/Superset com filtros globais

---

## 🧩 Checklist de implantação — Metabase/Superset (prático, produção-ready)

### 1) Infraestrutura e operação
- [ ] **Hospedagem**: escolher onde rodará (VM/VPS/Kubernetes/Docker).
- [ ] **HTTPS obrigatório** (certificado válido).
- [ ] **Backup/config**: versionar configurações/export de dashboards (quando possível) + rotina de backup do banco do BI (Metabase usa um DB interno).
- [ ] **Ambientes**: ideal ter **staging** (testar views/queries) e **produção**.
- [ ] **Monitoramento**: saúde do serviço, uso de CPU/memória e latência de queries.

### 2) Segurança de acesso (mínimo)
- [ ] **Acesso restrito por rede**:
  - permitir somente IPs da empresa/VPN, ou colocar atrás de gateway/zero-trust.
- [ ] **Autenticação**:
  - habilitar SSO (se possível) ou pelo menos senha forte + MFA (quando disponível).
- [ ] **Controle de permissões**:
  - separar grupos: `admin_bi`, `marketing_leitura`, `gestao_leitura`.
- [ ] **Auditoria**:
  - logar acesso a painéis e exportações (principalmente por LGPD).

### 3) Banco de dados: usuário **read-only** (recomendado)

**Objetivo:** o BI deve **ler**, não escrever. Ideal criar um usuário dedicado com permissões mínimas.

Checklist:
- [ ] Criar usuário `bi_readonly` no PostgreSQL.
- [ ] Conceder acesso somente ao schema/tabelas/views necessárias.
- [ ] Bloquear `INSERT/UPDATE/DELETE` (somente `SELECT`).
- [ ] Preferir expor dados por **views** em um schema `analytics` (ex.: `analytics.vw_*`), em vez de dar acesso direto a tabelas operacionais.

### 4) LGPD e dados sensíveis (importante)
- [ ] **Minimizar PII**:
  - dashboards de marketing normalmente não precisam exibir telefone/email.
  - preferir `lead_uuid` e agregações.
- [ ] **Mascaramento**:
  - se algum painel precisar de PII, criar view com mascaramento (ex.: telefone parcial).
- [ ] **Consentimento**:
  - quando aplicável, só contabilizar eventos de marketing para usuários com consentimento (seção futura do CRM).
- [ ] **Retenção**:
  - definir política para `marketing_eventos` (ex.: 12–24 meses agregados + raw por menos tempo).

### 5) Performance: views e materializações
- [ ] Criar views “semânticas” (ex.: `vw_funnel_por_utm_campaign`, `vw_creative_scorecard`, `vw_geo_performance`, `vw_chatbot_kpis_diario`).
- [ ] Para alto volume, migrar algumas para **materialized views** com refresh:
  - refresh **diário** (histórico) + refresh **horário** (últimas 24h) quando necessário.
- [ ] Índices nas colunas usadas em filtros (`created_at`, `utm_campaign`, `platform_ids->>'campaign_id'`, `geo->>'city'`).

### 6) Governança de métricas (para evitar “KPI diferente por pessoa”)
- [ ] Definir um **dicionário de métricas** (fonte da verdade):
  - definição exata de SQL (Kanban `contatados`), LeadSubmitted, VisitScheduled etc.
- [ ] Padronizar nomenclatura de dashboards e tags.
- [ ] Processo de mudança: qualquer ajuste em KPI → atualizar view/dicionário → comunicar time.

### 7) Alertas e rotinas (o que dá resultado na prática)
- [ ] Alertas semanais:
  - Top/Bottom 10 criativos por CPLQ + visita/lead.
- [ ] Alertas diários:
  - queda brusca de LeadSubmit Rate
  - aumento de “sem resultados” no chatbot
- [ ] Relatório mensal:
  - performance por plataforma (Meta vs YouTube)
  - geo (cidades/UFs)
  - evolução do chatbot (autonomia, custo/SQL, handoff rate)

### 8) Checklist de “pronto para uso” (go/no-go)
- [ ] Conexão do BI ao Postgres com `bi_readonly` testada
- [ ] Dashboards principais publicados (Executivo, Funil, Scorecard, Geo, Chatbot)
- [ ] Filtros globais funcionando
- [ ] Tempo de carregamento aceitável (ex.: < 3–5s para consultas padrão)
- [ ] Acesso restrito e LGPD coberta (sem PII desnecessária)

