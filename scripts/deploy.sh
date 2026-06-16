#!/usr/bin/env bash
# =============================================================
# deploy.sh — Deploy automatizado para a VPS
#
# Uso (primeira vez):
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh
#
# Uso (atualizar para nova versão):
#   ./scripts/deploy.sh --update
#
# O que este script faz:
#   1. Verifica dependências (docker, docker compose, openssl)
#   2. Se .env não existe: coleta domínio + email, gera todas
#      as senhas fortes automaticamente e escreve o .env
#   3. Sobe os containers (ou reinicia em --update)
#   4. Aguarda healthchecks
#   5. Inicializa bucket MinIO com política pública
# =============================================================

set -euo pipefail

# ── Cores ─────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${BLUE}ℹ${RESET}  $*"; }
success() { echo -e "${GREEN}✔${RESET}  $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET}  $*"; }
error()   { echo -e "${RED}✖${RESET}  $*" >&2; exit 1; }
header()  { echo -e "\n${BOLD}${BLUE}━━━ $* ━━━${RESET}\n"; }

# ── Diretório raiz do projeto ─────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

UPDATE_MODE=false
[[ "${1:-}" == "--update" ]] && UPDATE_MODE=true

# ── 1. Verificar dependências ──────────────────────────────────
header "Verificando dependências"

for cmd in docker openssl; do
  if ! command -v "$cmd" &>/dev/null; then
    error "$cmd não encontrado. Instale antes de continuar."
  fi
  success "$cmd OK"
done

# docker compose (plugin v2) ou docker-compose (v1)
if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE="docker-compose"
else
  error "docker compose não encontrado."
fi
success "docker compose OK ($($COMPOSE version --short 2>/dev/null || echo 'v1'))"

# ── 2. Gerar .env se não existir ──────────────────────────────
if [[ -f ".env" && "$UPDATE_MODE" == false ]]; then
  warn ".env já existe. Pulando configuração inicial."
  warn "Use --update para atualizar apenas os containers sem recriar o .env."
else
  if [[ "$UPDATE_MODE" == false ]]; then
    header "Configuração inicial"

    echo -e "${BOLD}Responda às perguntas abaixo. Todas as senhas serão geradas automaticamente.${RESET}\n"

    # Domínio de produção
    while true; do
      read -rp "$(echo -e "${BOLD}Domínio de produção${RESET} (ex: app.minhaempresa.com.br): ")" PROD_DOMAIN
      [[ -n "$PROD_DOMAIN" ]] && break
      warn "O domínio não pode ser vazio."
    done

    # Domínio de staging
    DEFAULT_STAGING="staging.${PROD_DOMAIN#*.}"
    read -rp "$(echo -e "${BOLD}Domínio de staging${RESET} [${DEFAULT_STAGING}]: ")" STAGING_DOMAIN
    STAGING_DOMAIN="${STAGING_DOMAIN:-$DEFAULT_STAGING}"

    # E-mail Let's Encrypt
    while true; do
      read -rp "$(echo -e "${BOLD}E-mail para Let's Encrypt${RESET} (certificado HTTPS): ")" LETSENCRYPT_EMAIL
      [[ "$LETSENCRYPT_EMAIL" == *@* ]] && break
      warn "Digite um e-mail válido."
    done

    # Senha do banco
    read -rp "$(echo -e "${BOLD}Senha do banco de dados${RESET} [gerar automaticamente]: ")" PROD_DB_PASSWORD_INPUT
    PROD_DB_PASSWORD="${PROD_DB_PASSWORD_INPUT:-$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)}"

    info "Gerando segredos automaticamente..."

    # Todos os outros segredos gerados automaticamente
    STAGING_DB_PASSWORD="$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)"
    PROD_JWT_SECRET="$(openssl rand -hex 64)"
    STAGING_JWT_SECRET="$(openssl rand -hex 64)"
    REDIS_PASSWORD="$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)"
    MINIO_ROOT_USER="minioadmin"
    MINIO_ROOT_PASSWORD="$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)"
    PROD_CRON_SECRET="$(openssl rand -hex 32)"
    STAGING_CRON_SECRET="$(openssl rand -hex 32)"

    cat > .env <<EOF
# ============================================================
# .env — Gerado automaticamente por scripts/deploy.sh
# em $(date '+%Y-%m-%d %H:%M:%S')
# NUNCA commite este arquivo.
# ============================================================

# ── Domínios ─────────────────────────────────────────────────
PROD_DOMAIN=${PROD_DOMAIN}
STAGING_DOMAIN=${STAGING_DOMAIN}
LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL}
PROD_APP_URL=https://${PROD_DOMAIN}
STAGING_APP_URL=https://${STAGING_DOMAIN}

# ── Build contexts ────────────────────────────────────────────
PROD_CONTEXT=.
STAGING_CONTEXT=.

# ── Banco de dados ────────────────────────────────────────────
DB_USER=postgres
PROD_DB_NAME=net_imobiliaria
PROD_DB_PASSWORD=${PROD_DB_PASSWORD}
STAGING_DB_NAME=net_imobiliaria_staging
STAGING_DB_PASSWORD=${STAGING_DB_PASSWORD}

# ── Auth ──────────────────────────────────────────────────────
PROD_JWT_SECRET=${PROD_JWT_SECRET}
STAGING_JWT_SECRET=${STAGING_JWT_SECRET}

# ── Redis ─────────────────────────────────────────────────────
REDIS_PASSWORD=${REDIS_PASSWORD}

# ── MinIO (Object Storage) ────────────────────────────────────
# CDN_URL é derivado automaticamente no docker-compose.vps.yml
# a partir de PROD_DOMAIN e STAGING_DOMAIN — não edite aqui.
MINIO_ROOT_USER=${MINIO_ROOT_USER}
MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
S3_BUCKET_PROD=netimobiliaria-prod
S3_BUCKET_STAGING=netimobiliaria-staging

# ── Cron ─────────────────────────────────────────────────────
PROD_CRON_SECRET=${PROD_CRON_SECRET}
STAGING_CRON_SECRET=${STAGING_CRON_SECRET}

# ── LLM (preencher após deploy se necessário) ─────────────────
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

# ── Meta API (preencher na UI de configurações) ───────────────
META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=

# ── Notificações (opcionais) ──────────────────────────────────
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
SLACK_WEBHOOK_URL=
EOF

    chmod 600 .env
    success ".env criado com sucesso (permissões 600)"
    echo ""
    info "Salve as credenciais abaixo em local seguro (ex: gerenciador de senhas):"
    echo -e "  ${BOLD}Banco (prod):${RESET}   $PROD_DB_PASSWORD"
    echo -e "  ${BOLD}MinIO:${RESET}          $MINIO_ROOT_PASSWORD"
    echo -e "  ${BOLD}Cron secret:${RESET}    $PROD_CRON_SECRET"
    echo ""
  fi
fi

# ── Carregar variáveis do .env ─────────────────────────────────
set -a; source .env; set +a

# ── 3. Build e subida dos containers ──────────────────────────
header "Subindo containers"

if [[ "$UPDATE_MODE" == true ]]; then
  info "Modo update: rebuild apenas do app e feed, sem recriar db/minio/redis."
  $COMPOSE -f docker-compose.vps.yml build prod_app prod_feed staging_app staging_feed
  $COMPOSE -f docker-compose.vps.yml up -d --no-deps prod_app prod_feed staging_app staging_feed
else
  $COMPOSE -f docker-compose.vps.yml pull redis minio libretranslate caddy 2>/dev/null || true
  $COMPOSE -f docker-compose.vps.yml build prod_app prod_feed staging_app staging_feed
  $COMPOSE -f docker-compose.vps.yml up -d
fi

# ── 4. Aguardar healthcheck do prod_app ───────────────────────
header "Aguardando healthchecks"

MAX_WAIT=120
ELAPSED=0
info "Aguardando prod_app ficar saudável (máx ${MAX_WAIT}s)..."
until [[ "$($COMPOSE -f docker-compose.vps.yml ps prod_app --format json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('Health','') if isinstance(d,dict) else [x.get('Health','') for x in d][0])" 2>/dev/null)" == "healthy" ]]; do
  sleep 5; ELAPSED=$((ELAPSED+5))
  if [[ $ELAPSED -ge $MAX_WAIT ]]; then
    warn "prod_app ainda não ficou healthy após ${MAX_WAIT}s."
    warn "Verifique os logs: $COMPOSE -f docker-compose.vps.yml logs prod_app"
    break
  fi
  echo -n "."
done
echo ""
success "Containers no ar."

# ── 5. Inicializar buckets MinIO ──────────────────────────────
header "Inicializando MinIO"

MINIO_READY=false
for i in $(seq 1 12); do
  if $COMPOSE -f docker-compose.vps.yml exec -T minio mc --version &>/dev/null 2>&1; then
    MINIO_READY=true; break
  fi
  if curl -sf http://localhost:9000/minio/health/live &>/dev/null; then
    MINIO_READY=true; break
  fi
  sleep 5; echo -n "."
done
echo ""

if [[ "$MINIO_READY" == true ]]; then
  # Usa o mc (MinIO client) dentro do container para criar buckets
  $COMPOSE -f docker-compose.vps.yml exec -T minio sh -c "
    mc alias set local http://localhost:9000 '${MINIO_ROOT_USER}' '${MINIO_ROOT_PASSWORD}' --quiet 2>/dev/null || true
    mc mb --ignore-existing local/${S3_BUCKET_PROD:-netimobiliaria-prod} 2>/dev/null || true
    mc mb --ignore-existing local/${S3_BUCKET_STAGING:-netimobiliaria-staging} 2>/dev/null || true
    mc anonymous set download local/${S3_BUCKET_PROD:-netimobiliaria-prod} 2>/dev/null || true
    mc anonymous set download local/${S3_BUCKET_STAGING:-netimobiliaria-staging} 2>/dev/null || true
  " 2>/dev/null && success "Buckets MinIO criados e públicos." || \
  warn "mc não disponível no container — buckets serão criados automaticamente no primeiro upload."
else
  warn "MinIO não respondeu — buckets serão criados automaticamente no primeiro upload (ensureBucket)."
fi

# ── Resumo final ───────────────────────────────────────────────
header "Deploy concluído"

echo -e "  ${GREEN}${BOLD}Produção:${RESET}  https://${PROD_DOMAIN}"
echo -e "  ${YELLOW}${BOLD}Staging:${RESET}   https://${STAGING_DOMAIN}"
echo -e "  ${BLUE}${BOLD}MinIO:${RESET}     https://${PROD_DOMAIN}/storage/ (via Caddy)"
echo ""
info "Para atualizar depois: ./scripts/deploy.sh --update"
info "Para ver logs:         $COMPOSE -f docker-compose.vps.yml logs -f prod_app"
