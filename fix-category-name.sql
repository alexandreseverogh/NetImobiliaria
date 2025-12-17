-- ALTERAR categoria de 'system-features' para 'funcionalidades'
UPDATE system_features 
SET category = 'funcionalidades'
WHERE category = 'system-features';

-- VERIFICAR se foi alterado
SELECT 
  id,
  name,
  category,
  url
FROM system_features 
WHERE name = 'Funcionalidades do Sistema';


