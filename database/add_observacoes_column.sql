-- Adicionar coluna 'observacoes' na tabela imoveis
ALTER TABLE imoveis 
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Remover a view antiga para evitar conflitos de estrutura de colunas
DROP VIEW IF EXISTS imoveis_completos;

-- Recriar a view imoveis_completos com o novo campo
CREATE OR REPLACE VIEW imoveis_completos AS
SELECT 
    i.*,
    ti.nome as tipo_nome,
    fi.nome as finalidade_nome,
    si.nome as status_nome,
    si.cor as status_cor,
    u.nome as corretor_nome,
    (SELECT COUNT(*) FROM imovel_imagens ii WHERE ii.imovel_id = i.id) as total_imagens,
    (SELECT COUNT(*) FROM imovel_imagens ii WHERE ii.imovel_id = i.id AND ii.principal = true) as tem_imagem_principal
FROM imoveis i
LEFT JOIN tipos_imovel ti ON i.tipo_fk = ti.id
LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
LEFT JOIN status_imovel si ON i.status_fk = si.id
LEFT JOIN users u ON i.corretor_fk = u.id
WHERE i.ativo = true;
