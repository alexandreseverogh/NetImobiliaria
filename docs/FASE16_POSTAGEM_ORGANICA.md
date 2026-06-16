# FASE 16 — Postagem Orgânica no Meta

> **Status:** EM DESENVOLVIMENTO — 16.A–16.E ✅ (fundação, FB/IG feed, vídeo/Reels/Stories, UX premium). 16.F pendente (agendamento + calendário + insights).
> **Pré-requisito:** FASE 1 (credenciais Meta de 3 camadas — entregue).
> **Nota de escopo:** 16.C foi entregue para mídia via **URL pública** (IG aceita direto). O **object storage (S3/R2)** passou a ser pré-requisito apenas do fluxo futuro "publicar a partir da biblioteca" (upload de assets locais), não da publicação por URL.
> **Prioridade:** 4 · **Duração estimada:** ~3–4 dias úteis distribuídos nas sub-fases.

---

## 1. Objetivo e princípios

Publicar criativos **organicamente** (sem impulsionar) em **Página do Facebook** e **Instagram Business**, nutrindo presença entre campanhas pagas. Hoje TODA publicação é paga.

Princípios:
- **Separação total do fluxo pago** — zero adset/targeting/budget. Caminho, permissão e UI próprios.
- **Zero hardcode** — credenciais e identidade resolvidas pela cascata existente (cliente → tenant).
- **Conteúdo público = ação irreversível** → confirmação dupla + permissão dedicada + auditoria (`created_by`).

## 2. Formatos e regras da Meta (permitidos organicamente)

| Plataforma | Formato | Endpoint / fluxo | Restrições-chave |
|---|---|---|---|
| **FB Page** | Foto única | `POST /{page-id}/photos` (multipart ou `url`) | aceita upload binário direto |
| FB Page | Multi-foto | N `/photos` `published=false` → `/feed` com `attached_media` | ~10 itens |
| FB Page | Texto/Link | `POST /{page-id}/feed` (`message`, `link`) | — |
| FB Page | Vídeo | `POST /{page-id}/videos` | resumable p/ arquivos grandes |
| FB Page | Reels | `/{page-id}/video_reels` (upload session 3 passos) | vídeo 9:16 |
| FB Page | Stories | `/{page-id}/photo_stories` · `/video_stories` | efêmero 24h |
| **Instagram** | Imagem | container `POST /{ig-id}/media` (`image_url`) → `media_publish` | **`image_url` pública**; JPEG; ratio 4:5–1.91:1 |
| Instagram | Carrossel | N containers `is_carousel_item=true` → `CAROUSEL` → publish | **2–10 itens** |
| Instagram | Reels | container `media_type=REELS` (`video_url`) → publish | 9:16; aguardar `FINISHED` |
| Instagram | Stories | container `media_type=STORIES` → publish | efêmero |

**Regras operacionais:**
- **Page Access Token** — o token armazenado costuma ser de Usuário; postar na Página exige Page Token (`GET /{page-id}?fields=access_token`). Resolver e cachear.
- **Permissões do app Meta:** `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`, `instagram_basic`, `instagram_content_publish`, `business_management`.
- **Instagram exige URL pública de mídia** → depende de object storage (S3/R2). FB Page aceita upload binário.
- **Rate limit IG:** ~100 publicações/24h por conta — contador + bloqueio preventivo.
- **Legenda/hashtags:** ~2.200 chars, ~30 hashtags no IG.
- **Vídeo assíncrono:** containers ficam `IN_PROGRESS` → publicar só após `status_code=FINISHED` (polling com backoff).

## 3. Arquitetura técnica

### 3.1. Adapter — novos métodos em `MetaAdsAdapter`
```ts
resolvePageAccessToken(): Promise<string>            // user token → page token (cache)
publishToFacebookPage(input): Promise<OrganicResult> // photo|multi|text|video|reel|story
publishToInstagram(input): Promise<OrganicResult>    // container(s) → poll → media_publish
```
Sem tocar em `createCampaign`. Retorno: `{ platform, postId, permalink, status }`.

### 3.2. Serviço `organicPublishService.ts`
Resolve credenciais via `getNetworkServiceForTenant(tenantId, 'meta', clientId)`; valida formato × destino (fail-fast); persiste, publica, atualiza status, trata polling de vídeo; agenda via cron.

### 3.3. Modelo de dados — tabela própria (não reuso de `Ad`)
```sql
CREATE TABLE campanhasmarketingdigital."OrganicPost" (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  client_id        uuid,
  platform         varchar(20) NOT NULL,   -- facebook | instagram
  format           varchar(20) NOT NULL,   -- image|carousel|video|reel|story|text
  caption          text,
  media_urls       jsonb NOT NULL DEFAULT '[]',
  asset_ids        jsonb,
  status           varchar(20) NOT NULL DEFAULT 'DRAFT',
  external_post_id varchar(100),
  permalink_url    text,
  scheduled_at     timestamptz,
  published_at     timestamptz,
  error_message    text,
  created_by       uuid,
  created_at       timestamptz DEFAULT now()
);
```
Justificativa: `Ad` carrega semântica de adset/targeting paga; tabela própria = rastreabilidade limpa e relatório orgânico distinto.

### 3.4. API Routes
```
POST   /api/admin/campanhas/organic/publish   → publica ou agenda
GET    /api/admin/campanhas/organic           → lista (cliente/status/plataforma)
GET    /api/admin/campanhas/organic/[id]      → detalhe + insights básicos
DELETE /api/admin/campanhas/organic/[id]      → cancela agendado / remove rascunho
POST   /api/cron/campanhas/organic-publish    → dispara agendados (x-cron-secret)
```

## 4. UX/UI premium

- **Entrada:** na galeria de criativos, ação **"Publicar na página (orgânico)"** 📣 verde, distinta de "Lançar campanha (pago)" 🚀 indigo.
- **Composer "Nova Publicação":** editor à esquerda (mídia drag-reorder p/ carrossel, **destinos por toggle** FB/IG Feed/Reels/Stories com **badge de validação por formato**, legenda com contador + assistente de hashtags ≤30, agendamento com `DateInputPtBR`); **preview ao vivo** à direita em moldura de dispositivo (FB e IG). Rodapé com **badge de rate-limit IG** e **confirmação dupla**.
- **Página `/admin/campanhas/publicacoes`:** alternância lista ↔ calendário; cards com status (rascunho/agendado/publicado/falhou), permalink, métricas orgânicas básicas (`GET /{post-id}/insights`); re-tentar em falha.
- **Estética:** design system do dashboard (cards `rounded-2xl`, dark/light, Framer Motion, máscara pt-BR, skeletons).

## 5. Permissões, sidebar, segurança
- `system_feature` `publicacoes-organicas` (categoria 30) + `permissions` (read/create/execute) + `role_permissions` + `tenant_feature_overrides` (provisionamento deliberado).
- `CreateGuard resource="publicacoes-organicas"` no botão; `requireApiPermission` no POST; confirmação dupla; `created_by` para auditoria.

## 6. Sub-fases (incremental)

| Sub-fase | Entrega | Critério de aceite |
|---|---|---|
| **16.A** ✅ Fundação | Migração `OrganicPost` + `resolvePageAccessToken` + sidebar/permissões | token de página resolvido sem hardcode |
| **16.B** ✅ FB foto/texto | `publishToFacebookPage` + rota publish + composer mínimo | publica foto/texto, retorna `post_id` + permalink |
| **16.C** ✅ IG feed | `publishToInstagram` (container→poll→publish) imagem/carrossel via URL pública | publica imagem/carrossel no IG |
| **16.D** ✅ Vídeo/Reels/Stories | FB: /videos, video_reels e video_stories (upload hospedado 3 passos), photo_stories · IG: container REELS/STORIES/VIDEO com poll | reel publicado após `FINISHED` |
| **16.E** ✅ UX premium | composer 2 colunas, previews device-frame (FB/IG feed + 9:16 reel/story), badges de validação por formato, contador IG 24h, contador de hashtags | badges corretos por formato |
| **16.F** Agendamento + página | `SCHEDULED` + cron + `/publicacoes` | agendado publica no horário; insights exibidos |

Cada sub-fase: migração local → commit → checkpoint.

## 7. Riscos e mitigações
- **IG exige URL pública** → object storage é pré-requisito da 16.C (mesmo S3/R2 que destrava lançamento real e FASE 6.5). FB (16.B) começa antes, sem depender disso.
- **App Review da Meta** → `instagram_content_publish`/`pages_manage_posts` exigem revisão. Validar com app dev + página de teste; documentar checklist.
- **Token de página ausente/expirado** → reusar alerta de token expirando (pendência existente) + erro acionável.
- **Rate limit IG** → contador + bloqueio preventivo no composer.
- **Vídeo assíncrono** → polling com backoff + timeout; status `PUBLISHING` visível.

## 8. Fora de escopo (futuro)
Comentários/DMs, boost de orgânico → pago, cross-posting (Threads/LinkedIn), aprovação editorial multi-usuário.
