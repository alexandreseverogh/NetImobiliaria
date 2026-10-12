-- As páginas do módulo CRM (/crm/*) já têm features cadastradas em system_features,
-- mas nenhuma estava mapeada em route_permissions_config — por isso o log de acesso
-- (feature_access_logs) nunca conseguia resolver um nome legível pra elas, mesmo depois
-- de a captura ser estendida ao layout do CRM (CRMLayoutContent.tsx).
--
-- /crm/config/ia tem 2 features ativas pra mesma URL (71 "Inteligencia Artificial" e
-- 76 "Configurações CRM", duplicata histórica pré-existente, fora de escopo resolver
-- aqui) — escolhido 76 por ser o nome mais atual/descritivo da tela real hoje.

INSERT INTO public.route_permissions_config
  (route_pattern, method, feature_id, default_action, requires_auth, requires_2fa, is_active)
VALUES
  ('/crm',                     'GET', 65,  'READ', true, false, true),
  ('/crm/kanban',              'GET', 66,  'READ', true, false, true),
  ('/crm/leads',               'GET', 67,  'READ', true, false, true),
  ('/crm/config/marketing',    'GET', 72,  'READ', true, false, true),
  ('/crm/config/ia',           'GET', 76,  'READ', true, false, true),
  ('/crm/config/kanban',       'GET', 75,  'READ', true, false, true),
  ('/crm/config/segmentos',    'GET', 83,  'READ', true, false, true),
  ('/crm/config/atividades',   'GET', 119, 'READ', true, false, true),
  ('/crm/config/agentes',      'GET', 120, 'READ', true, false, true),
  ('/crm/resgate',             'GET', 121, 'READ', true, false, true)
ON CONFLICT (route_pattern, method) DO NOTHING;
