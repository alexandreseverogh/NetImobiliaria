-- Reverter hardcoding de permissões do Corretor
-- Essas permissões devem ser gerenciadas via INTERFACE, não SQL!

\echo 'Removendo permissões hardcoded do Corretor...'
\echo '(Corretor deve receber permissões via interface de gestão)'
\echo ''

-- Remover apenas as permissões que foram adicionadas pela migration 006
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM user_roles WHERE name = 'Corretor')
  AND granted_at >= NOW() - INTERVAL '5 minutes'; -- Apenas as recém criadas

\echo ''
\echo '✅ Permissões hardcoded removidas!'
\echo '💡 Use a interface /admin/roles para atribuir permissões ao Corretor'
\echo ''



