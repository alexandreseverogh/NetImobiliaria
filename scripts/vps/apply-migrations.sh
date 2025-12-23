#!/usr/bin/env bash
set -euo pipefail

# Aplica migrations idempotentes (database/migrations_docker) dentro do Postgres do container.
#
# Uso:
#   ./scripts/vps/apply-migrations.sh prod
#   ./scripts/vps/apply-migrations.sh staging

ENV_NAME="${1:-prod}" # prod|staging

cd "$(dirname "$0")/../.."

COMPOSE_FILE="docker-compose.vps.yml"
ENV_FILE=".env.vps"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ERRO] Arquivo $ENV_FILE não encontrado. Crie a partir de env.vps.example" >&2
  exit 1
fi

if [[ "$ENV_NAME" == "prod" ]]; then
  DB_SERVICE="prod_db"
  DB_NAME="$(grep -E '^PROD_DB_NAME=' "$ENV_FILE" | cut -d= -f2 || true)"
  DB_NAME="${DB_NAME:-net_imobiliaria_prod}"
elif [[ "$ENV_NAME" == "staging" ]]; then
  DB_SERVICE="staging_db"
  DB_NAME="$(grep -E '^STAGING_DB_NAME=' "$ENV_FILE" | cut -d= -f2 || true)"
  DB_NAME="${DB_NAME:-net_imobiliaria_staging}"
else
  echo "[ERRO] Ambiente inválido: $ENV_NAME (use prod|staging)" >&2
  exit 1
fi

DB_USER="$(grep -E '^DB_USER=' "$ENV_FILE" | cut -d= -f2 || true)"
DB_USER="${DB_USER:-postgres}"

MIGRATIONS_DIR="database/migrations_docker"

echo "[*] Aplicando migrations ($ENV_NAME) -> $MIGRATIONS_DIR"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" \
  psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  filename   text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

DB_CONTAINER_ID="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q "$DB_SERVICE")"
if [[ -z "$DB_CONTAINER_ID" ]]; then
  echo "[ERRO] Container do DB não encontrado (ps -q db vazio). Suba o stack primeiro." >&2
  exit 1
fi

applied=0
skipped=0

while IFS= read -r file; do
  name="$(basename "$file")"

  already="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" \
    psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT 1 FROM public.schema_migrations WHERE filename = '$name' LIMIT 1;" | tr -d '[:space:]' || true)"

  if [[ "$already" == "1" ]]; then
    skipped=$((skipped+1))
    continue
  fi

  echo "[*] Aplicando: $name"
  tmp="/tmp/$name"
  docker cp "$file" "$DB_CONTAINER_ID:$tmp" >/dev/null

  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$tmp" >/dev/null

  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "INSERT INTO public.schema_migrations(filename) VALUES ('$name') ON CONFLICT (filename) DO NOTHING;" >/dev/null

  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" sh -lc "rm -f '$tmp' || true" >/dev/null
  applied=$((applied+1))
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' | grep -E '/[0-9]{3}_.+\.sql$' | sort)

echo "[OK] Migrations aplicadas: $applied | skip: $skipped"


