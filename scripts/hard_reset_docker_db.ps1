
# Script para Hard Reset e Sincronização
# 1. Drop Database no Docker
# 2. Create Database no Docker
# 3. Restore Dump

$ErrorActionPreference = "Stop"

$LocalHost = "localhost"
$LocalPort = "5432"
$LocalUser = "postgres"
$LocalPass = "Roberto@2007"
$DbName = "net_imobiliaria"

$DockerHost = "localhost"
$DockerPort = "15432"
$DockerUser = "postgres"
$DockerPass = "postgres"

$DumpFile = "backup_sync_hard.dump"

Write-Host "🔄 Iniciando Hard Sync: Local -> Docker" -ForegroundColor Cyan

# 1. Dump Local
Write-Host "1. Gerando Dump..." -ForegroundColor Yellow
$env:PGPASSWORD = $LocalPass
try {
    pg_dump -h $LocalHost -p $LocalPort -U $LocalUser -d $DbName -F c -b -f $DumpFile
    Write-Host "✅ Dump OK." -ForegroundColor Green
} catch {
    Write-Host "❌ Falha no Dump Local." -ForegroundColor Red
    exit 1
}

# 2. Re-criar Banco no Docker
Write-Host "2. Recriando Banco no Docker..." -ForegroundColor Yellow
$env:PGPASSWORD = $DockerPass

# Conectar no banco 'postgres' para poder dropar o 'net_imobiliaria'
# Usamos psql para isso
try {
    # Terminar conexões ativas
    $killSql = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DbName' AND pid <> pg_backend_pid();"
    psql -h $DockerHost -p $DockerPort -U $DockerUser -d postgres -c $killSql | Out-Null
    
    # Drop e Create
    dropdb -h $DockerHost -p $DockerPort -U $DockerUser --if-exists --force $DbName
    createdb -h $DockerHost -p $DockerPort -U $DockerUser $DbName
    Write-Host "✅ Banco recriado (Vazio)." -ForegroundColor Green
} catch {
    Write-Host "❌ Falha ao recriar banco: $_" -ForegroundColor Red
    # Tenta continuar com restore mesmo assim
}

# 3. Restore
Write-Host "3. Restaurando..." -ForegroundColor Yellow
try {
    # Sem a flag -c (clean) pois o banco é novo
    pg_restore -h $DockerHost -p $DockerPort -U $DockerUser -d $DbName -v $DumpFile
    Write-Host "✅ Restore OK!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Restore finalizado com avisos." -ForegroundColor Yellow
}

# Limpeza
if (Test-Path $DumpFile) {
    Remove-Item $DumpFile
}

Write-Host "🎉 Sincronização Completa!" -ForegroundColor Cyan
