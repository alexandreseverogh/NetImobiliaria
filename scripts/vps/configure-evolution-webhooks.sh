#!/usr/bin/env bash
# Configura Evolution API webhooks para todos os tenants ativos que possuem
# evolution_instance + evolution_webhook_secret no banco de produção.
#
# Idempotente: pode ser chamado múltiplas vezes com segurança (apenas atualiza).
#
# Uso:
#   ./scripts/vps/configure-evolution-webhooks.sh
#
# Chamado automaticamente pelo deploy.sh após o stack subir.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$BASE_DIR"

COMPOSE_FILE="docker-compose.vps.yml"

# ── Localiza .env ─────────────────────────────────────────────────────────────
if [[ -f ".env.vps" ]]; then
  ENV_FILE=".env.vps"
elif [[ -f ".env" ]]; then
  ENV_FILE=".env"
else
  echo "[AVISO] .env.vps não encontrado — pulando configuração do Evolution API" >&2
  exit 0
fi

# ── Lê variáveis do .env.vps ──────────────────────────────────────────────────
_envget() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r' || true; }

PROD_DOMAIN="$(_envget PROD_DOMAIN)"
DB_USER="$(_envget DB_USER)";             DB_USER="${DB_USER:-postgres}"
PROD_DB_NAME="$(_envget PROD_DB_NAME)";   PROD_DB_NAME="${PROD_DB_NAME:-net_imobiliaria}"
EVOLUTION_API_URL="$(_envget EVOLUTION_API_URL)"
EVOLUTION_API_URL="${EVOLUTION_API_URL:-http://localhost:8081}"
EVOLUTION_API_KEY="$(_envget EVOLUTION_API_KEY)"

if [[ -z "$PROD_DOMAIN" ]]; then
  echo "[AVISO] PROD_DOMAIN não definido em $ENV_FILE — pulando" >&2
  exit 0
fi

if [[ -z "$EVOLUTION_API_KEY" ]]; then
  echo "[AVISO] EVOLUTION_API_KEY não definido em $ENV_FILE — pulando" >&2
  exit 0
fi

# ── Verifica se Evolution API está acessível (TCP, não verifica HTTP status) ──
if ! curl -so /dev/null --max-time 5 "$EVOLUTION_API_URL" 2>/dev/null; then
  echo "[AVISO] Evolution API não acessível em $EVOLUTION_API_URL — pulando" >&2
  exit 0
fi

echo "[*] Evolution API: $EVOLUTION_API_URL"
echo "[*] Buscando tenants com Evolution configurado em prod_db..."

# ── Consulta tenants via psql dentro do container prod_db ─────────────────────
TENANT_ROWS="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T prod_db \
  psql -U "$DB_USER" -d "$PROD_DB_NAME" -tAc \
  "SELECT evolution_instance, evolution_webhook_secret
   FROM public.tenants
   WHERE evolution_instance IS NOT NULL
     AND evolution_instance <> ''
     AND evolution_webhook_secret IS NOT NULL
     AND evolution_webhook_secret <> ''
     AND status = 'active'
   ORDER BY created_at;" 2>/dev/null || true)"

if [[ -z "$(echo "$TENANT_ROWS" | tr -d '[:space:]')" ]]; then
  echo "[*] Nenhum tenant com Evolution API configurado — nada a fazer."
  exit 0
fi

CONFIGURED=0
FAILED=0

while IFS='|' read -r instance secret; do
  instance="$(echo "$instance" | tr -d '[:space:]')"
  secret="$(echo "$secret"   | tr -d '[:space:]')"

  [[ -z "$instance" || -z "$secret" ]] && continue

  WEBHOOK_URL="https://${PROD_DOMAIN}/api/public/evolution/webhook?token=${secret}"
  echo "[*] Instância '${instance}' → ${WEBHOOK_URL}"

  HTTP_CODE="$(curl -s --max-time 10 \
    -X POST "${EVOLUTION_API_URL}/webhook/set/${instance}" \
    -H "Content-Type: application/json" \
    -H "apikey: ${EVOLUTION_API_KEY}" \
    -d "{
      \"url\": \"${WEBHOOK_URL}\",
      \"webhook_by_events\": false,
      \"webhook_base64\": false,
      \"events\": [\"MESSAGES_UPSERT\"]
    }" \
    -o /dev/null \
    -w "%{http_code}" 2>/dev/null || echo "000")"

  if [[ "$HTTP_CODE" =~ ^2 ]]; then
    echo "[OK] Webhook configurado para '${instance}' (HTTP ${HTTP_CODE})"
    CONFIGURED=$((CONFIGURED + 1))
  else
    echo "[ERRO] Falha ao configurar '${instance}' (HTTP ${HTTP_CODE})" >&2
    FAILED=$((FAILED + 1))
  fi

done <<< "$TENANT_ROWS"

echo "[*] Evolution webhooks: ${CONFIGURED} configurado(s), ${FAILED} falha(s)."
