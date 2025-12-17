-- ============================================
-- VERIFICAR CAMPOS 2FA FALTANTES NA TABELA USERS
-- ============================================

-- Verificar campo two_fa_enabled
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_fa_enabled') 
        THEN '✅ Campo two_fa_enabled EXISTE'
        ELSE '❌ Campo two_fa_enabled FALTANDO'
    END as status_two_fa_enabled;

-- Verificar campo two_fa_secret
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_fa_secret') 
        THEN '✅ Campo two_fa_secret EXISTE'
        ELSE '❌ Campo two_fa_secret FALTANDO'
    END as status_two_fa_secret;

-- Mostrar todos os campos da tabela users (para referência)
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;


