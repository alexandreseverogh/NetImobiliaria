#!/usr/bin/env bash
set -euo pipefail

# =============================================================
# deploy-github.sh — Deploy Automatizado (chamado pelo GitHub Actions via SSH)
#
# Uso: ./deploy-github.sh <branch> <ambiente>
#
# Ambientes: producao | staging
#
# Variáveis de ambiente esperadas (injetadas pelo GitHub Actions, via Settings →
# Secrets and variables → Actions do repositório — nunca hardcoded aqui):
#   ANTHROPIC_API_KEY, GEMINI_API_KEY,
#   EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE,
#   SLACK_WEBHOOK_URL,
#   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_SERVICE_ACCOUNT_KEY,
#   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM_NAME
# =============================================================

BRANCH=${1:-main}
AMBIENTE=${2:-producao}
BASE_DIR="$HOME/net-imobiliaria"
SOURCES_DIR="$HOME/net-imobiliaria-sources"
LOG_FILE="$BASE_DIR/deploy.log"
COMPOSE_FILE="$BASE_DIR/docker-compose.vps.yml"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

log() { echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"; }

log "============================================"
log "🚀 DEPLOY INICIADO"
log "   Branch:   $BRANCH"
log "   Ambiente: $AMBIENTE"
log "============================================"

# ── 0. Validação de segurança ─────────────────────────────────
if [ "$AMBIENTE" == "producao" ] && [ "$BRANCH" != "main" ]; then
  log "❌ BLOQUEADO: Apenas 'main' pode ir para produção. Use 'staging' para '$BRANCH' primeiro."
  exit 1
fi

# ── 1. Atualizar código fonte ─────────────────────────────────
mkdir -p "$SOURCES_DIR"
TARGET_SOURCE="$SOURCES_DIR/$BRANCH"

log "[1/5] Atualizando código fonte da branch '$BRANCH'..."
if [ -d "$TARGET_SOURCE/.git" ]; then
  cd "$TARGET_SOURCE"
  git fetch origin
  git checkout "$BRANCH"
  git reset --hard "origin/$BRANCH"
  git clean -fd
else
  git clone -b "$BRANCH" https://github.com/alexandreseverogh/NetImobiliaria.git "$TARGET_SOURCE"
fi
log "   ✅ Código: $(cd "$TARGET_SOURCE" && git log -1 --pretty='%h — %s')"

# Sincronizar migrations (AS TRÊS pastas — ver apply-migrations.sh pro porquê de três)
mkdir -p "$BASE_DIR/database/migrations_docker"
rsync -a --delete "$TARGET_SOURCE/database/migrations_docker/" "$BASE_DIR/database/migrations_docker/"

mkdir -p "$BASE_DIR/migrations"
rsync -a --delete "$TARGET_SOURCE/migrations/" "$BASE_DIR/migrations/"

# prisma/ tem os arquivos .sql de migration REAL do projeto (schema.prisma etc. também vêm
# junto, sem problema — apply-migrations.sh só processa o que casa com migration-*.sql).
mkdir -p "$BASE_DIR/prisma"
rsync -a --delete "$TARGET_SOURCE/prisma/" "$BASE_DIR/prisma/"

# Sincronizar ops/ (Caddyfile, etc.)
CADDYFILE_CHANGED=false
if [[ -d "$TARGET_SOURCE/ops" ]]; then
  mkdir -p "$BASE_DIR/ops"
  if ! diff -q "$TARGET_SOURCE/ops/Caddyfile" "$BASE_DIR/ops/Caddyfile" >/dev/null 2>&1; then
    CADDYFILE_CHANGED=true
  fi
  rsync -a --delete "$TARGET_SOURCE/ops/" "$BASE_DIR/ops/"
fi

log "   ✅ Migrations e infra sincronizados"

# Achado real (2026-09-16): nada aqui nunca recarregava o Caddy depois de sincronizar um
# Caddyfile novo — mudança de domínio/rota só valeria a partir do PRÓXIMO restart manual do
# container. Reload é sem downtime (caddy valida a config antes de trocar; se o container
# ainda não existe — 1º bootstrap — o `docker compose up -d` completo do fim do script já
# sobe com o Caddyfile certo, então o best-effort aqui nunca bloqueia nada).
if [[ "$CADDYFILE_CHANGED" == true ]]; then
  log "[*] Caddyfile mudou — recarregando (sem downtime)..."
  docker compose -f "$COMPOSE_FILE" exec -T caddy caddy reload --config /etc/caddy/Caddyfile \
    && log "   ✅ Caddy recarregado" \
    || log "   ⚠️  Reload do Caddy falhou (container ainda não existe? confira depois de subir o stack)"
fi

# ── 2. Atualizar secrets de app no .env da VPS ───────────────
log "[2/5] Atualizando secrets de app no .env da VPS..."

ENV_FILE="$BASE_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  log "   ⚠️  $ENV_FILE não encontrado. Execute scripts/deploy.sh primeiro para a configuração inicial."
  exit 1
fi

# Upsert: atualiza se existe, adiciona se não existe. Valor SEMPRE entre aspas
# simples — GOOGLE_SERVICE_ACCOUNT_KEY é um blob JSON real (espaço, aspas duplas,
# \n literal dentro da private_key) e um `sed`/`awk` com -v quebraria nele (awk -v
# interpreta \n como escape; sed com delimitador `|` quebraria se o valor tivesse
# `|`). Reescrita linha a linha em bash puro, sem interpretar nada do valor.
upsert_env() {
  local key="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    log "   ⚠️  $key está vazio — mantendo valor atual (se houver)"
    return
  fi
  local quoted="'${value//\'/\'\\\'\'}'"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    local tmp_file
    tmp_file="$(mktemp)"
    local line
    while IFS= read -r line || [[ -n "$line" ]]; do
      if [[ "$line" == "${key}="* ]]; then
        printf '%s=%s\n' "$key" "$quoted" >> "$tmp_file"
      else
        printf '%s\n' "$line" >> "$tmp_file"
      fi
    done < "$ENV_FILE"
    mv "$tmp_file" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$quoted" >> "$ENV_FILE"
  fi
}

upsert_env "ANTHROPIC_API_KEY"          "${ANTHROPIC_API_KEY:-}"
upsert_env "GEMINI_API_KEY"             "${GEMINI_API_KEY:-}"
upsert_env "EVOLUTION_API_URL"          "${EVOLUTION_API_URL:-}"
upsert_env "EVOLUTION_API_KEY"          "${EVOLUTION_API_KEY:-}"
upsert_env "EVOLUTION_INSTANCE"         "${EVOLUTION_INSTANCE:-trafegopago}"
upsert_env "SLACK_WEBHOOK_URL"          "${SLACK_WEBHOOK_URL:-}"
upsert_env "GOOGLE_CLIENT_ID"           "${GOOGLE_CLIENT_ID:-}"
upsert_env "GOOGLE_CLIENT_SECRET"       "${GOOGLE_CLIENT_SECRET:-}"
upsert_env "GOOGLE_SERVICE_ACCOUNT_KEY" "${GOOGLE_SERVICE_ACCOUNT_KEY:-}"
upsert_env "SMTP_HOST"                  "${SMTP_HOST:-}"
upsert_env "SMTP_PORT"                  "${SMTP_PORT:-}"
upsert_env "SMTP_SECURE"                "${SMTP_SECURE:-}"
upsert_env "SMTP_USER"                  "${SMTP_USER:-}"
upsert_env "SMTP_PASS"                  "${SMTP_PASS:-}"
upsert_env "SMTP_FROM_NAME"             "${SMTP_FROM_NAME:-}"

log "   ✅ Secrets de app atualizados no .env"

# ── 3. Gerar .env de build ────────────────────────────────────
log "[3/5] Gerando .env de build para $AMBIENTE..."

set -o allexport; source "$ENV_FILE"; set +o allexport

if [ "$AMBIENTE" == "producao" ]; then
  cat > "$TARGET_SOURCE/.env" <<ENVEOF
DB_HOST=prod_db
DB_PORT=5432
DB_NAME=${PROD_DB_NAME:-net_imobiliaria}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${PROD_DB_PASSWORD:-}
JWT_SECRET=${PROD_JWT_SECRET:-build_placeholder}
NEXT_PUBLIC_APP_URL=${PROD_APP_URL:-}
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production
DB_POOL_MAX=100
DB_POOL_MIN=10
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD:-}
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=${MINIO_ROOT_USER:-minioadmin}
S3_SECRET_KEY=${MINIO_ROOT_PASSWORD:-}
S3_BUCKET=${S3_BUCKET_PROD:-netimobiliaria-prod}
S3_FORCE_PATH_STYLE=true
CDN_URL=https://${PROD_DOMAIN:-}/storage/${S3_BUCKET_PROD:-netimobiliaria-prod}
CRON_SECRET=${PROD_CRON_SECRET:-}
MARKETING_DATABASE_URL=postgresql://${DB_USER:-postgres}:${PROD_DB_PASSWORD:-}@prod_db:5432/${PROD_DB_NAME:-net_imobiliaria}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
GEMINI_API_KEY=${GEMINI_API_KEY:-}
PUBLIC_DOMAIN=https://${PROD_DOMAIN:-}
EVOLUTION_API_URL=${EVOLUTION_API_URL:-}
EVOLUTION_API_KEY=${EVOLUTION_API_KEY:-}
EVOLUTION_INSTANCE=${EVOLUTION_INSTANCE:-trafegopago}
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-}
ENVEOF
  log "   ✅ .env de PRODUÇÃO gerado"

elif [ "$AMBIENTE" == "staging" ]; then
  cat > "$TARGET_SOURCE/.env" <<ENVEOF
DB_HOST=staging_db
DB_PORT=5432
DB_NAME=${STAGING_DB_NAME:-net_imobiliaria_staging}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${STAGING_DB_PASSWORD:-}
JWT_SECRET=${STAGING_JWT_SECRET:-build_placeholder}
NEXT_PUBLIC_APP_URL=${STAGING_APP_URL:-}
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production
DB_POOL_MAX=50
DB_POOL_MIN=5
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD:-}
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=${MINIO_ROOT_USER:-minioadmin}
S3_SECRET_KEY=${MINIO_ROOT_PASSWORD:-}
S3_BUCKET=${S3_BUCKET_STAGING:-netimobiliaria-staging}
S3_FORCE_PATH_STYLE=true
CDN_URL=https://${STAGING_DOMAIN:-}/storage/${S3_BUCKET_STAGING:-netimobiliaria-staging}
CRON_SECRET=${STAGING_CRON_SECRET:-}
MARKETING_DATABASE_URL=postgresql://${DB_USER:-postgres}:${STAGING_DB_PASSWORD:-}@staging_db:5432/${STAGING_DB_NAME:-net_imobiliaria_staging}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
GEMINI_API_KEY=${GEMINI_API_KEY:-}
PUBLIC_DOMAIN=https://${STAGING_DOMAIN:-}
EVOLUTION_API_URL=${EVOLUTION_API_URL:-}
EVOLUTION_API_KEY=${EVOLUTION_API_KEY:-}
EVOLUTION_INSTANCE=${EVOLUTION_INSTANCE:-trafegopago}
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-}
ENVEOF
  log "   ✅ .env de STAGING gerado"
fi

# ── 4. Build da imagem Docker ─────────────────────────────────
log "[4/5] Construindo imagens Docker para $AMBIENTE..."

if [ "$AMBIENTE" == "producao" ]; then
  docker build -t "net-imobiliaria-prod_app:latest"  -f "$BASE_DIR/Dockerfile.prod" "$TARGET_SOURCE"
  docker build -t "net-imobiliaria-prod_feed:latest" -f "$BASE_DIR/Dockerfile.feed" "$TARGET_SOURCE"
  log "   ✅ Imagens de PRODUÇÃO construídas"
else
  docker build -t "net-imobiliaria-staging_app:latest"  -f "$BASE_DIR/Dockerfile.prod" "$TARGET_SOURCE"
  docker build -t "net-imobiliaria-staging_feed:latest" -f "$BASE_DIR/Dockerfile.feed" "$TARGET_SOURCE"
  log "   ✅ Imagens de STAGING construídas"
fi

# ── 5. Reiniciar containers + migrations ─────────────────────
log "[5/5] Reiniciando containers e aplicando migrations..."

cd "$BASE_DIR"

if [ "$AMBIENTE" == "producao" ]; then
  docker compose -f "$COMPOSE_FILE" up -d --no-build prod_app prod_feed

  log "   → Aguardando prod_app ficar saudável (max 90s)..."
  elapsed=0
  until docker compose -f "$COMPOSE_FILE" ps prod_app 2>/dev/null | grep -qE "healthy|Up"; do
    sleep 5; elapsed=$((elapsed+5))
    [[ $elapsed -ge 90 ]] && { log "   ⚠️  Timeout esperando prod_app"; break; }
  done

  log "   → Aplicando migrations (producao)..."
  bash "$BASE_DIR/scripts/vps/apply-migrations.sh" producao

  STATUS=$(docker compose -f "$COMPOSE_FILE" ps prod_app --format "{{.Status}}" 2>/dev/null || echo "unknown")
  if echo "$STATUS" | grep -qiE "healthy|Up"; then
    log "   ✅ prod_app: $STATUS"
  else
    log "   ❌ prod_app status inesperado: $STATUS"
    docker compose -f "$COMPOSE_FILE" logs --tail=30 prod_app
    exit 1
  fi

else
  docker compose -f "$COMPOSE_FILE" up -d --no-build staging_app staging_feed

  log "   → Aguardando staging_app (max 90s)..."
  elapsed=0
  until docker compose -f "$COMPOSE_FILE" ps staging_app 2>/dev/null | grep -qE "healthy|Up"; do
    sleep 5; elapsed=$((elapsed+5))
    [[ $elapsed -ge 90 ]] && { log "   ⚠️  Timeout esperando staging_app"; break; }
  done

  log "   → Aplicando migrations (staging)..."
  bash "$BASE_DIR/scripts/vps/apply-migrations.sh" staging

  STATUS=$(docker compose -f "$COMPOSE_FILE" ps staging_app --format "{{.Status}}" 2>/dev/null || echo "unknown")
  if echo "$STATUS" | grep -qiE "healthy|Up"; then
    log "   ✅ staging_app: $STATUS"
  else
    log "   ❌ staging_app status inesperado: $STATUS"
    docker compose -f "$COMPOSE_FILE" logs --tail=30 staging_app
    exit 1
  fi
fi

# ── 6. Cron jobs — NÃO configurados por este script (ver nota) ────────────
# Removido em 2026-09-04: este bloco configurava um 3º mecanismo de agendamento (crontab do
# SISTEMA OPERACIONAL do host), paralelo e não-coordenado com os 2 que já cobrem tudo:
#   1. scripts/feed-cron-scheduler.js — roda dentro do container prod_feed/staging_feed
#      (node-cron, processo Node persistente), 13 jobs — feed, transbordo, audit, mensageria,
#      CRM, canário de rede, agent-expire, sinais exógenos etc.
#   2. src/instrumentation.ts → agentMonitor.ts (startAgentMonitor) — roda DENTRO do próprio
#      processo do Next.js (prod_app/staging_app), disparado 1x quando o servidor sobe — sync
#      (6h, completo: decisor+negativação+realocação+digest), briefing matinal (8h) e
#      fechamento (18h). Legítimo aqui porque prod_app/staging_app são processos `next start`
#      de longa duração em Docker, não serverless — o cenário que este bloco original
#      presumia ("substitui node-cron em ambientes serverless", ver comentário de
#      /api/agent/tick) nunca se aplicou de fato a este deploy.
# Achado real, investigado antes de remover (não suposto): das 5 entradas que este bloco
# criava, 3 apontavam pra rotas que não existem mais — /api/cron/briefing/morning,
# /api/cron/briefing/closing, /api/cron/campanhas (renomeadas/reorganizadas em sessões
# anteriores sem atualizar este script) — e as 2 que existiam (agent-expire, agent-tick)
# duplicavam trabalho que os mecanismos 1/2 acima já fazem. Nunca chegou a rodar contra uma
# VPS real (nenhum deploy de Campanhas/CRM/Mensageria foi feito até agora) — corrigido antes
# do 1º deploy real, não depois de um incidente.
# /api/agent/tick e /api/cron/agent-expire continuam existindo e funcionais — úteis como
# gatilho manual/diagnóstico (o 2º já está coberto automaticamente pelo scheduler; o 1º é
# redundante com o ciclo interno completo do agentMonitor, mantido só como fallback externo).

log "============================================"
log "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
log "   Branch:   $BRANCH"
log "   Ambiente: $AMBIENTE"
log "   Horário:  $TIMESTAMP"
log "============================================"
