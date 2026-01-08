-- 🚀 INDICES DE PERFORMANCE (Fase 1)
-- Data: 06/01/2026
-- Objetivo: Acelerar busca de imagens e filtros públicos

-- 1. Acelerar a busca da IMAGEM PRINCIPAL (Gargalo de listagem)
CREATE INDEX IF NOT EXISTS idx_imovel_imagens_principal 
ON imovel_imagens(imovel_id, principal) 
WHERE principal = true;

-- 2. Acelerar Filtros Públicos (Combinados)
-- Cobre: WHERE ativo = true AND estado = ... AND cidade = ...
CREATE INDEX IF NOT EXISTS idx_imoveis_public_filters 
ON imoveis(ativo, estado_fk, cidade_fk, finalidade_fk, preco, created_at DESC)
WHERE ativo = true;

-- 3. Acelerar busca por Finalidade (Venda/Aluguel na Home)
CREATE INDEX IF NOT EXISTS idx_finalidades_landpaging 
ON finalidades_imovel(vender_landpaging, alugar_landpaging)
WHERE vender_landpaging = true OR alugar_landpaging = true;

-- 4. Acelerar busca de Destaques
CREATE INDEX IF NOT EXISTS idx_imoveis_destaque 
ON imoveis(destaque, created_at DESC)
WHERE ativo = true AND destaque = true;
