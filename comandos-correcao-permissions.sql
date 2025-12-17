-- =====================================================
-- CORREÇÃO DA TABELA PERMISSIONS - NET IMOBILIÁRIA
-- =====================================================
-- Data: 09/10/2025
-- Status: ✅ BACKUP CRIADO, PROBLEMAS IDENTIFICADOS
-- Próximo: EXECUTAR CORREÇÕES

-- =====================================================
-- PASSO 3: REMOVER DUPLICATAS (Manter versões em maiúsculo)
-- =====================================================

-- Verificar quantos registros serão removidos
SELECT 
    'Registros que serão removidos (versões em minúsculo):' as info,
    COUNT(*) as total_a_remover
FROM permissions 
WHERE action IN ('read', 'create', 'update', 'delete', 'admin');

-- Executar remoção das duplicatas (versões em minúsculo)
DELETE FROM permissions 
WHERE action IN ('read', 'create', 'update', 'delete', 'admin');

-- Verificar resultado
SELECT 'Após remoção das duplicatas:' as info;
SELECT COUNT(*) as total_registros FROM permissions;

-- =====================================================
-- PASSO 4: PADRONIZAR CASE (Garantir que tudo está em maiúsculo)
-- =====================================================

-- Verificar se há registros em minúsculo restantes
SELECT 
    'Verificando registros em minúsculo restantes:' as info,
    COUNT(*) as total_minusculo
FROM permissions 
WHERE action != UPPER(action);

-- Padronizar case (não deve haver nenhum, mas garantindo)
UPDATE permissions 
SET action = UPPER(action) 
WHERE action != UPPER(action);

-- Verificar resultado
SELECT 'Após padronização de case:' as info;
SELECT DISTINCT action FROM permissions ORDER BY action;

-- =====================================================
-- PASSO 5: CORRIGIR DESCRIÇÕES NULAS
-- =====================================================

-- Verificar quantas descrições estão nulas/vazias
SELECT 
    'Descrições nulas/vazias encontradas:' as info,
    COUNT(*) as total_nulas
FROM permissions 
WHERE description IS NULL 
   OR description = 'null' 
   OR description = '';

-- Corrigir descrições baseado na funcionalidade e ação
UPDATE permissions 
SET description = CASE 
    WHEN action = 'READ' THEN CONCAT('Visualizar ', sf.name)
    WHEN action = 'WRITE' THEN CONCAT('Criar e editar ', sf.name)
    WHEN action = 'CREATE' THEN CONCAT('Criar ', sf.name)
    WHEN action = 'UPDATE' THEN CONCAT('Editar ', sf.name)
    WHEN action = 'DELETE' THEN CONCAT('Excluir ', sf.name)
    WHEN action = 'ADMIN' THEN CONCAT('Administrar ', sf.name)
    ELSE CONCAT(action, ' em ', sf.name)
END
FROM system_features sf
WHERE permissions.feature_id = sf.id
  AND (permissions.description IS NULL 
       OR permissions.description = 'null' 
       OR permissions.description = '');

-- Verificar resultado
SELECT 
    'Após correção de descrições:' as info,
    COUNT(*) as total_corrigidas
FROM permissions 
WHERE description IS NOT NULL 
  AND description != 'null' 
  AND description != '';

-- =====================================================
-- PASSO 6: VERIFICAÇÃO FINAL DE INTEGRIDADE
-- =====================================================

-- Verificar se não há mais duplicatas
SELECT 
    'Verificação de duplicatas:' as info,
    COUNT(*) as duplicatas_encontradas
FROM (
    SELECT feature_id, action, COUNT(*) as total
    FROM permissions
    GROUP BY feature_id, action
    HAVING COUNT(*) > 1
) as duplicatas;

-- Mostrar estrutura final
SELECT 
    'Estrutura final da tabela permissions:' as info;
    
SELECT 
    sf.name as funcionalidade,
    sf.category,
    COUNT(p.id) as total_permissoes,
    STRING_AGG(p.action, ', ') as acoes_disponiveis
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
WHERE sf.is_active = true
GROUP BY sf.id, sf.name, sf.category
ORDER BY sf.category, sf.name;

-- Verificar alguns registros de exemplo
SELECT 
    'Exemplos de registros corrigidos:' as info;
    
SELECT 
    p.id,
    sf.name as funcionalidade,
    p.action,
    p.description
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.category = 'admin-panel'
ORDER BY p.id
LIMIT 10;

-- =====================================================
-- RESUMO FINAL
-- =====================================================

SELECT 
    'RESUMO FINAL:' as info,
    (SELECT COUNT(*) FROM permissions) as total_permissions,
    (SELECT COUNT(*) FROM permissions WHERE description IS NOT NULL AND description != '') as permissions_com_descricao,
    (SELECT COUNT(DISTINCT feature_id) FROM permissions) as funcionalidades_com_permissao;

-- =====================================================
-- FIM DA CORREÇÃO
-- =====================================================
