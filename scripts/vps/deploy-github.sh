#!/usr/bin/env bash
set -euo pipefail

# =============================================================
# Script de Deploy Automatizado — Net Imobiliária
# Chamado pelo GitHub Actions via SSH
# Uso: ./deploy-github.sh <branch> <ambiente>
#
# Ambientes suportados:
#   producao  → Rebuilda e reinicia prod_app + prod_feed
#   staging   → Rebuilda e reinicia staging_app + staging_feed
# =============================================================

BRANCH=${1:-main}
AMBIENTE=${2:-producao}
BASE_DIR="$HOME/net-imobiliaria"
SOURCES_DIR="$HOME/net-imobiliaria-sources"
LOG_FILE="$BASE_DIR/deploy.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

log() {
  echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

log "============================================"
log "🚀 DEPLOY INICIADO"
log "   Branch:   $BRANCH"
log "   Ambiente: $AMBIENTE"
log "============================================"

# -------------------------------------------------------------
# 0. Validação de segurança
# -------------------------------------------------------------
if [ "$AMBIENTE" == "producao" ] && [ "$BRANCH" != "main" ]; then
  log "❌ BLOQUEADO: Apenas a branch 'main' pode ser deployada em produção!"
  log "   Use 'staging' para testar a branch '$BRANCH' primeiro."
  exit 1
fi

# -------------------------------------------------------------
# 1. Garantir diretório de fontes
# -------------------------------------------------------------
mkdir -p "$SOURCES_DIR"
TARGET_SOURCE="$SOURCES_DIR/$BRANCH"

log "[1/5] Atualizando código fonte da branch '$BRANCH'..."

if [ -d "$TARGET_SOURCE/.git" ]; then
  log "   → Repositório já existe, atualizando..."
  cd "$TARGET_SOURCE"
  git fetch origin
  git checkout "$BRANCH"
  # Força sincronização com o remoto (descarta mudanças locais não commitadas)
  git reset --hard "origin/$BRANCH"
  git clean -fd
else
  log "   → Clonando repositório pela primeira vez..."
  git clone -b "$BRANCH" https://github.com/alexandreseverogh/NetImobiliaria.git "$TARGET_SOURCE"
fi

log "   ✅ Código atualizado: $(cd $TARGET_SOURCE && git log -1 --pretty='%h — %s')"

# Sincronizar diretório de migrations para que o apply-migrations.sh as encontre
mkdir -p "$BASE_DIR/database/migrations_docker"
rsync -av --delete "$TARGET_SOURCE/database/migrations_docker/" "$BASE_DIR/database/migrations_docker/"

# -------------------------------------------------------------
# 2. Gerar .env de build com variáveis mapeadas
# -------------------------------------------------------------
log "[2/5] Gerando .env de build com variáveis mapeadas..."

if [ -f "$BASE_DIR/.env" ]; then
  set -o allexport
  source "$BASE_DIR/.env"
  set +o allexport

  if [ "$AMBIENTE" == "producao" ]; then
    cat > "$TARGET_SOURCE/.env" << ENVEOF
DB_HOST=prod_db
DB_PORT=5432
DB_NAME=${PROD_DB_NAME:-net_imobiliaria}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${PROD_DB_PASSWORD:-}
JWT_SECRET=${PROD_JWT_SECRET:-build_placeholder}
NEXT_PUBLIC_APP_URL=${PROD_APP_URL:-https://www.imovtec.com.br}
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production
DB_POOL_MAX=100
DB_POOL_MIN=10
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD:-}
S3_ENDPOINT=${S3_ENDPOINT:-}
S3_REGION=${S3_REGION:-us-east-1}
S3_ACCESS_KEY=${S3_ACCESS_KEY:-}
S3_SECRET_KEY=${S3_SECRET_KEY:-}
S3_BUCKET=${S3_BUCKET_PROD:-netimobiliaria-prod}
CDN_URL=${CDN_URL:-}
ENVEOF
    log "   ✅ .env de PRODUÇÃO gerado"

  elif [ "$AMBIENTE" == "staging" ]; then
    cat > "$TARGET_SOURCE/.env" << ENVEOF
DB_HOST=staging_db
DB_PORT=5432
DB_NAME=${STAGING_DB_NAME:-net_imobiliaria_staging}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${STAGING_DB_PASSWORD:-}
JWT_SECRET=${STAGING_JWT_SECRET:-build_placeholder}
NEXT_PUBLIC_APP_URL=${STAGING_APP_URL:-https://staging.imovtec.com.br}
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production
DB_POOL_MAX=50
DB_POOL_MIN=5
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD:-}
S3_ENDPOINT=${S3_ENDPOINT:-}
S3_REGION=${S3_REGION:-us-east-1}
S3_ACCESS_KEY=${S3_ACCESS_KEY:-}
S3_SECRET_KEY=${S3_SECRET_KEY:-}
S3_BUCKET=${S3_BUCKET_STAGING:-netimobiliaria-staging}
CDN_URL=${CDN_URL:-}
ENVEOF
    log "   ✅ .env de STAGING gerado"
  fi
else
  log "   ⚠️  AVISO: $BASE_DIR/.env não encontrado! O build pode falhar."
fi

# -------------------------------------------------------------
# 3. Build da imagem Docker
# -------------------------------------------------------------
log "[3/5] Construindo imagem Docker para $AMBIENTE..."

if [ "$AMBIENTE" == "producao" ]; then
  log "   → Build APP para PRODUÇÃO"
  docker build \
    -t "net-imobiliaria-prod_app:latest" \
    -f "$BASE_DIR/Dockerfile.prod" \
    "$TARGET_SOURCE"
  log "   ✅ Imagem APP construída: net-imobiliaria-prod_app:latest"

  log "   → Build FEED para PRODUÇÃO"
  docker build \
    -t "net-imobiliaria-prod_feed:latest" \
    -f "$BASE_DIR/Dockerfile.feed" \
    "$TARGET_SOURCE"
  log "   ✅ Imagem FEED construída: net-imobiliaria-prod_feed:latest"

elif [ "$AMBIENTE" == "staging" ]; then
  log "   → Build APP para STAGING (branch: $BRANCH)"
  docker build \
    -t "net-imobiliaria-staging_app:latest" \
    -f "$BASE_DIR/Dockerfile.prod" \
    "$TARGET_SOURCE"
  log "   ✅ Imagem APP construída: net-imobiliaria-staging_app:latest"

  log "   → Build FEED para STAGING (branch: $BRANCH)"
  docker build \
    -t "net-imobiliaria-staging_feed:latest" \
    -f "$BASE_DIR/Dockerfile.feed" \
    "$TARGET_SOURCE"
  log "   ✅ Imagem FEED construída: net-imobiliaria-staging_feed:latest"
fi

# -------------------------------------------------------------
# 4. Infraestrutura
# -------------------------------------------------------------
log "[4/5] Infraestrutura já atualizada anteriormente. Prosseguindo..."

# -------------------------------------------------------------
# 5. Reiniciar serviço
# -------------------------------------------------------------
log "[5/5] Reiniciando container ($AMBIENTE)..."

if [ "$AMBIENTE" == "producao" ]; then
  docker compose -f "$BASE_DIR/docker-compose.vps.yml" up -d --no-build prod_app prod_feed

  log "   → Aplicando migrations de banco de dados (produção)..."
  bash "$BASE_DIR/scripts/vps/apply-migrations.sh" producao || true

  log "   → Aguardando health check..."
  sleep 15

  STATUS=$(docker compose -f "$BASE_DIR/docker-compose.vps.yml" ps prod_app --format "{{.Status}}" 2>/dev/null || echo "unknown")
  log "   → Status prod_app: $STATUS"

  FEED_STATUS=$(docker compose -f "$BASE_DIR/docker-compose.vps.yml" ps prod_feed --format "{{.Status}}" 2>/dev/null || echo "unknown")
  log "   → Status prod_feed: $FEED_STATUS"

  if echo "$STATUS" | grep -q "healthy\|Up"; then
    log "   ✅ Container prod_app está saudável!"
  else
    log "   ⚠️  Status inesperado: $STATUS"
    docker compose -f "$BASE_DIR/docker-compose.vps.yml" logs --tail=30 prod_app
    exit 1
  fi

elif [ "$AMBIENTE" == "staging" ]; then
  docker compose -f "$BASE_DIR/docker-compose.vps.yml" up -d --no-build staging_app staging_feed

  log "   → Aplicando migrations de banco de dados (staging)..."
  bash "$BASE_DIR/scripts/vps/apply-migrations.sh" staging || true

  log "   → Aguardando health check..."
  sleep 15

  STATUS=$(docker compose -f "$BASE_DIR/docker-compose.vps.yml" ps staging_app --format "{{.Status}}" 2>/dev/null || echo "unknown")
  log "   → Status staging_app: $STATUS"

  FEED_STATUS=$(docker compose -f "$BASE_DIR/docker-compose.vps.yml" ps staging_feed --format "{{.Status}}" 2>/dev/null || echo "unknown")
  log "   → Status staging_feed: $FEED_STATUS"

  if echo "$STATUS" | grep -q "healthy\|Up"; then
    log "   ✅ Container staging_app está saudável!"
  else
    log "   ⚠️  Status inesperado: $STATUS"
    docker compose -f "$BASE_DIR/docker-compose.vps.yml" logs --tail=30 staging_app
    exit 1
  fi
fi

log "============================================"
log "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
log "   Branch:   $BRANCH"
log "   Ambiente: $AMBIENTE"
log "   Horário:  $TIMESTAMP"
log "============================================"
