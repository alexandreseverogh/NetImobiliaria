# Executar Migration: Adicionar campos alugar_landpaging e vender_landpaging na tabela finalidades_imovel
# Data: 2025-11-15

Write-Host ""
Write-Host "========================================"
Write-Host "  EXECUTANDO MIGRATION: alugar_vender_landpaging"
Write-Host "========================================"
Write-Host ""

# Configurar senha do PostgreSQL (ajuste conforme necessário)
$env:PGPASSWORD = 'Roberto@2007'

# Nome do banco de dados
$dbName = "net_imobiliaria"
$dbUser = "postgres"

# Caminho do arquivo SQL
$sqlFile = "database\migrations\add_alugar_vender_landpaging_finalidades.sql"

Write-Host "📋 Executando migration: $sqlFile"
Write-Host ""

# Executar migration
try {
    psql -U $dbUser -d $dbName -f $sqlFile
    
    Write-Host ""
    Write-Host "✅ Migration executada com sucesso!"
    Write-Host ""
    
    # Verificar resultado
    Write-Host "🔍 Verificando resultado..."
    Write-Host ""
    
    $result = psql -U $dbUser -d $dbName -t -A -c "SELECT id, nome, alugar_landpaging, vender_landpaging FROM finalidades_imovel ORDER BY id;"
    
    Write-Host "Resultado da migration:"
    Write-Host $result
    Write-Host ""
    
    Write-Host "========================================"
    Write-Host "  MIGRATION CONCLUIDA"
    Write-Host "========================================"
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ Erro ao executar migration:"
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "Verifique:"
    Write-Host "  1. Se o PostgreSQL está rodando"
    Write-Host "  2. Se a senha está correta (linha 9 do script)"
    Write-Host "  3. Se o arquivo SQL existe: $sqlFile"
    Write-Host ""
    exit 1
}








