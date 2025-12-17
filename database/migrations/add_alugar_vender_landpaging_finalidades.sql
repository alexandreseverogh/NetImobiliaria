-- Migration: Adicionar campos alugar_landpaging e vender_landpaging na tabela finalidades_imovel
-- Data: 2025-11-15
-- Descrição: Adiciona campos boolean para controlar exibição na landing page pública

-- Adicionar coluna alugar_landpaging
ALTER TABLE finalidades_imovel 
ADD COLUMN IF NOT EXISTS alugar_landpaging BOOLEAN DEFAULT false NOT NULL;

-- Adicionar coluna vender_landpaging
ALTER TABLE finalidades_imovel 
ADD COLUMN IF NOT EXISTS vender_landpaging BOOLEAN DEFAULT false NOT NULL;

-- Adicionar comentários nas colunas
COMMENT ON COLUMN finalidades_imovel.alugar_landpaging IS 'Indica se a finalidade deve aparecer na landing page pública para aluguel';
COMMENT ON COLUMN finalidades_imovel.vender_landpaging IS 'Indica se a finalidade deve aparecer na landing page pública para venda';

-- Verificar resultado
SELECT 
  id,
  nome,
  alugar_landpaging,
  vender_landpaging,
  tipo_destaque
FROM finalidades_imovel
ORDER BY id;








