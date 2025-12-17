-- ESTRATÉGIA HÍBRIDA PARA FICHA COMPLETA DO IMÓVEL
-- Combina performance com excelente experiência do usuário

-- =====================================================
-- 1. VIEW MATERIALIZADA PARA DADOS BÁSICOS + IMAGEM PRINCIPAL
-- =====================================================

-- Esta view carrega instantaneamente (0-200ms)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_imoveis_basicos_completos AS
SELECT 
    i.id,
    i.codigo,
    i.titulo,
    i.descricao,
    i.endereco,
    i.numero,
    i.complemento,
    i.bairro,
    i.cep,
    i.latitude,
    i.longitude,
    i.preco,
    i.preco_condominio,
    i.preco_iptu,
    i.taxa_extra,
    i.area_total,
    i.area_construida,
    i.quartos,
    i.banheiros,
    i.suites,
    i.vagas_garagem,
    i.varanda,
    i.andar,
    i.total_andares,
    i.ano_construcao,
    i.mobiliado,
    i.aceita_permuta,
    i.aceita_financiamento,
    i.destaque,
    i.ativo,
    i.created_at,
    i.updated_at,
    -- Dados de relacionamento
    i.estado_fk,
    i.cidade_fk,
    i.tipo_fk,
    i.finalidade_fk,
    i.status_fk,
    -- Nomes das tabelas de relacionamento
    ti.nome as tipo_nome,
    fi.nome as finalidade_nome,
    si.nome as status_nome,
    si.cor as status_cor,
    -- Imagem principal (carregada imediatamente)
    json_build_object(
        'id', img.id,
        'tipo_mime', img.tipo_mime,
        'tamanho_bytes', img.tamanho_bytes,
        'ordem', img.ordem,
        'principal', img.principal,
        'url', '/api/imoveis/' || i.id || '/imagens/' || img.id
    ) as imagem_principal,
    -- Contadores para carregamento progressivo
    (SELECT COUNT(*) FROM imovel_imagens WHERE imovel_id = i.id) as total_imagens,
    (SELECT COUNT(*) FROM imovel_amenidades WHERE imovel_id = i.id) as total_amenidades,
    (SELECT COUNT(*) FROM imovel_proximidades WHERE imovel_id = i.id) as total_proximidades,
    (SELECT COUNT(*) FROM documento_imovel WHERE imovel_fk = i.id AND ativo = true) as total_documentos,
    -- Flag para consulta de internauta
    si.consulta_imovel_internauta
FROM imoveis i
LEFT JOIN tipos_imovel ti ON i.tipo_fk = ti.id
LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
LEFT JOIN status_imovel si ON i.status_fk = si.id
LEFT JOIN imovel_imagens img ON i.id = img.imovel_id AND img.principal = true
WHERE i.ativo = true;

-- =====================================================
-- 2. VIEW MATERIALIZADA PARA AMENIDADES DETALHADAS
-- =====================================================

-- Esta view carrega em segundo plano (200-500ms)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_imoveis_amenidades_detalhadas AS
SELECT 
    i.id as imovel_id,
    i.codigo,
    -- Amenidades agrupadas por categoria
    COALESCE(
        json_object_agg(
            ca.nome,
            json_agg(
                json_build_object(
                    'id', a.id,
                    'nome', a.nome,
                    'descricao', a.descricao,
                    'icone', a.icone,
                    'popular', a.popular,
                    'ordem', a.ordem
                ) ORDER BY a.ordem, a.nome
            )
        ) FILTER (WHERE ca.nome IS NOT NULL),
        '{}'::json
    ) as amenidades_por_categoria,
    -- Lista simples de amenidades
    COALESCE(
        json_agg(
            json_build_object(
                'id', a.id,
                'nome', a.nome,
                'categoria', ca.nome,
                'icone', a.icone
            )
        ) FILTER (WHERE a.id IS NOT NULL),
        '[]'::json
    ) as amenidades_lista
FROM imoveis i
LEFT JOIN imovel_amenidades ia ON i.id = ia.imovel_id
LEFT JOIN amenidades a ON ia.amenidade_id = a.id AND a.ativo = true
LEFT JOIN categorias_amenidades ca ON a.categoria_id = ca.id AND ca.ativo = true
WHERE i.ativo = true
GROUP BY i.id, i.codigo;

-- =====================================================
-- 3. VIEW MATERIALIZADA PARA PROXIMIDADES DETALHADAS
-- =====================================================

-- Esta view carrega em segundo plano (200-500ms)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_imoveis_proximidades_detalhadas AS
SELECT 
    i.id as imovel_id,
    i.codigo,
    -- Proximidades agrupadas por categoria
    COALESCE(
        json_object_agg(
            cp.nome,
            json_agg(
                json_build_object(
                    'id', p.id,
                    'nome', p.nome,
                    'descricao', p.descricao,
                    'icone', p.icone,
                    'distancia_metros', ip.distancia_metros,
                    'tempo_caminhada', ip.tempo_caminhada,
                    'observacoes', ip.observacoes,
                    'popular', p.popular,
                    'ordem', p.ordem
                ) ORDER BY p.ordem, p.nome
            )
        ) FILTER (WHERE cp.nome IS NOT NULL),
        '{}'::json
    ) as proximidades_por_categoria,
    -- Lista simples de proximidades
    COALESCE(
        json_agg(
            json_build_object(
                'id', p.id,
                'nome', p.nome,
                'categoria', cp.nome,
                'icone', p.icone,
                'distancia_metros', ip.distancia_metros,
                'tempo_caminhada', ip.tempo_caminhada
            )
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'::json
    ) as proximidades_lista
FROM imoveis i
LEFT JOIN imovel_proximidades ip ON i.id = ip.imovel_id
LEFT JOIN proximidades p ON ip.proximidade_id = p.id AND p.ativo = true
LEFT JOIN categorias_proximidades cp ON p.categoria_id = cp.id AND cp.ativo = true
WHERE i.ativo = true
GROUP BY i.id, i.codigo;

-- =====================================================
-- 4. VIEW MATERIALIZADA PARA TODAS AS IMAGENS
-- =====================================================

-- Esta view carrega sob demanda (quando clicado)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_imoveis_imagens_completas AS
SELECT 
    i.id as imovel_id,
    i.codigo,
    -- Todas as imagens ordenadas
    COALESCE(
        json_agg(
            json_build_object(
                'id', img.id,
                'tipo_mime', img.tipo_mime,
                'tamanho_bytes', img.tamanho_bytes,
                'ordem', img.ordem,
                'principal', img.principal,
                'url', '/api/imoveis/' || i.id || '/imagens/' || img.id,
                'thumbnail_url', '/api/imoveis/' || i.id || '/imagens/' || img.id || '/thumbnail'
            ) ORDER BY img.principal DESC, img.ordem, img.id
        ) FILTER (WHERE img.id IS NOT NULL),
        '[]'::json
    ) as imagens
FROM imoveis i
LEFT JOIN imovel_imagens img ON i.id = img.imovel_id
WHERE i.ativo = true
GROUP BY i.id, i.codigo;

-- =====================================================
-- 5. VIEW MATERIALIZADA PARA VÍDEOS
-- =====================================================

-- Esta view carrega sob demanda (quando clicado)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_imoveis_videos AS
SELECT 
    i.id as imovel_id,
    i.codigo,
    -- Vídeos do imóvel
    COALESCE(
        json_agg(
            json_build_object(
                'id', v.id,
                'nome_arquivo', v.nome_arquivo,
                'tipo_mime', v.tipo_mime,
                'tamanho_bytes', v.tamanho_bytes,
                'duracao_segundos', v.duracao_segundos,
                'resolucao', v.resolucao,
                'formato', v.formato,
                'url', '/api/imoveis/' || i.id || '/video/' || v.id,
                'thumbnail_url', '/api/imoveis/' || i.id || '/video/' || v.id || '/thumbnail'
            )
        ) FILTER (WHERE v.id IS NOT NULL),
        '[]'::json
    ) as videos
FROM imoveis i
LEFT JOIN imovel_video v ON i.id = v.imovel_id AND v.ativo = true
WHERE i.ativo = true
GROUP BY i.id, i.codigo;

-- =====================================================
-- 6. VIEW MATERIALIZADA PARA DOCUMENTOS
-- =====================================================

-- Esta view carrega sob demanda (quando clicado)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_imoveis_documentos_completos AS
SELECT 
    i.id as imovel_id,
    i.codigo,
    -- Documentos do imóvel
    COALESCE(
        json_agg(
            json_build_object(
                'id', d.id,
                'nome_arquivo', d.nome_arquivo,
                'tipo_mime', d.tipo_mime,
                'tamanho_bytes', d.tamanho_bytes,
                'tipo_documento', td.descricao,
                'url', '/api/imoveis/' || i.id || '/documentos/' || d.id,
                'data_upload', d.created_at
            )
        ) FILTER (WHERE d.id IS NOT NULL),
        '[]'::json
    ) as documentos
FROM imoveis i
LEFT JOIN documento_imovel d ON i.id = d.imovel_fk AND d.ativo = true
LEFT JOIN tipo_documento_imovel td ON d.id_tipo_documento = td.id AND td.ativo = true
LEFT JOIN status_imovel si ON i.status_fk = si.id
WHERE i.ativo = true AND si.consulta_imovel_internauta = true
GROUP BY i.id, i.codigo;

-- =====================================================
-- 7. ÍNDICES PARA PERFORMANCE MÁXIMA
-- =====================================================

-- Índices para busca principal
CREATE INDEX IF NOT EXISTS idx_mv_imoveis_basicos_search 
ON mv_imoveis_basicos_completos(estado_fk, cidade_fk, finalidade_fk, ativo);

CREATE INDEX IF NOT EXISTS idx_mv_imoveis_basicos_preco 
ON mv_imoveis_basicos_completos(preco) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_mv_imoveis_basicos_quartos 
ON mv_imoveis_basicos_completos(quartos) WHERE ativo = true;

-- Índices para views de detalhes
CREATE INDEX IF NOT EXISTS idx_mv_imoveis_amenidades_detalhadas_id 
ON mv_imoveis_amenidades_detalhadas(imovel_id);

CREATE INDEX IF NOT EXISTS idx_mv_imoveis_proximidades_detalhadas_id 
ON mv_imoveis_proximidades_detalhadas(imovel_id);

CREATE INDEX IF NOT EXISTS idx_mv_imoveis_imagens_completas_id 
ON mv_imoveis_imagens_completas(imovel_id);

CREATE INDEX IF NOT EXISTS idx_mv_imoveis_videos_id 
ON mv_imoveis_videos(imovel_id);

CREATE INDEX IF NOT EXISTS idx_mv_imoveis_documentos_completos_id 
ON mv_imoveis_documentos_completos(imovel_id);

-- =====================================================
-- 8. FUNÇÃO PARA ATUALIZAR TODAS AS VIEWS
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_complete_property_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_imoveis_basicos_completos;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_imoveis_amenidades_detalhadas;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_imoveis_proximidades_detalhadas;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_imoveis_imagens_completas;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_imoveis_videos;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_imoveis_documentos_completos;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. VERIFICAR IMPLEMENTAÇÃO
-- =====================================================

-- Verificar views criadas
SELECT 
    schemaname,
    matviewname,
    pg_size_pretty(pg_total_relation_size(oid)) as size
FROM pg_matviews 
WHERE matviewname LIKE 'mv_imoveis_%'
ORDER BY matviewname;







