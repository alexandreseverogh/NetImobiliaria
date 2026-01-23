-- ========================================
-- FIX: Correção da View imoveis_completos
-- ========================================
-- Data: 2026-01-23
-- Descrição: Corrige o JOIN da view imoveis_completos para usar corretor_fk
--            em vez de created_by, garantindo que corretor_nome seja o nome
--            do corretor associado ao imóvel, não o criador do registro.

-- Drop da view existente
DROP VIEW IF EXISTS imoveis_completos;

-- Recriação da view com o JOIN correto
CREATE OR REPLACE VIEW imoveis_completos AS
SELECT 
    i.*,
    ti.nome as tipo_nome,
    fi.nome as finalidade_nome,
    si.nome as status_nome,
    si.cor as status_cor,
    u.nome as corretor_nome,
    (SELECT COUNT(*) FROM imovel_imagens ii WHERE ii.imovel_id = i.id AND ii.ativo = true) as total_imagens,
    (SELECT COUNT(*) FROM imovel_imagens ii WHERE ii.imovel_id = i.id AND ii.ativo = true AND ii.principal = true) as tem_imagem_principal
FROM imoveis i
LEFT JOIN tipos_imovel ti ON i.tipo_fk = ti.id
LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
LEFT JOIN status_imovel si ON i.status_fk = si.id
LEFT JOIN users u ON i.corretor_fk = u.id
WHERE i.ativo = true;

-- Comentário explicativo
COMMENT ON VIEW imoveis_completos IS 'View que combina dados de imóveis com informações relacionadas. O campo corretor_nome vem do JOIN com users usando corretor_fk (UUID do corretor associado ao imóvel).';
