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

# -------------------------------------------------------------
# 2. Verificar .env (infraestrutura já atualizada pelo workflow)
# -------------------------------------------------------------
log "[2/5] Verificando arquivos de ambiente..."

# Copiar .env da infraestrutura para as fontes (necessário para o build)
if [ -f "$BASE_DIR/.env" ]; then
  log "   → Copiando .env para o contexto de build..."
  cp "$BASE_DIR/.env" "$TARGET_SOURCE/.env"
else
  log "   ⚠️  AVISO: $BASE_DIR/.env não encontrado! O build pode falhar sem variáveis de ambiente."
fi

log "   ✅ Ambiente verificado"

# -------------------------------------------------------------
# 3. Build da imagem Docker (usando Dockerfile atualizado)
# -------------------------------------------------------------
log "[3/5] Construindo imagem Docker..."

if [ "$AMBIENTE" == "producao" ]; then
  log "   → Build para PRODUÇÃO com Dockerfile de: $BASE_DIR/Dockerfile.prod"
  docker build \
    -t "net-imobiliaria-prod_app:latest" \
    -f "$BASE_DIR/Dockerfile.prod" \
    "$TARGET_SOURCE"

  log "   ✅ Imagem construída: net-imobiliaria-prod_app:latest"
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
  docker compose -f "$BASE_DIR/docker-compose.vps.yml" up -d --no-build prod_app
  
  # Aguardar health check
  log "   → Aguardando health check do container..."
  sleep 15
  
  STATUS=$(docker compose -f "$BASE_DIR/docker-compose.vps.yml" ps prod_app --format "{{.Status}}" 2>/dev/null || echo "unknown")
  log "   → Status do container: $STATUS"
  
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
