-- ============================================
-- DIAGNÓSTICO 2FA - PASSO 3
-- ============================================

-- PASSO 3: Verificar estrutura das tabelas (se existirem)

-- 3.1 - Estrutura da tabela email_settings
SELECT 
    'PASSO 3.1 - ESTRUTURA email_settings' as verificacao;

SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'email_settings' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3.2 - Estrutura da tabela email_templates
SELECT 
    'PASSO 3.2 - ESTRUTURA email_templates' as verificacao;

SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'email_templates' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3.3 - Estrutura da tabela system_2fa_settings
SELECT 
    'PASSO 3.3 - ESTRUTURA system_2fa_settings' as verificacao;

SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'system_2fa_settings' 
AND table_schema = 'public'
ORDER BY ordinal_position;


