---
name: project_fase16_organico
description: FASE 16 concluída — Postagem Orgânica no Meta (FB + IG), agendamento, MinIO upload, página /publicacoes
metadata:
  type: project
---

## FASE 16 — Postagem Orgânica no Meta ✅ CONCLUÍDA (2026-06-15)

### O que foi implementado

**Tabela DB:** `campanhasmarketingdigital."OrganicPost"` (16 campos + `media_kind`)
**Migração aplicada localmente:** `prisma/migration-2026-06-15-fase16-organic.sql` + `migration-2026-06-15-fase16f-schedule.sql`
**Pendente VPS:** aplicar migrações acima no banco de produção.

### Rotas de API

| Rota | Método | Função |
|---|---|---|
| `/api/admin/campanhas/organic` | GET | Lista posts com filtros |
| `/api/admin/campanhas/organic/publish` | POST | Publica ou agenda |
| `/api/admin/campanhas/organic/upload` | POST | Upload de mídia para MinIO |
| `/api/admin/campanhas/organic/[id]` | DELETE | Cancela/remove DRAFT/SCHEDULED/FAILED |
| `/api/admin/campanhas/organic/[id]/insights` | GET | Métricas orgânicas do post publicado |
| `/api/cron/campanhas/organic-publish` | POST | Dispara posts agendados (a cada 5min) |

### Formatos suportados

| Plataforma | Formatos |
|---|---|
| Facebook | text, image, carousel, video, reel, story (foto+vídeo) |
| Instagram | image, carousel, video, reel, story |

### Fluxo de publicação Instagram

Instagram exige **URL pública** — não aceita upload binário direto.
O fluxo é: upload MinIO → URL pública → Meta API cria container → poll `FINISHED` → `media_publish`.

Para Facebook foto: aceita upload binário direto OU URL pública.

### Page Access Token

Resolvido via `resolvePageAccessToken()` no `MetaAdsAdapter`:
1. Token do usuário → `GET /{page-id}?fields=access_token`
2. Fallback → `GET /me/accounts`
3. Cache por instância do adapter

### Agendamento

- `scheduledAt` no futuro → status `SCHEDULED`
- Cron `*/5 * * * *` chama `POST /api/cron/campanhas/organic-publish`
- `runDueScheduledPosts()` busca posts `SCHEDULED` com `scheduled_at <= now()` e publica
- Registrado em `scripts/feed-cron-scheduler.js`

### Upload de mídia

`POST /api/admin/campanhas/organic/upload` (multipart):
- Aceita: JPEG, PNG, WebP, GIF, MP4, MOV, WebM (máx 50 MB)
- Salva em MinIO com key `organic/<tenantId>/<uuid>.<ext>`
- Usa `src/lib/storage/s3-client.ts` — [[project_storage_minio]]
- Retorna URL pública via `CDN_URL`

### UI — página `/admin/campanhas/publicacoes`

- Composer 2 colunas: editor + preview ao vivo (FB card, IG card, 9:16 Reels/Stories)
- Drop zone para upload local com drag-and-drop
- Validações por formato (badges check/warn)
- Contador rate-limit IG (100/24h)
- Contador de hashtags (≤30)
- Toggle Lista ↔ Calendário mensal
- Insights on-demand para posts publicados

### Permissões

Feature `publicacoes-organicas` (id=104, category_id=30):
- `permissions`: read (id=932), create (933), execute (934)
- Provisionado para tenant "Marketing Digital" via migration

### Pré-requisitos para produção

1. App Meta aprovada para `pages_manage_posts` + `instagram_content_publish`
2. `page_id` configurado nas credenciais do tenant/cliente
3. Migrações de banco aplicadas na VPS (lote pendente)
