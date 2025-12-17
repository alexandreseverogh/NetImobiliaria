-- ============================================
-- DIAGNÓSTICO 2FA - PASSO A PASSO
-- ============================================

-- PASSO 1: Verificar campos na tabela users
SELECT 
    'PASSO 1 - CAMPOS NA TABELA USERS' as verificacao;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_fa_enabled') 
        THEN '✅ Campo two_fa_enabled EXISTE'
        ELSE '❌ Campo two_fa_enabled FALTANDO'
    END as status_two_fa_enabled;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_fa_secret') 
        THEN '✅ Campo two_fa_secret EXISTE'
        ELSE '❌ Campo two_fa_secret FALTANDO'
    END as status_two_fa_secret;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'ultimo_login') 
        THEN '✅ Campo ultimo_login EXISTE'
        ELSE '❌ Campo ultimo_login FALTANDO'
    END as status_ultimo_login;
