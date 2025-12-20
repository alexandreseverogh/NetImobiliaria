-- ========================================
-- MIGRAÇÃO: Adicionar Status 99 para Cadastro Público
-- Data: 2025-01-24
-- Descrição: Status para imóveis cadastrados via acesso público
-- ========================================

-- Inserir status 99 (Em Analise)
INSERT INTO status_imovel (id, nome, cor, descricao, ativo, consulta_imovel_internauta, created_at, updated_at)
VALUES (
  99,
  'Em Analise',
  '#F59E0B',
  'Imóvel cadastrado via acesso público, aguardando análise interna para aprovação',
  true,
  false, -- Não deve aparecer em consultas públicas (consulta_imovel_internauta = false)
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  cor = EXCLUDED.cor,
  descricao = EXCLUDED.descricao,
  ativo = EXCLUDED.ativo,
  consulta_imovel_internauta = EXCLUDED.consulta_imovel_internauta,
  updated_at = EXCLUDED.updated_at;

-- Verificar criação
SELECT id, nome, cor, ativo, consulta_imovel_internauta 
FROM status_imovel 
WHERE id = 99;









