# Script de expurgo automático para Windows
# Executa diariamente às 2:00 AM

# Configurações
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "net_imobiliaria"
$DB_USER = "postgres"
$DB_PASSWORD = "Roberto@2007"

# Log do expurgo
$LOG_FILE = "C:\logs\auto-purge-logs.log"

# Função para log
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -FilePath $LOG_FILE -Append
}

Write-Log "Iniciando expurgo automático de logs..."

# Executar expurgo
$env:PGPASSWORD = $DB_PASSWORD
psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -c "SELECT auto_purge_login_logs();" | Out-File -FilePath $LOG_FILE -Append

if ($LASTEXITCODE -eq 0) {
    Write-Log "Expurgo automático executado com sucesso"
} else {
    Write-Log "ERRO: Falha na execução do expurgo automático"
}

Write-Log "Expurgo automático finalizado"
