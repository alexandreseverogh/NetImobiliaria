# Executar Migration: Adicionar campo destaque_nacional na tabela imoveis
# Data: 2025-11-15

Write-Host ""
Write-Host "========================================"
Write-Host "  EXECUTANDO MIGRATION: destaque_nacional"
Write-Host "========================================"
Write-Host ""

# Configurar senha do PostgreSQL (ajuste conforme necessário)
$env:PGPASSWORD = 'Roberto@2007'

# Nome do banco de dados
$dbName = "net_imobiliaria"
$dbUser = "postgres"

# Caminho do arquivo SQL (versão simplificada primeiro)
$sqlFileSimples = "database\migrations\add_destaque_nacional_simples.sql"
$sqlFile = "database\migrations\add_destaque_nacional.sql"

Write-Host "📋 Tentando executar migration simplificada primeiro..."
Write-Host ""

# Executar migration simplificada primeiro (mais robusta)
try {
    # Verificar se a coluna já existe
    $colunaExiste = psql -U $dbUser -d $dbName -t -A -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'imoveis' AND column_name = 'destaque_nacional';"
    $colunaExiste = $colunaExiste.Trim()
    
    if ($colunaExiste -eq "0") {
        Write-Host "Coluna não existe. Criando coluna..."
        psql -U $dbUser -d $dbName -f $sqlFileSimples
        
        Write-Host ""
        Write-Host "✅ Migration simplificada executada com sucesso!"
    } else {
        Write-Host "Coluna já existe. Pulando criação..."
    }
    
    Write-Host ""
    
    # Agora executar a migration completa para atualizar dados e verificar
    Write-Host "📋 Executando migration completa para atualizar dados..."
    Write-Host ""
    psql -U $dbUser -d $dbName -f $sqlFile
    
    Write-Host ""
    Write-Host "✅ Migration executada com sucesso!"
    Write-Host ""
    
    # Verificar resultado
    Write-Host "🔍 Verificando resultado..."
    Write-Host ""
    
    $result = psql -U $dbUser -d $dbName -t -A -c "SELECT COUNT(*) as total_imoveis, COUNT(*) FILTER (WHERE destaque_nacional = true) as com_destaque_nacional, COUNT(*) FILTER (WHERE destaque_nacional = false) as sem_destaque_nacional FROM imoveis;"
    
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

