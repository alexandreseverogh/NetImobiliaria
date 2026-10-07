## Deploy na VPS (Hostinger)

Este diretório contém scripts **Linux** (bash) para subir e manter a aplicação na VPS.

Arquivos principais (1 VPS, 2 ambientes):
- `deploy.sh`: build + up do stack completo (`docker-compose.vps.yml` + `.env.vps`)
- `status.sh`: status rápido + últimos logs dos feeds
- `force-feed-sync.sh`: força ciclo do feed (criar jobs + processar)
- `restore-into-container.sh`: restore de dump no Postgres (prod|staging) e aplica migrations
- `apply-migrations.sh`: aplica migrations idempotentes (prod|staging)

Scripts legados (deprecados, mantidos por compatibilidade):
- `deploy-prod.sh` e `deploy-staging.sh` agora chamam `deploy.sh`

Pré-requisitos na VPS:
- Docker + Docker Compose v2
- Git

**Serviços de infra que NÃO entram no deploy automático** (`deploy-github.sh` sobe só
`prod_app`/`prod_feed` ou `staging_app`/`staging_feed` por nome) — rebuild manual quando o
`Dockerfile` deles mudar:
- `evolution_api` — `docker compose -f docker-compose.vps.yml up -d --build evolution_api`
- `minio` (buildado de `docker/minio/Dockerfile`, direto da fonte oficial — ver comentário no
  `docker-compose.vps.yml` e `docs/CHECKPOINT.md`, entrada 2026-10-06) —
  `docker compose -f docker-compose.vps.yml up -d --build minio`. **Compartilhado entre
  produção e staging** (1 único container/volume) — recriar afeta as duas, não é isolável.


