-- Migração: Prevenir múltiplas atribuições ATIVAS para o mesmo lead
-- Isso impede que um lead esteja com 2 corretores ao mesmo tempo (ou 2x com o mesmo)

-- Primeiro, limpar duplicidades existentes (manter apenas o mais recente)
-- Atenção: Isso é destrutivo para atribuições 'sobrando', mas necessário para criar o índice.
DELETE FROM imovel_prospect_atribuicoes a
USING imovel_prospect_atribuicoes b
WHERE a.id < b.id
  AND a.prospect_id = b.prospect_id
  AND a.status IN ('atribuido', 'aceito')
  AND b.status IN ('atribuido', 'aceito');

-- Criar índice único parcial
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_assignment 
ON imovel_prospect_atribuicoes (prospect_id) 
WHERE status IN ('atribuido', 'aceito');

-- Opcional: garantir que um corretor não tenha o mesmo lead em outros status repetidamente? 
-- Não, histórico é permitido. A restrição é sobre *quem está com a bola agora*.
