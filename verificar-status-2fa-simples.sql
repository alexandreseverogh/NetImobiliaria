-- ============================================
-- VERIFICAR STATUS 2FA - VERSÃO SIMPLES E SEGURA
-- ============================================

-- 1. Verificar campos na tabela users
SELECT 
    'users' as tabela,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('two_fa_enabled', 'two_fa_secret', 'ultimo_login')
ORDER BY column_name;

-- 2. Verificar se tabelas existem
SELECT 
    table_name,
    'EXISTE' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('system_2fa_settings', 'email_settings', 'email_templates')
ORDER BY table_name;

-- 3. Verificar configurações de email (se tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_settings' AND table_schema = 'public') THEN
        RAISE NOTICE 'Tabela email_settings existe - verificando configurações...';
    ELSE
        RAISE NOTICE 'Tabela email_settings NÃO existe';
    END IF;
END $$;

-- 4. Verificar configurações 2FA (se tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_2fa_settings' AND table_schema = 'public') THEN
        RAISE NOTICE 'Tabela system_2fa_settings existe - verificando configurações...';
    ELSE
        RAISE NOTICE 'Tabela system_2fa_settings NÃO existe';
    END IF;
END $$;

-- 5. Verificar templates de email (se tabela existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_templates' AND table_schema = 'public') THEN
        RAISE NOTICE 'Tabela email_templates existe - verificando templates...';
    ELSE
        RAISE NOTICE 'Tabela email_templates NÃO existe';
    END IF;
END $$;

-- 6. Resumo final
SELECT 
    'VERIFICAÇÃO COMPLETA' as status,
    NOW() as executado_em;
