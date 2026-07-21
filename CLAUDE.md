# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Regra Obrigatória — Checkpoint Progressivo

Sessões podem ser interrompidas abruptamente por limite de tokens.
Para garantir retomada exata em qualquer modelo, conta ou máquina:

**ANTES de iniciar cada tarefa:**
1. Atualizar `docs/CHECKPOINT.md` — seção "Tarefa em andamento" com o que vai fazer
2. `git add docs/CHECKPOINT.md && git commit -m "checkpoint: iniciando [tarefa]" && git push`

**APÓS concluir cada tarefa:**
1. Atualizar `docs/CHECKPOINT.md` — mover para "Última tarefa concluída", atualizar "Próximos passos"
2. `git add docs/CHECKPOINT.md && git commit -m "checkpoint: concluído [tarefa]" && git push`

O hook `Stop` (`.claude/settings.json`) executa `scripts/git-checkpoint.ps1` automaticamente
ao fim de cada sessão — mas depende de Claude ter atualizado o arquivo durante a sessão.

---

## ⚠️ Regra Obrigatória — Múltiplas Frentes em Paralelo (Worktrees)

**Encerrada em 2026-07-19 a colaboração com o agente Antigravity** — que trabalhava em paralelo
neste repositório. Todo o trabalho dele em `feature/ag-cockpit-camadas` foi puxado (commitado +
WIP não commitado) para um worktree isolado, auditado, corrigido (vários bugs reais encontrados)
e incorporado à implementação do plano Google Ads/TikTok. O diretório principal foi limpo de
qualquer resquício não commitado dele. Detalhe completo em `docs/CHECKPOINT.md` e no histórico
de `docs/AI_SYNC.md` (mantido só como registro histórico — não é mais lido no início da sessão).

Isso **não elimina a necessidade de cuidado com múltiplas frentes** — o projeto continua com
várias frentes de trabalho em paralelo, cada uma em seu próprio `git worktree`, e é fácil uma
sessão nova perder o contexto de qual branch/worktree é o certo pra continuar uma tarefa.

**No início de TODA sessão**, antes de qualquer edição de código:
1. Rodar `git branch --show-current` e `git status --short` no diretório atual — nunca assumir
   que a branch/estado é o mesmo do início da sessão anterior.
2. Rodar `git worktree list` para ver todas as frentes ativas (a tabela abaixo é um snapshot —
   pode estar desatualizada; o comando é a fonte de verdade).
3. Confirmar que está no worktree/branch certo pra tarefa pedida antes de editar código.

**Worktrees ativos (snapshot 2026-07-19):**

| Diretório | Branch | Frente |
|-----------|--------|--------|
| `net-imobiliaria` (este) | `feature/ag-cockpit-camadas` | Diretório principal — histórico geral do projeto |
| `netimob-google` | `feature/google-ads-implementation` | Google Ads + TikTok — plano em `docs/PLANO_GOOGLE_TIKTOK.md` |
| `netimob-cherrypick` | `feature/mensageria-rag` | Mensageria M4.3 (RAG/Base de Conhecimento) — plano em `docs/PLANO_MENSAGERIA.md` |
| `netimob-imgfix` | `fix/next-image-minio-localhost` | Fix pontual — fotos de imóveis via MinIO |

**Nunca** trocar de branch (`git checkout`/`git switch`) nem rodar operações destrutivas
(`reset --hard`, `clean`, force-push) num diretório que tenha alterações não commitadas de
outra frente em andamento — preferir um `git worktree` separado pra qualquer trabalho que
precise de uma branch diferente da que já está checked-out no diretório atual.

---

## Documentação de referência

@docs/CHECKPOINT.md — Estado atual do projeto: última tarefa, em andamento, próximos passos.
@docs/ACCESS_CONTROL.md — Lógica completa de controle de acesso, provisionamento de features e sidebar dinâmica.
@docs/claude-memory/MEMORY.md — Índice da memória de contexto (perfil do dev, preferências de trabalho, decisões e regras de negócio acumuladas). Snapshot versionado da auto-memory do Claude — portável entre máquinas via git. Os arquivos detalhados ficam em `docs/claude-memory/`; leia sob demanda quando precisar do histórico/raciocínio por trás de uma decisão.

---

## Commands

```bash
# Desenvolvimento local (porta 3000)
npm run dev

# Build de produção
npm run build

# Lint
npm run lint

# Gerar nova senha com bcrypt
npm run generate-password

# Resetar ambiente (apaga node_modules + reinstala)
npm run clean
```

O servidor dev roda na porta `3000`. O container Docker de produção mapeia `3002 → 3000`.

---

## Infraestrutura Docker

```
netimobiliaria-db          postgres:17-alpine    localhost:15432
netimobiliaria-redis       redis:7-alpine        localhost:6380
netimobiliaria-minio       minio/minio           localhost:9000-9001
netimobiliaria-app         (prod)                localhost:3002
netimobiliaria-feed        (feed worker)
netimobiliaria-lead-worker (lead worker)
```

Acesso direto ao banco:
```bash
docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria

# Executar arquivo SQL
docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria < arquivo.sql
```

---

## Variáveis de Ambiente (`.env.local`)

```env
# PostgreSQL principal
DB_HOST=127.0.0.1
DB_PORT=15432
DB_NAME=net_imobiliaria
DB_USER=postgres
DB_PASSWORD=<senha>

# PostgreSQL para o módulo de campanhas (mesmo banco, schema diferente)
MARKETING_DATABASE_URL=postgresql://postgres:<senha>@127.0.0.1:15432/net_imobiliaria

# Autenticação
JWT_SECRET=<chave-hex>
JWT_EXPIRES_IN=24h

# LLM (fallback global — substituído por config por tenant)
ANTHROPIC_API_KEY=<chave>
GEMINI_API_KEY=<chave>

# Cron (header x-cron-secret nos endpoints /api/cron/*)
CRON_SECRET=<segredo>

# Notificações (Evolution API para WhatsApp, opcional)
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=trafegopago
SLACK_WEBHOOK_URL=

# Meta Marketing API (fallback global)
META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=

# Agente autônomo
AGENT_CONFIDENCE_THRESHOLD=0.85
AGENT_SYNC_SCHEDULE=0 */6 * * *
BRIEFING_MORNING_SCHEDULE=0 8 * * *
BRIEFING_CLOSING_SCHEDULE=0 18 * * *
```

---

## Arquitetura Geral

### Next.js 14 App Router — Estrutura

```
src/
  app/
    admin/                   → Painel administrativo (CRM, imóveis, etc.)
      campanhas/             → Módulo de Tráfego Pago
        dashboard/page.tsx
        leads/page.tsx
        criativos/page.tsx
        configuracoes/page.tsx
    api/
      admin/campanhas/       → API REST do módulo de campanhas
      admin/auth/            → Login, 2FA, sessões
      agent/                 → Aprovação/rejeição de ações do agente
      cron/campanhas/        → Endpoints de agendamento (cron)
  lib/
    marketing/
      prisma.ts              → Prisma client do schema campanhasmarketingdigital
      services/              → Serviços de negócio do módulo de campanhas
    database/connection.ts   → Pool pg para o schema public
    auth/jwt-node.ts         → Verificação de token nas API routes
    marketing-api.ts         → Client-side fetch (axios) para todas as APIs de campanhas
    marketing-utils.ts       → Formatadores e constantes de UI
  components/
    marketing/               → Componentes React do módulo
      charts/                → MultiMetricChart, FunnelChart, PredictionChart
      CampaignWizard.tsx     → Wizard de criação de campanha (multi-step)
  middleware.ts              → Proteção de rotas /admin e /crm
```

### Two-Schema PostgreSQL

O banco `net_imobiliaria` tem dois schemas com responsabilidades distintas:

| Schema | Responsável por | Acesso |
|--------|----------------|--------|
| `public` | CRM, imóveis, usuários, tenants, auth, sidebar | Pool `pg` direto + Prisma padrão |
| `campanhasmarketingdigital` | Campanhas, insights, leads, briefings, agente, LLM | Prisma com PrismaPg adapter + Pool `pg` direto |

### ⚠️ CRÍTICO — Nunca executar `prisma db push`

O `prisma.config.ts` não tem schema qualifier. Executar `db push` tenta sincronizar tudo e **derrubaria tabelas de produção** (imoveis, users, leads_kanban, etc.). Toda DDL é feita com SQL direto:
```bash
docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria < prisma/seed-xxx.sql
```

### Dois Clientes Prisma

```
@/lib/database/users.ts     → Prisma padrão (schema: public, via DATABASE_URL)
@/lib/marketing/prisma.ts   → PrismaClient + PrismaPg adapter
                               (search_path = campanhasmarketingdigital)
                               Singleton global via globalForPrisma para evitar
                               múltiplas instâncias no hot-reload do Next.js dev
```

### ⚠️ Settings — Raw SQL Obrigatório

A tabela `campanhasmarketingdigital."Settings"` usa `pool.query()` diretamente (não Prisma) para evitar cache de modelo stale em hot-reload:

```typescript
// Correto
await pool.query(
  `SELECT ... FROM campanhasmarketingdigital."Settings" WHERE tenant_id = $1::uuid`,
  [tenantId]
);

// Errado — pode falhar com modelo stale se não reiniciar o servidor
await prisma.settings.findFirst({ where: { tenantId } });
```

---

## Convenções de UI — Obrigatórias

### Datas — formato dd/mm/aaaa

**NUNCA usar `<input type="date">`** em nenhuma página da aplicação.
O input nativo exibe o formato do sistema operacional (mm/dd nos EUA) e foge do padrão brasileiro.

**SEMPRE usar o componente `<DateInputPtBR>`:**
```tsx
import DateInputPtBR from '@/components/ui/DateInputPtBR';

// value = ISO string (YYYY-MM-DD) ou ''
// onChange = recebe ISO string quando completo
<DateInputPtBR
  value={startDate}
  onChange={iso => setStartDate(iso)}
  className={inputCls}
/>
```

O componente fica em `src/components/ui/DateInputPtBR.tsx` e:
- Exibe e aceita entrada no formato `dd/mm/aaaa` com máscara automática
- Comunica com o estado em formato ISO `YYYY-MM-DD` (compatível com todos os `<input type="date">` substituídos)
- Sincroniza quando o valor externo muda (ex.: botões de período)

---

## Módulo de Tráfego Pago

### Páginas

```
/admin/campanhas/               → redirect para /dashboard
/admin/campanhas/dashboard      → KPIs, gráficos, insights IA, briefing, predições
/admin/campanhas/leads          → lista leads + filtros + gráficos
/admin/campanhas/criativos      → galeria de imagens + CampaignWizard
/admin/campanhas/configuracoes  → Meta API, WhatsApp, LLM (provider/model/key)
```

### API Routes (`/api/admin/campanhas/`)

```
settings                  GET/PUT  → Meta (public.tenants) + paths (Settings)
settings/llm              GET/PUT  → provider/model/apiKey por tenant
settings/llm/models       GET      → catálogo da tabela LlmModel
settings/llm/test         POST     → testa conexão LLM
settings/whatsapp         GET/PUT
settings/whatsapp/test-briefing  POST

campaigns                 GET/POST
campaigns/[id]/status     PATCH    → ativa/pausa
campaigns/[id]            DELETE

insights                  GET      → métricas brutas
insights/sync             POST     → sincroniza com Meta API
insights/ai               GET      → insights rule-based (sem LLM)

leads                     GET
leads/stats               GET

dashboard/full            GET      → totais, insights, leads, campanhas, funil
dashboard/predictions     GET      → série temporal + previsões lineares

briefings                 GET/POST
briefings/latest          GET
briefings/generate        POST     → gera com LLM ou fallback rule-based

clients                   GET      → clientes do tenant (schema public)
criativos                 GET
meta/targeting/interests  GET      → Graph API
meta/targeting/locations  GET      → Graph API
```

### Criação de Campanha — Body FLAT

O `POST /campaigns` espera **corpo plano** (não nested):
```json
{
  "name": "Campanha", "objective": "OUTCOME_LEADS", "clientId": null,
  "adSetName": "Grupo", "dailyBudget": 5000, "startTime": "ISO",
  "ageMin": 25, "ageMax": 55, "genders": [1,2], "locations": [],
  "scheduleDays": [1,2,3,4,5],
  "creativeType": "IMAGE", "images": ["caminho/foto.jpg"],
  "body": "Texto", "headline": "Título", "ctaType": "WHATSAPP_MESSAGE"
}
```

---

## Multi-Tenant e Filtro de Clientes

Todos os dados têm `tenant_id`. O `tenantId` vem do JWT cookie `admin_auth_token` via `getTokenPayload(request)`.

### ClientId Filter (já implementado no backend)

O tenant gerencia campanhas **próprias** e de seus **clientes**. O parâmetro `clientId`:
- Ausente → retorna tudo (próprias + clientes)
- `own` → apenas campanhas sem clientId (próprias do tenant)
- `<uuid>` → apenas campanhas daquele cliente

Implementado nas APIs: `campaigns`, `insights`, `leads`, `leads/stats`, `dashboard/full`, `dashboard/predictions`, `insights/ai`, `briefings`. O tipo `ClientFilter = string | 'own' | undefined` está em `marketing-api.ts`.

### Seletor de Cliente nas UIs — ✅ concluído

Todas as páginas do módulo com dado por-cliente já usam `ClientSelector`/`useClientSelector`
(`src/components/marketing/ClientSelector.tsx`): `dashboard`, `leads`, `criativos`,
`criativos/padroes`, `iniciativas`, `desperdicio`, `portfolio`, `auditoria`, `publicacoes`,
`cta-analytics`. Páginas sem seletor são assim por design (config global/tenant, fila de
aprovação já agrupada por cliente, comparação cross-cliente por segmento, ou o picker
próprio do `CampaignWizard` pra escolher o destino de uma campanha nova).

---

## LLM Multi-Provider

### Factory (`src/lib/marketing/services/llmClient.ts`)

```typescript
interface LlmClient { provider: string; model: string; complete(prompt, maxTokens?): Promise<string> }
getLlmClient(tenantId?: string | null): Promise<LlmClient>
```

Lógica: lê config do tenant na `Settings` → `anthropic` usa `@anthropic-ai/sdk` nativo, todos os outros usam `openai` SDK com `baseURL` lido da tabela `LlmModel`. Fallback: `ANTHROPIC_API_KEY` do env.

### Catálogo `campanhasmarketingdigital."LlmModel"`

Novos providers/modelos adicionados via **SQL INSERT** — sem alteração de código:
```sql
INSERT INTO campanhasmarketingdigital."LlmModel"
  (id, provider, provider_label, model_id, model_label, base_url,
   quality_score, is_free, context_window, is_recommended, sort_order)
VALUES (gen_random_uuid(), 'groq', 'Groq', 'llama-3.1-70b-versatile',
        'LLaMA 3.1 70B', 'https://api.groq.com/openai/v1', 4, false, 128000, false, 1);
```

Providers ativos (23 modelos): `anthropic`, `openai`, `gemini`, `groq`, `deepseek`, `openrouter`, `kimi`, `qwen`.

---

## Agente Autônomo

```
agentMonitor.ts (cron a cada 6h)
  → syncMetrics()              puxa métricas de todos os tenants ativos do Meta API
  → runDecisor(tenantId)       para cada tenant:
      → generateAiInsights()   regras determinísticas (sem LLM)
      → confidence >= 0.85?    filtra
      → enrichWithClaude()     melhora descrição com LLM
      → cria AgentAction
      → PAUSE/ALERT            → PENDING_APPROVAL → notifica WhatsApp com link
      → SCALE/OPTIMIZE         → PENDING_EXECUTION → executa direto
```

Aprovação via links: `GET /api/agent/approve/[id]` e `GET /api/agent/reject/[id]` (sem JWT, autenticados pelo UUID da ação, retornam HTML).

Cron endpoints (header `x-cron-secret`):
- `POST /api/cron/campanhas/sync` → sync métricas + decisor para todos os tenants
- `POST /api/cron/campanhas/briefing` → gera briefing + envia WhatsApp/Slack

---

## Insights de IA (Rule-Based, sem LLM)

`aiInsights.ts` avalia as últimas 14 entradas de `Insight` por campanha:

| Tipo | Condição |
|------|----------|
| `PAUSE` | CTR < 1% por ≥ 3 dias, ou gasto > R$50 sem leads |
| `SCALE` | leads > 5 e CTR > 2% |
| `ALERT` | frequência > 3, ou CPC com tendência de alta ≥ 15% |
| `OPTIMIZE` | CPL > R$20 com pelo menos 1 lead |

CTR armazenado como **percentual** (ex: `1.8` = 1.8%), CPC e spend em **reais**. Tendência calculada comparando metade recente vs. metade antiga do histórico (últimos 14 dias).

Visualizados no Dashboard em **"Insights da IA"** (cards coloridos) e **"Briefing Estratégico AI"** (gerado por LLM com fallback rule-based).

---

## Autenticação

Cookie `admin_auth_token` com JWT (24h). O middleware verifica apenas o formato (3 partes); a expiração real é verificada por `verifyTokenNode()` em cada API route.

Gerar token manualmente para testes (Node.js):
```javascript
const jwt = require('jsonwebtoken');
const token = jwt.sign({
  userId: '<uuid>', username: 'admmd', tenantId: '<uuid-tenant>',
  role_name: 'ADMIN', role_level: 99, is_system_role: true,
  permissoes: {}, auditConfigs: []
}, process.env.JWT_SECRET, { expiresIn: '24h' });
```

Tenant de desenvolvimento: `efbf62cf-9e28-4b31-a4f6-82a037412353` (Marketing Digital, user `admmd`).

---

## Dados de Demonstração

```bash
# 5 campanhas com 44 dias de histórico + 785 leads (dispara todos os tipos de insight)
docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria < prisma/seed-demo-campaigns.sql

# 23 modelos LLM em 8 providers
docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria < prisma/seed-llm-models.sql
```

O seed é **idempotente** — pode ser re-executado sem duplicar dados.

---

## Sidebar (Menu Lateral)

O menu é dinâmico, lido de `public.sidebar_menu_items`. Módulo de Tráfego Pago (IDs 110–114, `order_index: 14`):

```sql
-- Para adicionar novos itens:
INSERT INTO public.sidebar_menu_items (name, icon_name, url, parent_id, order_index, is_active)
VALUES ('Nova Página', 'IconName', '/admin/campanhas/nova', 110, 5, true);
```

---

## Pendências e Próximos Passos

### 1. Redesign Premium — Ativar skill `impeccable`

As interfaces atuais são funcionais mas convencionais. Para elevar o nível visual:
```
/impeccable
```
Revisar com foco em: `dashboard/page.tsx`, `leads/page.tsx`, `criativos/page.tsx`, `configuracoes/page.tsx`, `src/components/marketing/` (charts + CampaignWizard).

### 2. Outras Pendências

- **Sync Meta real**: validar `POST /insights/sync` com token de produção e campanhas reais
- **Fluxo completo do CampaignWizard**: publicação no Meta após upload de criativos
- **Alerta de token Meta expirando**: `meta_token_expires_at` existe no tenant, falta notificação na UI
- **Endpoint CPL por período**: não existe — agregar `spend / count(leads)` por intervalo de datas
