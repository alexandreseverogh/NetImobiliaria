---
name: project_deploy_vps
description: Processo completo de deploy na VPS — script automatizado, docker-compose, MinIO, Caddy, CDN_URL
metadata:
  type: project
---

## Deploy na VPS — totalmente automatizado

**Script único:** `./scripts/deploy.sh`
**Atualização de versão:** `./scripts/deploy.sh --update`

### Primeiro deploy (3 comandos na VPS)

```bash
git clone https://github.com/alexandreseverogh/NetImobiliaria .
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

O script pergunta apenas **3 itens**:
1. Domínio de produção (`app.exemplo.com.br`)
2. Domínio de staging (sugerido automaticamente como `staging.exemplo.com.br`)
3. E-mail para Let's Encrypt

Tudo o mais é gerado automaticamente:
- `PROD_JWT_SECRET` → `openssl rand -hex 64`
- `MINIO_ROOT_PASSWORD` → `openssl rand -base64 24`
- `REDIS_PASSWORD` → `openssl rand -base64 24`
- `PROD_CRON_SECRET` → `openssl rand -hex 32`
- `CDN_URL` → derivado do `PROD_DOMAIN` no docker-compose.vps.yml
- Buckets MinIO + política pública → `mc anonymous set download`
- Certificado HTTPS → Caddy + Let's Encrypt automático

### O que o script faz (em ordem)

1. Verifica dependências (docker, openssl)
2. Gera `.env` com `chmod 600` (nunca commitado — está no `.gitignore`)
3. `docker compose -f docker-compose.vps.yml build + up -d`
4. Aguarda healthcheck do `prod_app` (máx 120s)
5. Inicializa buckets MinIO via `mc` dentro do container

### Atualização de versão

```bash
git pull && ./scripts/deploy.sh --update
```

`--update` rebuild apenas `prod_app` / `prod_feed` / `staging_app` / `staging_feed`
sem recriar db, minio, redis ou apagar o `.env`.

### Arquivos envolvidos

| Arquivo | Papel |
|---|---|
| `scripts/deploy.sh` | Script principal de deploy |
| `docker-compose.vps.yml` | Orquestração de todos os serviços |
| `ops/Caddyfile` | Reverse proxy + HTTPS + rota MinIO |
| `.env.example` | Template documentado de todas as vars |
| `.env` | Gerado automaticamente — NUNCA commitado |

### Estrutura dos serviços na VPS

```
Caddy (80/443)
  ├── {PROD_DOMAIN}           → prod_app:3000
  ├── {PROD_DOMAIN}/storage/* → minio:9000   (imagens públicas)
  └── {STAGING_DOMAIN}        → staging_app:3000
      └── /storage/*          → minio:9000

prod_app   → prod_db (postgres:17) + redis + minio
staging_app → staging_db + redis + minio
prod_feed  → node scripts/feed-cron-scheduler.js
```

### CDN_URL — como funciona

No `docker-compose.vps.yml`, `CDN_URL` é composto automaticamente:
```yaml
CDN_URL: https://${PROD_DOMAIN}/storage/${S3_BUCKET_PROD:-netimobiliaria-prod}
```

O Caddy intercepta `/storage/*` e roteia para `minio:9000` internamente.
O MinIO **não é exposto** na internet — apenas via Caddy com HTTPS.

**Why:** sem `CDN_URL` correto, `getS3Url()` retornaria `http://minio:9000/...`
(endereço interno Docker), inacessível ao browser do usuário.

**How to apply:** qualquer novo módulo que precise de URLs de mídia pública
deve usar `getS3Url(key)` de `src/lib/storage/s3-client.ts` — nunca
construir a URL manualmente.
