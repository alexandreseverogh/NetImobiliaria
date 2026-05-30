# CHECKPOINT — Estado Atual do Projeto

> **Atualizado em:** 2026-05-29
> **Propósito:** Garantir continuidade entre sessões, modelos, contas e computadores.
> **Regra:** atualizar ao final de cada sessão antes de fechar.

---

## Última tarefa concluída

### Centralização LLM das Campanhas (2026-05-28)

Implementado um único modelo de IA global para todos os insights de campanhas da plataforma:

- **`getLlmClientForCampaigns()`** em `src/lib/marketing/services/llmClient.ts`
  - Lê `campanhasmarketingdigital."Settings" WHERE tenant_id IS NULL`
  - Fallback para `ANTHROPIC_API_KEY` do env se nenhuma config global existir
- **3 pontos de chamada atualizados** para usar a função global:
  - `src/lib/intelligence/llmInvoker.ts`
  - `src/app/api/admin/campanhas/settings/llm/test/route.ts`
  - `src/app/api/admin/master/ia-plataforma/test/route.ts`
- **UI Master** criada em `src/app/admin/master/ia-plataforma/page.tsx`
  - GET/PUT em `/api/admin/master/ia-plataforma`
  - Teste de conexão em `/api/admin/master/ia-plataforma/test`
- **Sidebar** — item "IA da Plataforma" ativo via `system_features` (`category_id=22`, `url=/admin/master/ia-plataforma`)
- **SQL** — `database/migration-2026-05-llm-centralizacao.sql` (índice único + seed linha global)

### ModulesListModal — Componente Reutilizável (2026-05-28)

- Criado `src/components/admin/master/modules/ModulesListModal.tsx`
- Usado em `src/app/admin/master/tenants/page.tsx`

### Plano Mestre — Seção 1.6 adicionada (2026-05-29)

Documentada a **Camada Operacional de Lançamento de Campanhas** (subseções 1.6.1–1.6.13):
- Fronteira automático↔manual (2 baldes, sem camada semi)
- 3 "lares de dado" a criar: page_id/pixel/ig em credentials, network_defaults em system_segments, website em tenants/clientes
- Hotfixes pré-fase identificados: bug page_id, adset_schedule, interest IDs
- Fronteira on-the-fly (1.6.13): ~85–90% dinâmico nos campos; adapter é código irredutível
- Mescla aditiva: FASE 1 expande, FASE 5 → "Video + Conversão/ROI", FASE 11 só consome

---

## Tarefa concluída

### Implementação da Camada de Lançamento — FASE 1 Expandida (2026-05-29)

**Sequência executada:**

- [x] Checkpoint iniciado
- [x] **Migração DB** — executada via rota temporária (psql local + pool Prisma)
  - ✅ `system_segments.network_defaults JSONB` criada e seedada
  - ✅ `tenants.website TEXT` criada
  - ✅ `clientes.website TEXT` criada
  - ✅ GIN index `idx_system_segments_network_defaults` criado
  - ✅ Seeds aplicados: imobiliaria (HOUSING), carros, geral, master, saude
  - Slugs reais confirmados: `imobiliaria`, `carros`, `geral`, `master`, `saude`
- [x] **Hotfix 1** — bug `page_id` corrigido em `src/lib/marketing/networks/meta/metaAdsAdapter.ts`
  - `object_story_spec.page_id` agora usa `this.pageId` (das credentials) e não `this.adAccountId`
  - Lança erro claro se `page_id` não configurado
- [x] **Hotfix 2** — `adset_schedule` agora enviado ao Meta API
  - Método `buildAdsetSchedule()` converte `scheduleStartHour/End` → minutos Meta format
- [x] **Settings premium** — `src/app/admin/campanhas/configuracoes/page.tsx`
  - Seção "Identidade Meta" com page_id, pixel_id, instagram_actor_id, website
  - API: `src/app/api/admin/campanhas/settings/meta-identity/route.ts` (GET+PUT, JSONB merge)
- [x] **ClientSelector** — `src/components/marketing/ClientSelector.tsx` (ALTA PRIORIDADE)
  - Hook `useClientSelector(storageKey)` com sessionStorage persist
  - Integrado em `dashboard/page.tsx` e `leads/page.tsx`
- [x] **CampaignWizard** — `src/components/marketing/CampaignWizard.tsx`
  - `AutoChip` para campos auto-resolvidos
  - `autoFields` state via `getMetaIdentity()` + `/segment-defaults`
  - `StepObjective` com specialAdCategory, pixelId, customEventType
  - Prop `clientId` adicionada
- [x] **API segment-defaults** — `src/app/api/admin/campanhas/segment-defaults/route.ts`
  - Resolução automática pelo segmento do tenant/cliente
  - Fallback gracioso (não quebra wizard)
- [x] **Factory** — `resolveSegmentNetworkDefaults()` em `src/lib/marketing/networks/factory.ts`
- [x] **campaigns/route.ts** — `pixelId` e `customEventType` passados para `networkService.createCampaign()`
- [x] Arquivo temporário `_run_migration.js` removido

**Arquivo de migração:** `prisma/migration-2026-05-29-launch-layer.sql`

---

## Última entrega — Camada 3 (clientes) — 2026-05-29

- ✅ `clientes.page_id TEXT`, `clientes.pixel_id TEXT`, `clientes.instagram_actor_id TEXT` — migração executada
- ✅ API `GET/PUT /api/admin/clientes/[id]/campaign-settings`
- ✅ Página `/admin/clientes/[id]` refatorada com tabs: "Dados do Cliente" | "Configurações Meta"
  - `CampaignField` com indicador "próprio" vs "usando tenant"
  - Barra de progresso de completude
  - Info bar com fallbacks do tenant
- ✅ `getNetworkServiceForTenant()` aceita `clientId` — cascata: `client.page_id ?? tenant.page_id`
- ✅ `campaigns/route.ts` passa `clientId` para cascata de credenciais

## Arquitetura de 3 camadas — COMPLETA

| Camada | Config | UI | Status |
|--------|--------|----|--------|
| **Master** | LLM global | `/admin/master/ia-plataforma` | ✅ |
| **Tenant** | Meta credentials, website, segment | `/admin/campanhas/configuracoes` → Identidade Meta | ✅ |
| **Cliente** | page_id, pixel_id, instagram, website (override) | `/admin/clientes/{id}` → aba Configurações Meta | ✅ |

## Última entrega — Fluxo de Lançamento Unificado (2026-05-29)

- ✅ **`/admin/campanhas/nova`** refatorado como Fase 1 (Criativos) + Fase 2 (Wizard)
  - Seleção de pasta via File System Access API (Chrome/Edge) com fallback `webkitdirectory`
  - Grid de imagens com seleção múltipla (máx 6) e thumbnails no footer
  - Seção "Para quem?" exibida **apenas para tenants** (oculta para Master)
  - `CreateGuard` **removido** do botão "Configurar Campanha" — era o bug que ocultava o botão para Master
  - `contextReady` como única guarda de negócio: `isMaster || campaignFor === 'own' || !!selectedClientId`
- ✅ **`/admin/campanhas/criativos`** substituído por redirect para `/nova`
- ✅ **`/api/admin/auth/me`** — campo `is_system_role` adicionado ao `userResponse`
- ✅ **`isMaster` detection** — `user?.is_system_role` + localStorage fallback (login sempre tem `is_system_role`)

### Bugs corrigidos

| Bug | Causa | Fix |
|-----|-------|-----|
| "Para quem?" aparecia para Master | `is_system_role` não retornado por `/me` | Adicionado ao `userResponse` + fallback localStorage |
| Botão "Configurar Campanha" ausente/desabilitado para Master | `CreateGuard resource="campanhas"` retornava null (sem permissão explícita na DB) | Removido `CreateGuard` — `disabled={!contextReady}` suficiente |

## Última entrega — Interesses Meta reais + Curadoria por segmento (2026-05-30)

### Problema resolvido
Os interesses no wizard usavam IDs fake (strings textuais) que o Meta ignorava silenciosamente.
Interesses agora usam IDs numéricos reais da Meta Targeting Search API.

### O que foi implementado
- **`/api/admin/campanhas/interests/search`** — busca real na Meta Graph API (`/search?type=adinterest&locale=pt_BR`); fallback gracioso se token não configurado
- **`InterestsPicker`** reescrito — busca com debounce 350ms, exibe audience size real, interesses livres como fallback
- **`InterestsPicker`** colapsado em "Avançado" — com banner explicando impacto variável (especialmente HOUSING)
- **`suggestedInterests` por segmento** — `network_defaults.meta.suggested_interests` em `system_segments`
  - `resolveSegmentNetworkDefaults` retorna `suggestedInterests[]`
  - Wizard carrega e exibe chips ⚡ do segmento antes da busca livre
- **`/api/admin/master/segments/[id]/interests`** (GET + PATCH) — Master gerencia seeds por segmento
- **`SegmentInterestsModal`** — modal na página `/admin/master/segmentos` com busca Meta API + salvar
- **Página de Segmentos do Master** — botão "✨ Interesses Meta" por segmento

### Fluxo de curadoria pelo Master
1. `/admin/master/segmentos` → clicar "Interesses Meta" no segmento
2. Modal abre → busca na Meta API → clica para adicionar → salva
3. Todos os tenants daquele segmento passam a ver os chips sugeridos no wizard

## Próximos passos imediatos

1. Testar fluxo completo Master: selecionar criativos → "Configurar Campanha" → Wizard → lançar
2. Master adicionar interesses via modal de segmentos (validar que chips aparecem no wizard)
3. Testar fluxo Tenant: "Para um Cliente" → selecionar cliente → criativos → lançar
4. Remover item "IMPORTAÇÃO DE CRIATIVOS" do sidebar (agora redirecionado; item confuso)
5. **FASE 4** do plano mestre (Campaign State Machine)

---

## Decisões tomadas em 2026-05-29

| Decisão | Racional |
|---------|----------|
| Mescla ADITIVA ao plano mestre | Seção 1.6 acrescentada, FASES 0–11 intactas |
| Fronteira on-the-fly: ~85–90% dinâmico | Campos guiados por field schema; adapter é código irredutível |
| `network_defaults` em `system_segments` | Curadoria 1x pelo Master, keyed por rede, resolve por segmento |
| `website` como coluna em tenants + clientes | Client-owned site nunca hardcoded; pré-preenche na UI |
| Sem camada "semi-auto" | Só 2 baldes: automático (vem do banco) ou manual (informado na UI) |
| YouTube = canal sob Google Ads | Sem row separado em ad_networks; mesmo adapter/credentials |

---

## Pendências anteriores (ainda abertas)

- **Auditoria de permissões CRUD** — `CreateGuard`/`UpdateGuard`/`DeleteGuard` criados, apenas `clientes` protegido. Os demais 30+ módulos ainda sem proteção.
- **Sync Meta real** — validar `POST /insights/sync` com token de produção.
- **Alerta de token Meta expirando** — campo `meta_token_expires_at` existe no tenant, falta notificação na UI.
- **Endpoint CPL por período** — não existe, agregar `spend / count(leads)` por intervalo de datas.

---

## Referências

- `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` — Plano completo das 11 fases (versão 1.3.1)
- `docs/ACCESS_CONTROL.md` — Lógica de controle de acesso e sidebar
- `CLAUDE.md` — Documentação técnica principal (arquitetura, APIs, infra)
