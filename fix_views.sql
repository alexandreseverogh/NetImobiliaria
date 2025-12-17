-- Script para corrigir as views materializadas

-- Remover views problemáticas
DROP MATERIALIZED VIEW IF EXISTS mv_imoveis_basicos_completos;
DROP MATERIALIZED VIEW IF EXISTS mv_imoveis_amenidades_detalhadas;
DROP MATERIALIZED VIEW IF EXISTS mv_imoveis_proximidades_detalhadas;
DROP MATERIALIZED VIEW IF EXISTS mv_imoveis_imagens_completas;
DROP MATERIALIZED VIEW IF EXISTS mv_imoveis_videos;
DROP MATERIALIZED VIEW IF EXISTS mv_imoveis_documentos_completos;

-- Criar view básica simples
CREATE MATERIALIZED VIEW mv_imoveis_basicos_completos AS
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
    i.estado_fk,
    i.cidade_fk,
    i.tipo_fk,
    i.finalidade_fk,
    i.status_fk,
    ti.nome as tipo_nome,
    fi.nome as finalidade_nome,
    si.nome as status_nome,
    si.cor as status_cor,
    -- Imagem principal simples
    CASE 
        WHEN img.id IS NOT NULL THEN 
            json_build_object(
                'id', img.id,
                'tipo_mime', img.tipo_mime,
                'tamanho_bytes', img.tamanho_bytes,
                'ordem', img.ordem,
                'principal', img.principal,
                'url', '/api/imoveis/' || i.id || '/imagens/' || img.id
            )
        ELSE NULL
    END as imagem_principal,
    -- Contadores
    (SELECT COUNT(*) FROM imovel_imagens WHERE imovel_id = i.id) as total_imagens,
    (SELECT COUNT(*) FROM imovel_amenidades WHERE imovel_id = i.id) as total_amenidades,
    (SELECT COUNT(*) FROM imovel_proximidades WHERE imovel_id = i.id) as total_proximidades,
    (SELECT COUNT(*) FROM documento_imovel WHERE imovel_fk = i.id AND ativo = true) as total_documentos,
    si.consulta_imovel_internauta
FROM imoveis i
LEFT JOIN tipos_imovel ti ON i.tipo_fk = ti.id
LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
LEFT JOIN status_imovel si ON i.status_fk = si.id
LEFT JOIN imovel_imagens img ON i.id = img.imovel_id AND img.principal = true
WHERE i.ativo = true;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_mv_imoveis_basicos_search 
ON mv_imoveis_basicos_completos(estado_fk, cidade_fk, finalidade_fk, ativo);

-- Verificar se funcionou
SELECT COUNT(*) as total_imoveis FROM mv_imoveis_basicos_completos;
SELECT id, codigo, titulo FROM mv_imoveis_basicos_completos WHERE id = 51;







