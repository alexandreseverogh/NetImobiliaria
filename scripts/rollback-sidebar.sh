#!/bin/bash

# ============================================================
# ROLLBACK SCRIPT - SIDEBAR E PERMISSÕES
# ============================================================
# Este script reverte todas as mudanças feitas durante a
# refatoração da sidebar e sistema de permissões.
# ============================================================

echo "🔄 Iniciando rollback da sidebar e permissões..."
echo ""

# Verificar se estamos na branch correta
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "refactor/sidebar-permissions" ]; then
    echo "⚠️  AVISO: Você não está na branch 'refactor/sidebar-permissions'"
    echo "   Branch atual: $CURRENT_BRANCH"
    read -p "   Deseja continuar mesmo assim? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "❌ Rollback cancelado pelo usuário"
        exit 1
    fi
fi

# Confirmar ação
echo "⚠️  ATENÇÃO: Esta operação vai reverter TODAS as mudanças!"
echo "   Commit de backup: 7b073f0"
read -p "   Deseja continuar? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Rollback cancelado pelo usuário"
    exit 1
fi

# Fazer backup das mudanças atuais (opcional)
echo ""
echo "📦 Criando backup das mudanças atuais..."
git commit -am "BACKUP: Antes do rollback" || echo "Nenhuma mudança para commitar"

# Reverter para o commit de backup
echo ""
echo "🔄 Revertendo para commit 7b073f0..."
git reset --hard 7b073f0

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Rollback concluído com sucesso!"
    echo ""
    echo "📋 Status atual:"
    git log --oneline -5
    echo ""
    echo "🔍 Verificando integridade dos arquivos..."
    echo ""
    
    # Verificar se arquivos críticos existem
    FILES_TO_CHECK=(
        "src/components/admin/AdminSidebar.tsx"
        "src/lib/database/userPermissions.ts"
        "src/app/admin/login-logs/page.tsx"
    )
    
    for file in "${FILES_TO_CHECK[@]}"; do
        if [ -f "$file" ]; then
            echo "✅ $file - OK"
        else
            echo "❌ $file - NÃO ENCONTRADO"
        fi
    done
    
    echo ""
    echo "🎉 Rollback completo! Sistema restaurado ao estado anterior."
    echo ""
    echo "📝 Próximos passos:"
    echo "   1. Teste o sistema para verificar que tudo está funcionando"
    echo "   2. Se estiver tudo OK, você pode continuar a refatoração"
    echo "   3. Se houver problemas, execute: git reset --hard HEAD~1"
    
else
    echo ""
    echo "❌ Erro ao fazer rollback!"
    echo "   Verifique a mensagem de erro acima"
    exit 1
fi
