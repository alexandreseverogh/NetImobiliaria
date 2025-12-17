# Script PowerShell para executar setup do banco
# Net Imobiliária - Sistema Robusto

Write-Host "🚀 INICIANDO SETUP DO BANCO DE DADOS..." -ForegroundColor Green
Write-Host ""

# Definir variáveis
$password = "Roberto@2007"
$database = "net_imobiliaria"
$dbHost = "localhost"
$user = "postgres"

Write-Host "📊 Executando script de criação das tabelas..." -ForegroundColor Yellow

# Executar script 1 - Criação das tabelas
$env:PGPASSWORD = $password
psql -h $dbHost -U $user -d $database -f "01_create_tables.sql" -q

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Tabelas criadas com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao criar tabelas!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📊 Executando script de dados iniciais..." -ForegroundColor Yellow

# Executar script 2 - Dados iniciais
psql -h $dbHost -U $user -d $database -f "02_seed_initial_data.sql" -q

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dados iniciais inseridos com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao inserir dados iniciais!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔍 Verificando instalação..." -ForegroundColor Yellow

# Verificar tabelas criadas
$result = psql -h $dbHost -U $user -d $database -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('users', 'user_roles', 'system_features', 'audit_logs');" -q

Write-Host "📊 Tabelas principais criadas: $result" -ForegroundColor Cyan

Write-Host ""
Write-Host "✅ SETUP CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "🎯 Sistema robusto instalado e pronto para uso!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Configurar Gmail SMTP (.env.local)" -ForegroundColor White
Write-Host "2. Implementar sistema de 2FA" -ForegroundColor White
Write-Host "3. Criar APIs de autenticação" -ForegroundColor White

