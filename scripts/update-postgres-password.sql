-- =====================================================
-- SCRIPT PARA ALTERAR SENHA DO POSTGRESQL
-- Net Imobiliária - Atualização de Segurança
-- =====================================================

-- Alterar a senha do usuário postgres para uma senha forte
ALTER USER postgres PASSWORD '6pR:b-=<*,.<_35%MrFKrIq0Z#fLi+}V';

-- Verificar se a alteração foi aplicada
SELECT usename, passwd IS NOT NULL as has_password 
FROM pg_user 
WHERE usename = 'postgres';

-- Mostrar mensagem de confirmação
DO $$
BEGIN
    RAISE NOTICE '✅ Senha do usuário postgres alterada com sucesso!';
    RAISE NOTICE '🔒 Nova senha aplicada: 6pR:b-=<*,.<_35%MrFKrIq0Z#fLi+}V';
    RAISE NOTICE '⚠️  Lembre-se de atualizar o arquivo .env.local também!';
END $$;
