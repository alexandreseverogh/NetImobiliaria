#!/usr/bin/env bash
set -euo pipefail

# Status rápido do stack VPS (prod + staging).
#
# Uso:
#   ./scripts/vps/status.sh

cd "$(dirname "$0")/../.."

COMPOSE_FILE="docker-compose.vps.yml"
ENV_FILE=".env.vps"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ERRO] Arquivo $ENV_FILE não encontrado." >&2
  exit 1
fi

echo "[*] Containers:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo
echo "[*] Últimos logs (prod_feed):"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=80 prod_feed || true

echo
echo "[*] Últimos logs (staging_feed):"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=80 staging_feed || true


