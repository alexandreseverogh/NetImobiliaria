#!/bin/bash
# ============================================================
# Executa migração de imagens BYTEA → MinIO/S3 em background
# Uso: ./migrate-images.sh [prod|staging] [--dry-run]
# ============================================================

set -euo pipefail

ENV=${1:-prod}
EXTRA_ARGS=${2:-}
BASE_DIR="$HOME/net-imobiliaria"

echo "============================================"
echo "🖼️  MIGRAÇÃO DE IMAGENS — Ambiente: $ENV"
echo "============================================"

if [ "$ENV" == "prod" ]; then
  CONTAINER="prod_app"
elif [ "$ENV" == "staging" ]; then
  CONTAINER="staging_app"
else
  echo "❌ Ambiente inválido: $ENV (use 'prod' ou 'staging')"
  exit 1
fi

echo "→ Container: $CONTAINER"
echo "→ Argumentos extras: $EXTRA_ARGS"
echo ""

docker compose -f "$BASE_DIR/docker-compose.vps.yml" exec -T $CONTAINER \
  node scripts/migrate-images-to-s3.js --batch-size=500 $EXTRA_ARGS

echo ""
echo "✅ Migração concluída para ambiente: $ENV"
