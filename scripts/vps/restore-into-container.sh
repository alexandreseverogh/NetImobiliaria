#!/usr/bin/env bash
set -euo pipefail

# Restaura um dump para dentro do Postgres do container (Linux/VPS).
#
# Uso:
#   ./scripts/vps/restore-into-container.sh prod /backups/schema_oficial.sql
#   ./scripts/vps/restore-into-container.sh staging /backups/schema_oficial.sql

ENV_NAME="${1:-prod}"            # prod|staging
DUMP_PATH="${2:-/backups/schema_oficial.sql}"
EXPECTED_PG_MAJOR="${3:-17}"

cd "$(dirname "$0")/../.."

COMPOSE_FILE="docker-compose.vps.yml"
ENV_FILE=".env.vps"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ERRO] Arquivo $ENV_FILE não encontrado. Crie a partir de env.vps.example" >&2
  exit 1
fi

if [[ "$ENV_NAME" == "prod" ]]; then
  DB_SERVICE="prod_db"
  APP_SERVICE="prod_app"
  FEED_SERVICE="prod_feed"
  DB_NAME="$(grep -E '^PROD_DB_NAME=' "$ENV_FILE" | cut -d= -f2 || true)"
  DB_NAME="${DB_NAME:-net_imobiliaria_prod}"
elif [[ "$ENV_NAME" == "staging" ]]; then
  DB_SERVICE="staging_db"
  APP_SERVICE="staging_app"
  FEED_SERVICE="staging_feed"
  DB_NAME="$(grep -E '^STAGING_DB_NAME=' "$ENV_FILE" | cut -d= -f2 || true)"
  DB_NAME="${DB_NAME:-net_imobiliaria_staging}"
else
  echo "[ERRO] Ambiente inválido: $ENV_NAME (use prod|staging)" >&2
  exit 1
fi

DB_USER="$(grep -E '^DB_USER=' "$ENV_FILE" | cut -d= -f2 || true)"
DB_USER="${DB_USER:-postgres}"

echo "[*] Subindo DB (se necessário)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d "$DB_SERVICE"

echo "[*] Validando versão do Postgres..."
server_version_num="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" sh -lc "psql -U $DB_USER -d postgres -tAc 'SHOW server_version_num;'" | tr -d '[:space:]')"
if [[ -z "$server_version_num" ]]; then
  echo "[ERRO] Não foi possível ler server_version_num." >&2
  exit 1
fi
server_major="$((server_version_num / 10000))"
if [[ "$server_major" -ne "$EXPECTED_PG_MAJOR" ]]; then
  echo "[ERRO] Postgres major incompatível: $server_major (esperado $EXPECTED_PG_MAJOR). Ajuste POSTGRES_IMAGE e recrie volume." >&2
  exit 1
fi

echo "[*] Parando app para liberar conexões..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" stop "$APP_SERVICE" >/dev/null || true
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" stop "$FEED_SERVICE" >/dev/null || true

echo "[*] Verificando dump no container: $DUMP_PATH"
check="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" sh -lc "test -f '$DUMP_PATH' && echo OK || echo MISSING")"
if ! echo "$check" | grep -q "OK"; then
  echo "[ERRO] Dump não encontrado em $DUMP_PATH. Monte em ./database/backups (compose já monta em /backups)." >&2
  exit 1
fi

echo "[*] Drop/Create database..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" \
  psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME';" >/dev/null
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" \
  psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $DB_NAME;" >/dev/null
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" \
  psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $DB_NAME;" >/dev/null

echo "[*] Detectando tipo de dump..."
header="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" sh -lc "head -c 5 '$DUMP_PATH' 2>/dev/null || true")"

if echo "$header" | grep -q "PGDMP"; then
  echo "[*] PGDMP detectado -> pg_restore"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" \
    pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-privileges "$DUMP_PATH"
else
  echo "[*] Dump SQL detectado -> psql -f"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$DUMP_PATH"
fi

echo "[*] Aplicando migrations docker (idempotentes)..."
chmod +x scripts/vps/apply-migrations.sh
./scripts/vps/apply-migrations.sh "$ENV_NAME"

echo "[*] Subindo stack completo..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

echo "[OK] Restore concluído. Valide /api/health e /landpaging."


