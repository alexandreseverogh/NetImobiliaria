# ============================================================
# ROLLBACK SCRIPT - SIDEBAR E PERMISSÕES (PowerShell)
# ============================================================
# Este script reverte todas as mudanças feitas durante a
# refatoração da sidebar e sistema de permissões.
# ============================================================

Write-Host "🔄 Iniciando rollback da sidebar e permissões..." -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos na branch correta
$currentBranch = git branch --show-current
if ($currentBranch -ne "refactor/sidebar-permissions") {
    Write-Host "⚠️  AVISO: Você não está na branch 'refactor/sidebar-permissions'" -ForegroundColor Yellow
    Write-Host "   Branch atual: $currentBranch" -ForegroundColor Yellow
    $continue = Read-Host "   Deseja continuar mesmo assim? (s/N)"
    if ($continue -ne "s" -and $continue -ne "S") {
        Write-Host "❌ Rollback cancelado pelo usuário" -ForegroundColor Red
        exit 1
    }
}

# Confirmar ação
Write-Host "⚠️  ATENÇÃO: Esta operação vai reverter TODAS as mudanças!" -ForegroundColor Yellow
Write-Host "   Commit de backup: 7b073f0" -ForegroundColor Yellow
$confirm = Read-Host "   Deseja continuar? (s/N)"
if ($confirm -ne "s" -and $confirm -ne "S") {
    Write-Host "❌ Rollback cancelado pelo usuário" -ForegroundColor Red
    exit 1
}

# Fazer backup das mudanças atuais (opcional)
Write-Host ""
Write-Host "📦 Criando backup das mudanças atuais..." -ForegroundColor Cyan
git commit -am "BACKUP: Antes do rollback" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "   Nenhuma mudança para commitar" -ForegroundColor Gray
}

# Reverter para o commit de backup
Write-Host ""
Write-Host "🔄 Revertendo para commit 7b073f0..." -ForegroundColor Cyan
git reset --hard 7b073f0

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Rollback concluído com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Status atual:" -ForegroundColor Cyan
    git log --oneline -5
    Write-Host ""
    Write-Host "🔍 Verificando integridade dos arquivos..." -ForegroundColor Cyan
    Write-Host ""
    
    # Verificar se arquivos críticos existem
    $filesToCheck = @(
        "src/components/admin/AdminSidebar.tsx",
        "src/lib/database/userPermissions.ts",
        "src/app/admin/login-logs/page.tsx"
    )
    
    foreach ($file in $filesToCheck) {
        if (Test-Path $file) {
            Write-Host "✅ $file - OK" -ForegroundColor Green
        } else {
            Write-Host "❌ $file - NÃO ENCONTRADO" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "🎉 Rollback completo! Sistema restaurado ao estado anterior." -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Teste o sistema para verificar que tudo está funcionando"
    Write-Host "   2. Se estiver tudo OK, você pode continuar a refatoração"
    Write-Host "   3. Se houver problemas, execute: git reset --hard HEAD~1"
    
} else {
    Write-Host ""
    Write-Host "❌ Erro ao fazer rollback!" -ForegroundColor Red
    Write-Host "   Verifique a mensagem de erro acima" -ForegroundColor Red
    exit 1
}
