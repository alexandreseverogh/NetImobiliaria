-- Teste 1: Com prospect_id 77 (deve excluir quem já recebeu)
SELECT 'COM PROSPECT 77:' as teste;
SELECT
  u.id, u.nome, u.tipo_corretor
FROM public.users u
INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
INNER JOIN public.user_roles ur ON ura.role_id = ur.id
INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
WHERE u.ativo = true
  AND ur.name = 'Corretor'
  AND COALESCE(u.is_plantonista, false) = false
  AND (u.tipo_corretor = 'Externo' OR u.tipo_corretor IS NULL)
  AND caa.estado_fk = 'PE'
  AND caa.cidade_fk = 'Recife'
  AND u.id NOT IN (
    SELECT corretor_fk FROM public.imovel_prospect_atribuicoes WHERE prospect_id = 77
  )
LIMIT 3;

-- Teste 2: SEM filtro de prospect (backfill inicial - prospect ainda não tem atribuições)
SELECT 'SEM FILTRO DE PROSPECT:' as teste;
SELECT
  u.id, u.nome, u.tipo_corretor
FROM public.users u
INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
INNER JOIN public.user_roles ur ON ura.role_id = ur.id
INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
WHERE u.ativo = true
  AND ur.name = 'Corretor'
  AND COALESCE(u.is_plantonista, false) = false
  AND (u.tipo_corretor = 'Externo' OR u.tipo_corretor IS NULL)
  AND caa.estado_fk = 'PE'
  AND caa.cidade_fk = 'Recife'
LIMIT 3;
