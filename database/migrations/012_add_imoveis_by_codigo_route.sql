-- Migration: Adicionar rota para buscar imóvel por código
-- Data: 29/10/2024
-- Descrição: Adiciona configuração de rota para /api/admin/imoveis/by-codigo/[codigo]

-- 1. Inserir configuração da rota
INSERT INTO route_permissions_config (
  route_pattern,
  method,
  feature_id,
  default_action,
  requires_auth,
  requires_2fa,
  is_active,
  created_at,
  updated_at
)
SELECT
  '/api/admin/imoveis/by-codigo/:codigo',
  'GET',
  sf.id,
  'READ',
  true,
  false,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM system_features sf
WHERE sf.slug = 'imoveis'
  AND NOT EXISTS (
    SELECT 1 
    FROM route_permissions_config 
    WHERE route_pattern = '/api/admin/imoveis/by-codigo/:codigo' 
      AND method = 'GET'
  );

-- Verificar inserção
SELECT 
  id, 
  route_pattern, 
  method, 
  feature_id, 
  default_action 
FROM route_permissions_config 
WHERE route_pattern = '/api/admin/imoveis/by-codigo/:codigo';



