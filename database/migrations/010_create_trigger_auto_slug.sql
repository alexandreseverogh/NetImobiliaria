-- ============================================================
-- MIGRATION 010: Criar trigger para gerar slug automaticamente
-- Data: 2025-10-29
-- Objetivo: Gerar slug automaticamente ao inserir/atualizar system_features
-- ============================================================

-- 1. CRIAR FUNÇÃO QUE GERA SLUG
CREATE OR REPLACE FUNCTION generate_slug_for_system_features()
RETURNS TRIGGER AS $$
BEGIN
    -- Se slug não foi fornecido OU está vazio, gera automaticamente
    IF NEW.slug IS NULL OR TRIM(NEW.slug) = '' THEN
        -- Gerar slug a partir do name
        NEW.slug := normalize_to_slug(NEW.name);
        
        -- Garantir que é único (se já existe, adiciona sufixo)
        DECLARE
            v_count INTEGER;
            v_suffix INTEGER := 1;
            v_base_slug TEXT := NEW.slug;
        BEGIN
            LOOP
                -- Verificar se slug já existe (excluindo o próprio registro se for UPDATE)
                SELECT COUNT(*) INTO v_count
                FROM system_features
                WHERE slug = NEW.slug
                  AND (TG_OP = 'INSERT' OR id != NEW.id);
                
                -- Se não existe, sair do loop
                EXIT WHEN v_count = 0;
                
                -- Se existe, adicionar sufixo
                NEW.slug := v_base_slug || '-' || v_suffix;
                v_suffix := v_suffix + 1;
            END LOOP;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. CRIAR TRIGGER
DROP TRIGGER IF EXISTS trigger_generate_slug ON system_features;

CREATE TRIGGER trigger_generate_slug
    BEFORE INSERT OR UPDATE ON system_features
    FOR EACH ROW
    EXECUTE FUNCTION generate_slug_for_system_features();

-- 3. COMENTÁRIO
COMMENT ON FUNCTION generate_slug_for_system_features() IS 
    'Gera slug automaticamente baseado no name - garante unicidade com sufixo se necessário';

\echo ''
\echo '✅ Trigger criado com sucesso!'
\echo ''
\echo '🧪 TESTE: Inserindo funcionalidade sem slug...'

-- 4. TESTE DO TRIGGER
INSERT INTO system_features (name, url, category_id, "Crud_Execute", is_active)
VALUES ('Teste de Contratos', '/admin/teste-contratos', 1, 'CRUD', false)
RETURNING id, name, slug;

\echo ''
\echo '✅ Se slug foi gerado automaticamente, trigger está funcionando!'
\echo ''

-- Remover teste
DELETE FROM system_features WHERE name = 'Teste de Contratos';

\echo '🧹 Teste removido'
\echo ''
\echo '============================================================'
\echo '✅ MIGRATION 010 CONCLUÍDA - Trigger ativo!'
\echo '============================================================'



