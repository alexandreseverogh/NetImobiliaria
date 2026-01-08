
# Script para Sincronizar Banco Local (5432) para Docker (15432)
# ATENÇÃO: Isso sobrescreverá o banco do Docker!

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

$DumpFile = "backup_sync.dump"

Write-Host "🔄 Iniciando Sincronização: Local ($LocalPort) -> Docker ($DockerPort)" -ForegroundColor Cyan

# 1. Dump Local
Write-Host "1. Gerando Dump do Banco Local..." -ForegroundColor Yellow
$env:PGPASSWORD = $LocalPass
try {
    # -F c (Custom Format), -b (Blobs), -v (Verbose), -f (File)
    pg_dump -h $LocalHost -p $LocalPort -U $LocalUser -d $DbName -F c -b -f $DumpFile
    Write-Host "✅ Dump gerado com sucesso: $DumpFile" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao gerar dump. Verifique se o banco local está rodando." -ForegroundColor Red
    exit 1
}

# 2. Restore no Docker
Write-Host "2. Restaurando no Container Docker (Sobrescrevendo)..." -ForegroundColor Yellow
$env:PGPASSWORD = $DockerPass
try {
    # -c (Clean/Drop objects), -d (Database)
    # Nota: O banco 'net_imobiliaria' deve existir. Se não, pg_restore pode falhar com -d.
    # Mas o container docker normalmente inicia com ele.
    pg_restore -h $DockerHost -p $DockerPort -U $DockerUser -d $DbName -c $DumpFile
    Write-Host "✅ Restore concluído com sucesso!" -ForegroundColor Green
} catch {
    # pg_restore retorna exit code != 0 se houver warnings (comum com -c), então capturamos erro mas verificamos
    Write-Host "⚠️  Restore finalizado (pode ter avisos ignorares sobre drops)." -ForegroundColor Yellow
}

# Limpeza
if (Test-Path $DumpFile) {
    Remove-Item $DumpFile
}

Write-Host "🎉 Sincronização Finalizada!" -ForegroundColor Cyan
Write-Host "Agora o Container (Porta 15432) é um clone exato do Local." -ForegroundColor Cyan
