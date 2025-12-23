#!/usr/bin/env bash
set -euo pipefail

# Força um ciclo de feed (criar jobs + processar) em produção ou homologação.
#
# Uso:
#   ./scripts/vps/force-feed-sync.sh prod
#   ./scripts/vps/force-feed-sync.sh staging

ENV_NAME="${1:-prod}"

cd "$(dirname "$0")/../.."

COMPOSE_FILE="docker-compose.vps.yml"
ENV_FILE=".env.vps"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ERRO] Arquivo $ENV_FILE não encontrado. Crie a partir de env.vps.example" >&2
  exit 1
fi

if [[ "$ENV_NAME" == "prod" ]]; then
  FEED_SERVICE="prod_feed"
elif [[ "$ENV_NAME" == "staging" ]]; then
  FEED_SERVICE="staging_feed"
else
  echo "[ERRO] Ambiente inválido: $ENV_NAME (use prod|staging)" >&2
  exit 1
fi

echo "[*] Criando jobs ($ENV_NAME)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$FEED_SERVICE" node scripts/create-feed-jobs.js

echo "[*] Processando jobs ($ENV_NAME)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$FEED_SERVICE" \
  node -e "require('./scripts/feed-cron-processor.js').processAllPendingJobs().then(c=>console.log('jobs_processados',c)).catch(e=>{console.error(e);process.exit(1)})"

echo "[OK] Feed sync concluído ($ENV_NAME)."


