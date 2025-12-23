#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

if [[ ! -f .env.production ]]; then
  echo "[ERRO] .env.production não encontrado. Crie a partir de env.production.example" >&2
  exit 1
fi

export COMPOSE_PROJECT_NAME=netimobiliaria-prod

echo "[*] Atualizando código (git pull)..."
git pull --ff-only

echo "[*] Subindo produção (build + up)..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

echo "[OK] Produção no ar."
echo "[*] Validar: https://$(grep -E '^DOMAIN=' .env.production | cut -d= -f2)/api/health"


