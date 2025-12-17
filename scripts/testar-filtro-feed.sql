-- Testar quantos conteúdos passam pelo filtro atual da API

-- 1. Ver quantos passam pelo filtro atual
SELECT COUNT(*) as total_passando_filtro
FROM feed.feed_conteudos c
WHERE c.ativo = true
  AND (
    LOWER(c.titulo || ' ' || COALESCE(c.resumo, '')) ~* '(imóvel|imóveis|imobiliário|imobiliária|imobiliarias|casa|casas|apartamento|apartamentos|propriedade|propriedades|aluguel|venda|compra|locação|financiamento imobiliário|crédito imobiliário|mercado imobiliário|setor imobiliário|construção|construtoras|construtor|investimento imobiliário|investimentos imobiliários|tokenização imobiliária|tokenização|proptech|prop tech|real estate|realty|selic|incc|ipca imóveis|habitação|habitações|condomínio|condomínios|terreno|terrenos|lote|lotes|escritura|escrituras|registro de imóveis|iptu|itbi|zoneamento|zoneamento urbano|arquitetura|arquitetônico|decoração|interiores|reforma|reformas|mobiliário|mobília)'
  );

-- 2. Ver alguns títulos que NÃO passam pelo filtro (para entender o problema)
SELECT 
    titulo,
    LEFT(resumo, 100) as resumo_preview,
    data_publicacao
FROM feed.feed_conteudos
WHERE ativo = true
  AND NOT (
    LOWER(titulo || ' ' || COALESCE(resumo, '')) ~* '(imóvel|imóveis|imobiliário|imobiliária|imobiliarias|casa|casas|apartamento|apartamentos|propriedade|propriedades|aluguel|venda|compra|locação|financiamento imobiliário|crédito imobiliário|mercado imobiliário|setor imobiliário|construção|construtoras|construtor|investimento imobiliário|investimentos imobiliários|tokenização imobiliária|tokenização|proptech|prop tech|real estate|realty|selic|incc|ipca imóveis|habitação|habitações|condomínio|condomínios|terreno|terrenos|lote|lotes|escritura|escrituras|registro de imóveis|iptu|itbi|zoneamento|zoneamento urbano|arquitetura|arquitetônico|decoração|interiores|reforma|reformas|mobiliário|mobília)'
  )
ORDER BY data_publicacao DESC
LIMIT 10;

-- 3. Ver alguns títulos que PASSAM pelo filtro (se houver)
SELECT 
    titulo,
    LEFT(resumo, 100) as resumo_preview,
    data_publicacao
FROM feed.feed_conteudos
WHERE ativo = true
  AND (
    LOWER(titulo || ' ' || COALESCE(resumo, '')) ~* '(imóvel|imóveis|imobiliário|imobiliária|imobiliarias|casa|casas|apartamento|apartamentos|propriedade|propriedades|aluguel|venda|compra|locação|financiamento imobiliário|crédito imobiliário|mercado imobiliário|setor imobiliário|construção|construtoras|construtor|investimento imobiliário|investimentos imobiliários|tokenização imobiliária|tokenização|proptech|prop tech|real estate|realty|selic|incc|ipca imóveis|habitação|habitações|condomínio|condomínios|terreno|terrenos|lote|lotes|escritura|escrituras|registro de imóveis|iptu|itbi|zoneamento|zoneamento urbano|arquitetura|arquitetônico|decoração|interiores|reforma|reformas|mobiliário|mobília)'
  )
ORDER BY data_publicacao DESC
LIMIT 10;

