SELECT 
  a.id,
  a.status,
  a.created_at,
  u.nome as corretor,
  u.tipo_corretor,
  u.is_plantonista,
  a.motivo
FROM imovel_prospect_atribuicoes a
INNER JOIN users u ON u.id = a.corretor_fk
WHERE a.prospect_id = (
  SELECT id 
  FROM imovel_prospects 
  WHERE id_imovel = 145 
  ORDER BY created_at DESC 
  LIMIT 1
)
ORDER BY a.created_at ASC;
