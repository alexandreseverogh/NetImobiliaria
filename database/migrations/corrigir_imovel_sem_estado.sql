-- Script para corrigir imóvel com destaque = true mas sem estado_fk
-- ATENÇÃO: Execute primeiro encontrar_imovel_sem_estado.sql para identificar o(s) imóvel(is)
-- Depois, atualize o estado_fk abaixo com o estado correto

-- Exemplo: Atualizar imóvel específico com estado válido
-- Substitua 'SP' pelo estado correto e o ID pelo ID do imóvel encontrado

-- Opção 1: Atualizar por ID específico
-- UPDATE imoveis
-- SET estado_fk = 'SP'  -- Substitua pelo estado correto
-- WHERE id = 'ID_DO_IMOVEL'  -- Substitua pelo ID encontrado
--   AND destaque = true
--   AND ativo = true
--   AND estado_fk IS NULL;

-- Opção 2: Atualizar todos os imóveis sem estado para um estado padrão (use com cuidado!)
-- UPDATE imoveis
-- SET estado_fk = 'SP'  -- Substitua pelo estado padrão desejado
-- WHERE destaque = true
--   AND ativo = true
--   AND estado_fk IS NULL;

-- Verificar após atualização
SELECT 
    id,
    codigo,
    estado_fk,
    cidade_fk,
    destaque,
    ativo
FROM imoveis
WHERE destaque = true
AND ativo = true
AND estado_fk IS NULL;

-- Verificar total após correção
SELECT 
    'TOTAL COM DESTAQUE LOCAL' as tipo,
    COUNT(*) as total
FROM imoveis
WHERE destaque = true
AND ativo = true;








