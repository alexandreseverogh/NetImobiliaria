-- ESTRATÉGIA COMPLETA PARA OTIMIZAÇÃO DE CONSULTAS PÚBLICAS
-- Baseada nos cenários futuros da aplicação

-- =====================================================
-- 1. ÍNDICES OTIMIZADOS PARA CONSULTAS DE INTERNAUTAS
-- =====================================================

-- Índice composto para busca principal (Estado + Cidade + Finalidade)
-- Este é o MAIS IMPORTANTE para 80% das consultas
CREATE INDEX IF NOT EXISTS idx_imoveis_public_search 
ON imoveis(estado_fk, cidade_fk, finalidade_fk, ativo, status_fk);

-- Índice para filtros de preço (muito comum)
CREATE INDEX IF NOT EXISTS idx_imoveis_preco_range 
ON imoveis(preco) WHERE ativo = true;

-- Índice para filtros de quartos (muito comum)
CREATE INDEX IF NOT EXISTS idx_imoveis_quartos 
ON imoveis(quartos) WHERE ativo = true;

-- Índice para filtros de área (comum)
CREATE INDEX IF NOT EXISTS idx_imoveis_area_total 
ON imoveis(area_total) WHERE ativo = true;

-- Índice para busca por código (único)
-- Já existe: imoveis_codigo_key

-- =====================================================
-- 2. VIEW MATERIALIZADA PARA AMENIDADES E PROXIMIDADES
-- =====================================================

-- View materializada para amenidades (CRÍTICO para performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_imoveis_amenidades AS
SELECT 
    i.id as imovel_id,
    i.codigo,
    i.titulo,
    i.estado_fk,
    i.cidade_fk,
    i.finalidade_fk,
    i.status_fk,
    i.ativo,
    i.preco,
    i.quartos,
    i.area_total,
    i.bairro,
    -- Amenidades como JSON array
    COALESCE(
        json_agg(
            json_build_object(
                'id', a.id,
                'nome', a.nome,
                'descricao', a.descricao,
                'icone', a.icone,
                'categoria_nome', ca.nome,
                'categoria_cor', ca.cor
            )
        ) FILTER (WHERE a.id IS NOT NULL),
        '[]'::json
    ) as amenidades
FROM imoveis i
LEFT JOIN imovel_amenidades ia ON i.id = ia.imovel_id
LEFT JOIN amenidades a ON ia.amenidade_id = a.id AND a.ativo = true
LEFT JOIN categorias_amenidades ca ON a.categoria_id = ca.id AND ca.ativo = true
WHERE i.ativo = true
GROUP BY i.id, i.codigo, i.titulo, i.estado_fk, i.cidade_fk, i.finalidade_fk, i.status_fk, i.ativo, i.preco, i.quartos, i.area_total, i.bairro;

-- View materializada para proximidades (CRÍTICO para performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_imoveis_proximidades AS
SELECT 
    i.id as imovel_id,
    i.codigo,
    i.titulo,
    i.estado_fk,
    i.cidade_fk,
    i.finalidade_fk,
    i.status_fk,
    i.ativo,
    i.preco,
    i.quartos,
    i.area_total,
    i.bairro,
    -- Proximidades como JSON array
    COALESCE(
        json_agg(
            json_build_object(
                'id', p.id,
                'nome', p.nome,
                'descricao', p.descricao,
                'icone', p.icone,
                'categoria_nome', cp.nome,
                'categoria_cor', cp.cor,
                'distancia_metros', ip.distancia_metros,
                'tempo_caminhada', ip.tempo_caminhada,
                'observacoes', ip.observacoes
            )
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'::json
    ) as proximidades
FROM imoveis i
LEFT JOIN imovel_proximidades ip ON i.id = ip.imovel_id
LEFT JOIN proximidades p ON ip.proximidade_id = p.id AND p.ativo = true
LEFT JOIN categorias_proximidades cp ON p.categoria_id = cp.id AND cp.ativo = true
WHERE i.ativo = true
GROUP BY i.id, i.codigo, i.titulo, i.estado_fk, i.cidade_fk, i.finalidade_fk, i.status_fk, i.ativo, i.preco, i.quartos, i.area_total, i.bairro;

-- =====================================================
-- 3. VIEW MATERIALIZADA PARA IMAGENS PRINCIPAIS
-- =====================================================

-- View materializada para imagens principais (CRÍTICO para performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_imoveis_imagens_principais AS
SELECT 
    i.id as imovel_id,
    i.codigo,
    i.titulo,
    i.estado_fk,
    i.cidade_fk,
    i.finalidade_fk,
    i.status_fk,
    i.ativo,
    i.preco,
    i.quartos,
    i.area_total,
    i.bairro,
    -- Imagem principal
    json_build_object(
        'id', img.id,
        'nome_arquivo', img.nome_arquivo,
        'url', img.url,
        'alt_text', img.alt_text,
        'ordem', img.ordem,
        'principal', img.principal
    ) as imagem_principal,
    -- Total de imagens
    COUNT(img.id) as total_imagens
FROM imoveis i
LEFT JOIN imovel_imagens img ON i.id = img.imovel_id AND img.principal = true AND img.ativo = true
WHERE i.ativo = true
GROUP BY i.id, i.codigo, i.titulo, i.estado_fk, i.cidade_fk, i.finalidade_fk, i.status_fk, i.ativo, i.preco, i.quartos, i.area_total, i.bairro, img.id, img.nome_arquivo, img.url, img.alt_text, img.ordem, img.principal;

-- =====================================================
-- 4. VIEW MATERIALIZADA PARA DOCUMENTOS
-- =====================================================

-- View materializada para documentos (quando consulta_imovel_internauta = true)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_imoveis_documentos AS
SELECT 
    i.id as imovel_id,
    i.codigo,
    i.titulo,
    i.estado_fk,
    i.cidade_fk,
    i.finalidade_fk,
    i.status_fk,
    i.ativo,
    i.preco,
    i.quartos,
    i.area_total,
    i.bairro,
    -- Documentos como JSON array
    COALESCE(
        json_agg(
            json_build_object(
                'id', d.id,
                'nome_arquivo', d.nome_arquivo,
                'url', d.url,
                'tipo_documento', td.descricao,
                'tamanho_bytes', d.tamanho_bytes,
                'data_upload', d.created_at
            )
        ) FILTER (WHERE d.id IS NOT NULL),
        '[]'::json
    ) as documentos
FROM imoveis i
LEFT JOIN documento_imovel d ON i.id = d.imovel_fk AND d.ativo = true
LEFT JOIN tipo_documento_imovel td ON d.tipo_documento_id = td.id AND td.ativo = true
LEFT JOIN status_imovel si ON i.status_fk = si.id
WHERE i.ativo = true AND si.consulta_imovel_internauta = true
GROUP BY i.id, i.codigo, i.titulo, i.estado_fk, i.cidade_fk, i.finalidade_fk, i.status_fk, i.ativo, i.preco, i.quartos, i.area_total, i.bairro;

-- =====================================================
-- 5. ÍNDICES PARA VIEWS MATERIALIZADAS
-- =====================================================

-- Índices para mv_imoveis_amenidades
CREATE INDEX IF NOT EXISTS idx_mv_imoveis_amenidades_search 
ON mv_imoveis_amenidades(estado_fk, cidade_fk, finalidade_fk, ativo);

CREATE INDEX IF NOT EXISTS idx_mv_imoveis_amenidades_preco 
ON mv_imoveis_amenidades(preco) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_mv_imoveis_amenidades_quartos 
ON mv_imoveis_amenidades(quartos) WHERE ativo = true;

-- Índices para mv_imoveis_proximidades
CREATE INDEX IF NOT EXISTS idx_mv_imoveis_proximidades_search 
ON mv_imoveis_proximidades(estado_fk, cidade_fk, finalidade_fk, ativo);

CREATE INDEX IF NOT EXISTS idx_mv_imoveis_proximidades_preco 
ON mv_imoveis_proximidades(preco) WHERE ativo = true;

-- Índices para mv_imoveis_imagens_principais
CREATE INDEX IF NOT EXISTS idx_mv_imoveis_imagens_search 
ON mv_imoveis_imagens_principais(estado_fk, cidade_fk, finalidade_fk, ativo);

-- Índices para mv_imoveis_documentos
CREATE INDEX IF NOT EXISTS idx_mv_imoveis_documentos_search 
ON mv_imoveis_documentos(estado_fk, cidade_fk, finalidade_fk, ativo);

-- =====================================================
-- 6. FUNÇÃO PARA ATUALIZAR VIEWS MATERIALIZADAS
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_imoveis_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_imoveis_amenidades;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_imoveis_proximidades;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_imoveis_imagens_principais;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_imoveis_documentos;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Função para atualizar views quando imóvel é modificado
CREATE OR REPLACE FUNCTION trigger_refresh_imoveis_views()
RETURNS trigger AS $$
BEGIN
    -- Atualizar views materializadas de forma assíncrona
    PERFORM pg_notify('refresh_imoveis_views', '');
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar views quando imóvel é modificado
DROP TRIGGER IF EXISTS trg_refresh_imoveis_views ON imoveis;
CREATE TRIGGER trg_refresh_imoveis_views
    AFTER INSERT OR UPDATE OR DELETE ON imoveis
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_imoveis_views();

-- =====================================================
-- 8. VERIFICAR ESTRUTURA FINAL
-- =====================================================

-- Verificar índices criados
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_indexes 
WHERE tablename IN ('imoveis', 'mv_imoveis_amenidades', 'mv_imoveis_proximidades', 'mv_imoveis_imagens_principais', 'mv_imoveis_documentos')
ORDER BY tablename, indexname;

-- Verificar views materializadas
SELECT 
    schemaname,
    matviewname,
    pg_size_pretty(pg_total_relation_size(oid)) as size
FROM pg_matviews 
WHERE matviewname LIKE 'mv_imoveis_%'
ORDER BY matviewname;







