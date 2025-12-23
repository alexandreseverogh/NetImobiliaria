#!/usr/bin/env bash
set -euo pipefail

# Deploy (1 VPS, 2 ambientes) usando docker-compose.vps.yml + .env.vps
#
# Uso:
#   ./scripts/vps/deploy.sh
#
# Faz:
# - git pull
# - build + up do stack inteiro
# - mostra status

cd "$(dirname "$0")/../.."

if [[ ! -f .env.vps ]]; then
  echo "[ERRO] .env.vps não encontrado. Crie a partir de env.vps.example" >&2
  exit 1
fi

COMPOSE_FILE="docker-compose.vps.yml"
ENV_FILE=".env.vps"

echo "[*] Atualizando código (git pull)..."
git pull --ff-only

echo "[*] Subindo stack (build + up)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

echo "[*] Status:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo "[OK] Deploy concluído."
echo "[*] Valide:"
echo "   - https://$(grep -E '^PROD_DOMAIN=' .env.vps | cut -d= -f2)/api/health"
echo "   - https://$(grep -E '^STAGING_DOMAIN=' .env.vps | cut -d= -f2)/api/health"


