-- Script para debugar por que a API retorna 0 posts
-- Execute estas queries para entender o problema

-- 1. Verificar quantos conteúdos estão ativos
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN ativo = true THEN 1 END) as ativos,
    COUNT(CASE WHEN ativo = false THEN 1 END) as inativos
FROM feed.feed_conteudos;

-- 2. Ver alguns títulos para entender o conteúdo
SELECT 
    id,
    titulo,
    LEFT(resumo, 100) as resumo_preview,
    data_publicacao,
    ativo
FROM feed.feed_conteudos
WHERE ativo = true
ORDER BY data_publicacao DESC
LIMIT 20;

-- 3. Testar a query exata da API (simulação)
-- Esta é a query que a API usa, mas pode estar muito restritiva
SELECT 
    c.id, 
    c.titulo, 
    c.resumo, 
    c.url_original, 
    c.url_imagem, 
    c.data_publicacao,
    cat.nome as categoria_nome,
    f.nome as fonte_nome
FROM feed.feed_conteudos c
JOIN feed.feed_categorias cat ON c.categoria_fk = cat.id
JOIN feed.feed_fontes f ON c.fonte_fk = f.id
WHERE c.ativo = true
  AND (
    LOWER(c.titulo || ' ' || COALESCE(c.resumo, '')) ~* '(imóvel|imóveis|imobiliário|imobiliária|imobiliarias|casa|casas|apartamento|apartamentos|propriedade|propriedades|aluguel|venda|compra|locação|financiamento imobiliário|crédito imobiliário|mercado imobiliário|setor imobiliário|construção|construtoras|construtor|investimento imobiliário|investimentos imobiliários|tokenização imobiliária|tokenização|proptech|prop tech|real estate|realty|selic|incc|ipca imóveis|habitação|habitações|condomínio|condomínios|terreno|terrenos|lote|lotes|escritura|escrituras|registro de imóveis|iptu|itbi|zoneamento|zoneamento urbano|arquitetura|arquitetônico|decoração|interiores|reforma|reformas|mobiliário|mobília)'
  )
ORDER BY c.data_publicacao DESC
LIMIT 8;

-- 4. Ver quantos passam pelo filtro
SELECT COUNT(*) as total_passando_filtro
FROM feed.feed_conteudos c
WHERE c.ativo = true
  AND (
    LOWER(c.titulo || ' ' || COALESCE(c.resumo, '')) ~* '(imóvel|imóveis|imobiliário|imobiliária|imobiliarias|casa|casas|apartamento|apartamentos|propriedade|propriedades|aluguel|venda|compra|locação|financiamento imobiliário|crédito imobiliário|mercado imobiliário|setor imobiliário|construção|construtoras|construtor|investimento imobiliário|investimentos imobiliários|tokenização imobiliária|tokenização|proptech|prop tech|real estate|realty|selic|incc|ipca imóveis|habitação|habitações|condomínio|condomínios|terreno|terrenos|lote|lotes|escritura|escrituras|registro de imóveis|iptu|itbi|zoneamento|zoneamento urbano|arquitetura|arquitetônico|decoração|interiores|reforma|reformas|mobiliário|mobília)'
  );

-- 5. Ver quantos NÃO passam pelo filtro (para entender o problema)
SELECT 
    COUNT(*) as total_nao_passando,
    COUNT(CASE WHEN LOWER(titulo || ' ' || COALESCE(resumo, '')) LIKE '%arquitetura%' THEN 1 END) as tem_arquitetura,
    COUNT(CASE WHEN LOWER(titulo || ' ' || COALESCE(resumo, '')) LIKE '%decoração%' THEN 1 END) as tem_decoracao,
    COUNT(CASE WHEN LOWER(titulo || ' ' || COALESCE(resumo, '')) LIKE '%casa%' THEN 1 END) as tem_casa
FROM feed.feed_conteudos
WHERE ativo = true
  AND NOT (
    LOWER(titulo || ' ' || COALESCE(resumo, '')) ~* '(imóvel|imóveis|imobiliário|imobiliária|imobiliarias|casa|casas|apartamento|apartamentos|propriedade|propriedades|aluguel|venda|compra|locação|financiamento imobiliário|crédito imobiliário|mercado imobiliário|setor imobiliário|construção|construtoras|construtor|investimento imobiliário|investimentos imobiliários|tokenização imobiliária|tokenização|proptech|prop tech|real estate|realty|selic|incc|ipca imóveis|habitação|habitações|condomínio|condomínios|terreno|terrenos|lote|lotes|escritura|escrituras|registro de imóveis|iptu|itbi|zoneamento|zoneamento urbano|arquitetura|arquitetônico|decoração|interiores|reforma|reformas|mobiliário|mobília)'
  );
