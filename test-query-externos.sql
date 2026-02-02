SELECT
  u.id, u.nome, u.email, u.tipo_corretor,
  COUNT(a2.id) AS total_recebidos,
  MAX(a2.created_at) AS ultimo_recebimento
FROM public.users u
INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
INNER JOIN public.user_roles ur ON ura.role_id = ur.id
INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
LEFT JOIN public.imovel_prospect_atribuicoes a2 ON a2.corretor_fk = u.id
WHERE u.ativo = true
  AND ur.name = 'Corretor'
  AND COALESCE(u.is_plantonista, false) = false
  AND (u.tipo_corretor = 'Externo' OR u.tipo_corretor IS NULL)
  AND caa.estado_fk = 'PE'
  AND caa.cidade_fk = 'Recife'
  AND u.id NOT IN (
    SELECT corretor_fk FROM public.imovel_prospect_atribuicoes WHERE prospect_id = 77
  )
GROUP BY u.id, u.nome, u.email, u.tipo_corretor
ORDER BY COUNT(a2.id) ASC, MAX(a2.created_at) ASC NULLS FIRST, u.created_at ASC
LIMIT 5;
