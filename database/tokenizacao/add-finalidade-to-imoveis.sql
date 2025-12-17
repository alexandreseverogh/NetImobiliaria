-- ========================================
-- ADICIONAR FINALIDADE_ID À TABELA IMOVEIS
-- ========================================

-- Adicionar coluna finalidade_id na tabela imoveis
ALTER TABLE imoveis 
ADD COLUMN finalidade_id INTEGER REFERENCES finalidades_imovel(id);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_imoveis_finalidade_id ON imoveis(finalidade_id);

-- Dropar e recriar a view imoveis_completos para incluir finalidade
DROP VIEW IF EXISTS imoveis_completos;

CREATE VIEW imoveis_completos AS
SELECT 
    i.*,
    ti.nome as tipo_nome,
    si.nome as status_nome,
    si.cor as status_cor,
    fi.nome as finalidade_nome,
    u.nome as corretor_nome,
    COUNT(ii.id) as total_imagens,
    COUNT(CASE WHEN ii.principal = true THEN 1 END) as tem_imagem_principal
FROM imoveis i
LEFT JOIN tipos_imovel ti ON i.tipo_id = ti.id
LEFT JOIN status_imovel si ON i.status_id = si.id
LEFT JOIN finalidades_imovel fi ON i.finalidade_id = fi.id
LEFT JOIN users u ON i.created_by = u.id
LEFT JOIN imovel_imagens ii ON i.id = ii.imovel_id AND ii.ativo = true
WHERE i.ativo = true
GROUP BY i.id, ti.nome, si.nome, si.cor, fi.nome, u.nome;
