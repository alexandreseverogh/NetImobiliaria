-- Script SQL para criar lead de teste
-- Execute: docker exec netimobiliaria-db psql -U postgres -d net_imobiliaria -f /tmp/create-test-lead.sql

-- Variáveis
DO $$
DECLARE
    v_cliente_id uuid;
    v_admin_id uuid;
    v_corretor_id uuid;
    v_prospect_id integer;
    v_expira_em timestamp with time zone;
BEGIN
    -- Pegar cliente de teste
    SELECT id INTO v_cliente_id
    FROM users
    WHERE email LIKE '%@arqsis.com'
    LIMIT 1;
    
    -- Pegar admin
    SELECT u.id INTO v_admin_id
    FROM users u
    JOIN user_role_assignments ura ON ura.user_id = u.id
    JOIN user_roles ur ON ur.id = ura.role_id
    WHERE ur.name = 'Admin'
    LIMIT 1;
    
    -- Pegar corretor External de PE/Recife
    SELECT u.id INTO v_corretor_id
    FROM users u
    JOIN user_role_assignments ura ON ura.user_id = u.id
    JOIN user_roles ur ON ur.id = ura.role_id
    JOIN corretor_areas_atuacao caa ON caa.corretor_fk = u.id
    WHERE ur.name = 'Corretor'
      AND u.ativo = true
      AND COALESCE(u.is_plantonista, false) = false
      AND COALESCE(u.tipo_corretor, 'Externo') = 'Externo'
      AND caa.estado_fk = 'PE'
      AND caa.cidade_fk = 'Recife'
    LIMIT 1;
    
    -- Criar prospect
    INSERT INTO imovel_prospects (id_cliente, id_imovel, created_by, preferencia_contato, mensagem)
    VALUES (v_cliente_id, 145, v_admin_id, 'email', 'Lead de teste - expira em 1 min')
    RETURNING id INTO v_prospect_id;
    
    -- Calcular expiração (1 minuto)
    v_expira_em := NOW() + INTERVAL '1 minute';
    
    -- Criar atribuição
    INSERT INTO imovel_prospect_atribuicoes (prospect_id, corretor_fk, status, motivo, expira_em)
    VALUES (
        v_prospect_id,
        v_corretor_id,
        'atribuido',
        '{"type": "area_match", "source": "test_manual"}'::jsonb,
        v_expira_em
    );
    
    -- Mostrar resultado
    RAISE NOTICE '✅ Lead de teste criado!';
    RAISE NOTICE 'Prospect ID: %', v_prospect_id;
    RAISE NOTICE 'Corretor ID: %', v_corretor_id;
    RAISE NOTICE 'Expira em: %', v_expira_em;
    
END $$;

-- Mostrar o lead criado
SELECT 
    pa.id as atribuicao_id,
    pa.prospect_id,
    u.nome as corretor_nome,
    u.tipo_corretor,
    pa.status,
    pa.expira_em,
    EXTRACT(EPOCH FROM (pa.expira_em - NOW())) / 60 as minutos_restantes
FROM imovel_prospect_atribuicoes pa
JOIN users u ON u.id = pa.corretor_fk
JOIN imovel_prospects ip ON ip.id = pa.prospect_id
WHERE ip.id_imovel = 145
  AND pa.status = 'atribuido'
ORDER BY pa.created_at DESC
LIMIT 1;
