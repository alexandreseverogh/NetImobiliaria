#!/usr/bin/env bash
set -euo pipefail

# =============================================================
# Script de Deploy Automatizado — Net Imobiliária
# Chamado pelo GitHub Actions via SSH
# Uso: ./deploy-github.sh <branch> <ambiente>
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
# 2. Verificar .env (infraestrutura já atualizada pelo workflow)
# -------------------------------------------------------------
log "[2/5] Gerando .env de build com variáveis mapeadas..."

# O .env da VPS usa PROD_DB_NAME, PROD_DB_PASSWORD, etc.
# O código Next.js espera DB_NAME, DB_PASSWORD, etc.
# Geramos um .env de build com os nomes corretos mapeados.
if [ -f "$BASE_DIR/.env" ]; then
  set -o allexport
  source "$BASE_DIR/.env"
  set +o allexport

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
ENVEOF

  log "   ✅ .env de build gerado com variáveis mapeadas (DB_NAME, DB_PASSWORD, etc.)"
else
  log "   ⚠️  AVISO: $BASE_DIR/.env não encontrado! O build pode falhar."
fi

# -------------------------------------------------------------
# 3. Build da imagem Docker (usando Dockerfile atualizado)
# -------------------------------------------------------------
log "[3/5] Construindo imagem Docker..."

if [ "$AMBIENTE" == "producao" ]; then
  log "   → Build APP para PRODUÇÃO com Dockerfile de: $BASE_DIR/Dockerfile.prod"
  docker build \
    -t "net-imobiliaria-prod_app:latest" \
    -f "$BASE_DIR/Dockerfile.prod" \
    "$TARGET_SOURCE"
  log "   ✅ Imagem APP construída: net-imobiliaria-prod_app:latest"

  log "   → Build FEED para PRODUÇÃO com Dockerfile de: $BASE_DIR/Dockerfile.feed"
  docker build \
    -t "net-imobiliaria-prod_feed:latest" \
    -f "$BASE_DIR/Dockerfile.feed" \
    "$TARGET_SOURCE"
  log "   ✅ Imagem FEED construída: net-imobiliaria-prod_feed:latest"
fi

# -------------------------------------------------------------
# 4. (Infraestrutura já atualizada no step 2)
# -------------------------------------------------------------
log "[4/5] Infraestrutura já atualizada anteriormente. Prosseguindo..."

# -------------------------------------------------------------
# 5. Reiniciar serviço
# -------------------------------------------------------------
log "[5/5] Reiniciando container..."

if [ "$AMBIENTE" == "producao" ]; then
  # Iniciar app e feed worker juntos (cada um com sua imagem dedicada)
  docker compose -f "$BASE_DIR/docker-compose.vps.yml" up -d --no-build prod_app prod_feed

  # Aplicar migrations
  log "   → Aplicando migrations de banco de dados..."
  bash "$BASE_DIR/scripts/vps/apply-migrations.sh" producao || true

  # Aguardar health check
  log "   → Aguardando health check do container..."
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
fi

log "============================================"
log "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
log "   Branch:   $BRANCH"
log "   Ambiente: $AMBIENTE"
log "   Horário:  $TIMESTAMP"
log "============================================"
