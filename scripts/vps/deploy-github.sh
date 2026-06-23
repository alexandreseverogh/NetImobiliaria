#!/usr/bin/env bash
set -euo pipefail

# =============================================================
# deploy-github.sh — Deploy Automatizado (chamado pelo GitHub Actions via SSH)
#
# Uso: ./deploy-github.sh <branch> <ambiente>
#
# Ambientes: producao | staging
#
# Variáveis de ambiente esperadas (injetadas pelo GitHub Actions):
#   ANTHROPIC_API_KEY, GEMINI_API_KEY,
#   EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE,
#   SLACK_WEBHOOK_URL
# =============================================================

BRANCH=${1:-main}
AMBIENTE=${2:-producao}
BASE_DIR="$HOME/net-imobiliaria"
SOURCES_DIR="$HOME/net-imobiliaria-sources"
LOG_FILE="$BASE_DIR/deploy.log"
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

log "[1/6] Atualizando código fonte da branch '$BRANCH'..."
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

# Sincronizar migrations (AMBAS as pastas)
mkdir -p "$BASE_DIR/database/migrations_docker"
rsync -a --delete "$TARGET_SOURCE/database/migrations_docker/" "$BASE_DIR/database/migrations_docker/"

mkdir -p "$BASE_DIR/migrations"
rsync -a --delete "$TARGET_SOURCE/migrations/" "$BASE_DIR/migrations/"

# Sincronizar ops/ (Caddyfile, etc.)
if [[ -d "$TARGET_SOURCE/ops" ]]; then
  mkdir -p "$BASE_DIR/ops"
  rsync -a --delete "$TARGET_SOURCE/ops/" "$BASE_DIR/ops/"
fi

log "   ✅ Migrations e infra sincronizados"

# ── 2. Atualizar secrets de app no .env da VPS ───────────────
log "[2/6] Atualizando secrets de app no .env da VPS..."

ENV_FILE="$BASE_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  log "   ⚠️  $ENV_FILE não encontrado. Execute scripts/deploy.sh primeiro para a configuração inicial."
  exit 1
fi

# Upsert: atualiza se existe, adiciona se não existe
upsert_env() {
  local key="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    log "   ⚠️  $key está vazio — mantendo valor atual (se houver)"
    return
  fi
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

upsert_env "ANTHROPIC_API_KEY"   "${ANTHROPIC_API_KEY:-}"
upsert_env "GEMINI_API_KEY"      "${GEMINI_API_KEY:-}"
upsert_env "EVOLUTION_API_URL"   "${EVOLUTION_API_URL:-}"
upsert_env "EVOLUTION_API_KEY"   "${EVOLUTION_API_KEY:-}"
upsert_env "EVOLUTION_INSTANCE"  "${EVOLUTION_INSTANCE:-trafegopago}"
upsert_env "SLACK_WEBHOOK_URL"   "${SLACK_WEBHOOK_URL:-}"

log "   ✅ Secrets de app atualizados no .env"

# ── 3. Gerar .env de build ────────────────────────────────────
log "[3/6] Gerando .env de build para $AMBIENTE..."

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
log "[4/6] Construindo imagens Docker para $AMBIENTE..."

COMPOSE_FILE="$BASE_DIR/docker-compose.vps.yml"

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
log "[5/6] Reiniciando containers e aplicando migrations..."

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

# ── 6. Configurar cron jobs ───────────────────────────────────
# Apenas para produção (staging não precisa de crons operacionais)
if [ "$AMBIENTE" == "producao" ]; then
  log "[6/6] Configurando cron jobs de produção..."

  # Função para upsert idempotente de entrada no crontab
  # Usa um marcador único no comentário para identificar cada job
  setup_cron_job() {
    local marker="$1"
    local schedule="$2"
    local cmd="$3"
    # Remove entrada existente com este marcador
    (crontab -l 2>/dev/null | grep -v "# net-imob:${marker}" || true) | crontab - 2>/dev/null || true
    # Adiciona entrada nova
    (crontab -l 2>/dev/null; echo "${schedule} ${cmd} # net-imob:${marker}") | crontab -
  }

  DC="docker compose -f $BASE_DIR/docker-compose.vps.yml"

  # Agente: expirar ações PENDING_APPROVAL com PIN vencido (a cada hora)
  setup_cron_job "agent-expire" "0 * * * *" \
    "$DC exec -T prod_app sh -c 'curl -sf -o /dev/null -H \"x-cron-secret: \$CRON_SECRET\" http://localhost:3000/api/cron/agent-expire' >> $BASE_DIR/cron.log 2>&1"

  # Agente: ciclo de decisão (a cada 30 min)
  setup_cron_job "agent-tick" "*/30 * * * *" \
    "$DC exec -T prod_app sh -c 'curl -sf -o /dev/null -H \"x-cron-secret: \$CRON_SECRET\" http://localhost:3000/api/agent/tick' >> $BASE_DIR/cron.log 2>&1"

  # Briefing matinal (08:00 BRT = 11:00 UTC)
  setup_cron_job "briefing-morning" "0 11 * * *" \
    "$DC exec -T prod_app sh -c 'curl -sf -o /dev/null -H \"x-cron-secret: \$CRON_SECRET\" http://localhost:3000/api/cron/briefing/morning' >> $BASE_DIR/cron.log 2>&1"

  # Briefing fechamento (22:00 BRT = 01:00 UTC próximo dia)
  setup_cron_job "briefing-closing" "0 1 * * *" \
    "$DC exec -T prod_app sh -c 'curl -sf -o /dev/null -H \"x-cron-secret: \$CRON_SECRET\" http://localhost:3000/api/cron/briefing/closing' >> $BASE_DIR/cron.log 2>&1"

  # Sincronização de campanhas Meta (a cada 15 min)
  setup_cron_job "meta-sync" "*/15 * * * *" \
    "$DC exec -T prod_app sh -c 'curl -sf -o /dev/null -H \"x-cron-secret: \$CRON_SECRET\" http://localhost:3000/api/cron/campanhas' >> $BASE_DIR/cron.log 2>&1"

  log "   ✅ Cron jobs configurados:"
  crontab -l 2>/dev/null | grep "net-imob:" | while read -r line; do
    log "      $line"
  done
else
  log "[6/6] Staging: cron jobs não configurados (apenas produção usa crons)."
fi

log "============================================"
log "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
log "   Branch:   $BRANCH"
log "   Ambiente: $AMBIENTE"
log "   Horário:  $TIMESTAMP"
log "============================================"
