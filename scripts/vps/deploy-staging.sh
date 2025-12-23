#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

if [[ ! -f .env.staging ]]; then
  echo "[ERRO] .env.staging não encontrado. Crie a partir de env.staging.example" >&2
  exit 1
fi

export COMPOSE_PROJECT_NAME=netimobiliaria-staging

echo "[*] Atualizando código (git pull)..."
git pull --ff-only

echo "[*] Subindo homologação (build + up)..."
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build

echo "[OK] Homologação no ar."
echo "[*] Validar: https://$(grep -E '^DOMAIN=' .env.staging | cut -d= -f2)/api/health"


