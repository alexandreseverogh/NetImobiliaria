-- ================================================================
-- MIGRATION: Adicionar campo tipo_destaque em finalidades_imovel
-- Data: 2025-11-04
-- Descrição: Campo para identificar tipo de destaque da finalidade
-- Valores permitidos: 'DV' (Destaque Venda), 'DA' (Destaque Aluguel), '  ' (Sem Destaque)
-- ================================================================

-- Adicionar coluna tipo_destaque
ALTER TABLE finalidades_imovel 
ADD COLUMN IF NOT EXISTS tipo_destaque VARCHAR(2) DEFAULT '  ' NOT NULL;

-- Adicionar comentário na coluna
COMMENT ON COLUMN finalidades_imovel.tipo_destaque IS 'Tipo de destaque: DV=Destaque Venda, DA=Destaque Aluguel, "  "=Sem Destaque';

-- Adicionar constraint para validar valores
ALTER TABLE finalidades_imovel
ADD CONSTRAINT chk_tipo_destaque CHECK (tipo_destaque IN ('DV', 'DA', '  '));

-- Atualizar registros existentes com valor padrão
UPDATE finalidades_imovel SET tipo_destaque = '  ' WHERE tipo_destaque IS NULL;

-- Verificação
SELECT 
  id, 
  nome, 
  tipo_destaque,
  CASE 
    WHEN tipo_destaque = 'DV' THEN 'Destaque Venda'
    WHEN tipo_destaque = 'DA' THEN 'Destaque Aluguel'
    WHEN tipo_destaque = '  ' THEN 'Sem Destaque'
    ELSE 'Valor Inválido'
  END as tipo_destaque_descricao
FROM finalidades_imovel
ORDER BY id;

