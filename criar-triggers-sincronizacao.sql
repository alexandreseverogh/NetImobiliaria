-- =====================================================
-- TRIGGERS PARA SINCRONIZAÇÃO CONTROLADA
-- system_feature_categorias = FONTE DA VERDADE
-- system_features.category_id = CACHE/ÍNDICE
-- =====================================================

-- Função para sincronizar system_features.category_id quando system_feature_categorias muda
CREATE OR REPLACE FUNCTION sync_feature_category_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Se é INSERT ou UPDATE, atualizar category_id
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Se é UPDATE e a categoria mudou, limpar a categoria antiga primeiro
        IF TG_OP = 'UPDATE' AND OLD.category_id != NEW.category_id THEN
            UPDATE system_features 
            SET category_id = NULL 
            WHERE id = OLD.feature_id AND category_id = OLD.category_id;
        END IF;
        
        -- Atualizar com a nova categoria
        UPDATE system_features 
        SET category_id = NEW.category_id 
        WHERE id = NEW.feature_id;
        
        RETURN NEW;
    END IF;
    
    -- Se é DELETE, limpar category_id
    IF TG_OP = 'DELETE' THEN
        UPDATE system_features 
        SET category_id = NULL 
        WHERE id = OLD.feature_id AND category_id = OLD.category_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para INSERT em system_feature_categorias
DROP TRIGGER IF EXISTS trigger_sync_feature_category_insert ON system_feature_categorias;
CREATE TRIGGER trigger_sync_feature_category_insert
    AFTER INSERT ON system_feature_categorias
    FOR EACH ROW
    EXECUTE FUNCTION sync_feature_category_id();

-- Trigger para UPDATE em system_feature_categorias
DROP TRIGGER IF EXISTS trigger_sync_feature_category_update ON system_feature_categorias;
CREATE TRIGGER trigger_sync_feature_category_update
    AFTER UPDATE ON system_feature_categorias
    FOR EACH ROW
    EXECUTE FUNCTION sync_feature_category_id();

-- Trigger para DELETE em system_feature_categorias
DROP TRIGGER IF EXISTS trigger_sync_feature_category_delete ON system_feature_categorias;
CREATE TRIGGER trigger_sync_feature_category_delete
    AFTER DELETE ON system_feature_categorias
    FOR EACH ROW
    EXECUTE FUNCTION sync_feature_category_id();

-- =====================================================
-- FUNÇÃO DE VALIDAÇÃO DE CONSISTÊNCIA
-- =====================================================

CREATE OR REPLACE FUNCTION validate_feature_category_consistency()
RETURNS TABLE(
    feature_id INTEGER,
    feature_name VARCHAR,
    sf_category_id INTEGER,
    sfc_category_id INTEGER,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sf.id as feature_id,
        sf.name as feature_name,
        sf.category_id as sf_category_id,
        sfc.category_id as sfc_category_id,
        CASE 
            WHEN sf.category_id IS NULL AND sfc.category_id IS NULL THEN 'SEM_CATEGORIA'
            WHEN sf.category_id IS NULL AND sfc.category_id IS NOT NULL THEN 'SF_NULL'
            WHEN sf.category_id IS NOT NULL AND sfc.category_id IS NULL THEN 'SFC_NULL'
            WHEN sf.category_id = sfc.category_id THEN 'CONSISTENTE'
            ELSE 'INCONSISTENTE'
        END as status
    FROM system_features sf
    LEFT JOIN system_feature_categorias sfc ON sf.id = sfc.feature_id
    ORDER BY sf.name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO DE SINCRONIZAÇÃO MANUAL
-- =====================================================

CREATE OR REPLACE FUNCTION sync_all_feature_categories()
RETURNS TABLE(
    feature_id INTEGER,
    feature_name VARCHAR,
    action TEXT
) AS $$
DECLARE
    rec RECORD;
BEGIN
    -- Limpar todas as categorias em system_features
    UPDATE system_features SET category_id = NULL;
    
    -- Repopular baseado em system_feature_categorias
    FOR rec IN 
        SELECT DISTINCT sfc.feature_id, sf.name as feature_name
        FROM system_feature_categorias sfc
        JOIN system_features sf ON sfc.feature_id = sf.id
    LOOP
        -- Pegar a categoria mais recente para cada funcionalidade
        UPDATE system_features 
        SET category_id = (
            SELECT sfc.category_id 
            FROM system_feature_categorias sfc 
            WHERE sfc.feature_id = rec.feature_id 
            ORDER BY sfc.created_at DESC 
            LIMIT 1
        )
        WHERE id = rec.feature_id;
        
        RETURN QUERY SELECT rec.feature_id, rec.feature_name, 'SYNCED';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION sync_feature_category_id() IS 
'Função trigger para manter system_features.category_id sincronizado com system_feature_categorias';

COMMENT ON FUNCTION validate_feature_category_consistency() IS 
'Função para validar consistência entre system_features.category_id e system_feature_categorias';

COMMENT ON FUNCTION sync_all_feature_categories() IS 
'Função para sincronização manual de todas as categorias de funcionalidades';

-- =====================================================
-- TESTE DOS TRIGGERS
-- =====================================================

-- Verificar se os triggers foram criados
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%sync_feature_category%'
ORDER BY trigger_name;
