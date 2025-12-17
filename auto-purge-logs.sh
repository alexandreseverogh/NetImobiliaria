#!/bin/bash
# Script de expurgo automático de logs
# Executa diariamente às 2:00 AM

# Configurações
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="net_imobiliaria"
DB_USER="postgres"
DB_PASSWORD="Roberto@2007"

# Log do expurgo
LOG_FILE="/var/log/auto-purge-logs.log"

# Função para log
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

log_message "Iniciando expurgo automático de logs..."

# Executar expurgo
psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -c "SELECT auto_purge_login_logs();" >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    log_message "Expurgo automático executado com sucesso"
else
    log_message "ERRO: Falha na execução do expurgo automático"
fi

log_message "Expurgo automático finalizado"
