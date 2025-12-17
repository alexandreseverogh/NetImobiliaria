@echo off
echo ===============================================
echo SETUP DO BANCO DE DADOS - SISTEMA ROBUSTO
echo Net Imobiliária - Fase 1 - Dia 1-3
echo ===============================================
echo.

echo [1/3] Executando script de criação das tabelas...
psql -h localhost -U postgres -d net_imobiliaria -f "01_create_tables.sql"
if %errorlevel% neq 0 (
    echo ERRO: Falha ao criar as tabelas!
    pause
    exit /b 1
)
echo ✅ Tabelas criadas com sucesso!
echo.

echo [2/3] Executando script de seed com dados iniciais...
psql -h localhost -U postgres -d net_imobiliaria -f "02_seed_initial_data.sql"
if %errorlevel% neq 0 (
    echo ERRO: Falha ao inserir dados iniciais!
    pause
    exit /b 1
)
echo ✅ Dados iniciais inseridos com sucesso!
echo.

echo [3/3] Verificando instalação...
psql -h localhost -U postgres -d net_imobiliaria -c "SELECT 'Instalação concluída!' as status, COUNT(*) as total_tabelas FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%user%' OR tablename LIKE '%audit%' OR tablename LIKE '%email%';"

echo.
echo ===============================================
echo ✅ SETUP CONCLUÍDO COM SUCESSO!
echo ===============================================
echo.
echo Próximos passos:
echo 1. Configurar Gmail SMTP (.env.local)
echo 2. Implementar sistema de 2FA
echo 3. Criar APIs de autenticação
echo.
pause



