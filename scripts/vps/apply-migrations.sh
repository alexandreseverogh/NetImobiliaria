#!/usr/bin/env bash
set -euo pipefail

# Aplica migrations idempotentes dentro do Postgres do container.
#
# Processa DUAS pastas de migrations:
#   1. database/migrations_docker/  →  NNN_*.sql  (numeradas, legadas)
#   2. migrations/                  →  YYYY-MM-DD_*.sql  (data-based, novas)
#
# Ambas usam a tabela public.schema_migrations como controle de idempotência.
#
# Uso:
#   ./scripts/vps/apply-migrations.sh producao
#   ./scripts/vps/apply-migrations.sh staging

ENV_NAME="${1:-producao}"

BASE_DIR="$HOME/net-imobiliaria"
cd "$BASE_DIR"

COMPOSE_FILE="docker-compose.vps.yml"

# Aceita .env.vps (legado) ou .env (padrão atual)
if [[ -f ".env.vps" ]]; then
  ENV_FILE=".env.vps"
elif [[ -f ".env" ]]; then
  ENV_FILE=".env"
else
  echo "[ERRO] .env não encontrado em $BASE_DIR" >&2
  exit 1
fi

# ── Seleciona banco conforme ambiente ────────────────────────────
if [[ "$ENV_NAME" == "prod" || "$ENV_NAME" == "producao" ]]; then
  DB_SERVICE="prod_db"
  DB_NAME="$(grep -E '^PROD_DB_NAME=' "$ENV_FILE" | cut -d= -f2 || true)"
  DB_NAME="${DB_NAME:-net_imobiliaria}"
elif [[ "$ENV_NAME" == "staging" || "$ENV_NAME" == "homologacao" ]]; then
  DB_SERVICE="staging_db"
  DB_NAME="$(grep -E '^STAGING_DB_NAME=' "$ENV_FILE" | cut -d= -f2 || true)"
  DB_NAME="${DB_NAME:-net_imobiliaria_staging}"
else
  echo "[ERRO] Ambiente inválido: $ENV_NAME (use producao ou staging)" >&2
  exit 1
fi

DB_USER="$(grep -E '^DB_USER=' "$ENV_FILE" | cut -d= -f2 || true)"
DB_USER="${DB_USER:-postgres}"

DB_CONTAINER_ID="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q "$DB_SERVICE" 2>/dev/null || true)"
if [[ -z "$DB_CONTAINER_ID" ]]; then
  echo "[ERRO] Container '$DB_SERVICE' não encontrado. Suba o stack primeiro." >&2
  exit 1
fi

# ── Garante tabela de controle ────────────────────────────────────
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" \
  psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c \
  "CREATE TABLE IF NOT EXISTS public.schema_migrations (
     filename   text PRIMARY KEY,
     applied_at timestamptz NOT NULL DEFAULT now()
   );" > /dev/null

# ── Função: aplica um arquivo SQL ────────────────────────────────
apply_file() {
  local file="$1"
  local name
  name="$(basename "$file")"

  # Verifica se já foi aplicada
  local already
  already="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" \
    psql -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT 1 FROM public.schema_migrations WHERE filename = '$name' LIMIT 1;" \
    2>/dev/null | tr -d '[:space:]' || true)"

  if [[ "$already" == "1" ]]; then
    return 1  # skip
  fi

  echo "[*] Aplicando: $name"
  local tmp="/tmp/migration_${name}"
  docker cp "$file" "$DB_CONTAINER_ID:$tmp" > /dev/null

  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$tmp" > /dev/null

  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c \
    "INSERT INTO public.schema_migrations(filename) VALUES ('$name') ON CONFLICT DO NOTHING;" > /dev/null

  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" \
    sh -c "rm -f '$tmp' 2>/dev/null || true" > /dev/null

  return 0
}

applied=0
skipped=0

# ── PASSO 1: migrations numeradas (database/migrations_docker/) ──
echo "[*] Processando migrations numeradas (database/migrations_docker/)..."
while IFS= read -r file; do
  if apply_file "$file"; then
    applied=$((applied+1))
  else
    skipped=$((skipped+1))
  fi
done < <(find "$BASE_DIR/database/migrations_docker" -maxdepth 1 -type f -name '*.sql' \
         | grep -E '/[0-9]{3}_.+\.sql$' | sort 2>/dev/null || true)

# ── PASSO 2: migrations date-based (migrations/) ─────────────────
MIGRATIONS_DATE_DIR="$BASE_DIR/migrations"
if [[ -d "$MIGRATIONS_DATE_DIR" ]]; then
  echo "[*] Processando migrations date-based (migrations/)..."
  while IFS= read -r file; do
    if apply_file "$file"; then
      applied=$((applied+1))
    else
      skipped=$((skipped+1))
    fi
  done < <(find "$MIGRATIONS_DATE_DIR" -maxdepth 1 -type f -name '*.sql' | sort 2>/dev/null || true)
else
  echo "[*] Pasta migrations/ não encontrada — pulando."
fi

echo "[OK] Migrations: $applied aplicadas, $skipped já existentes."
