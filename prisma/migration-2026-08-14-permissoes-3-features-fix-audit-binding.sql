-- Continuação da auditoria de permissões (docs/CHECKPOINT.md, 2026-08-14). Dois achados
-- distintos resolvidos aqui, mais o cadastro pendente das 3 features sem nenhuma permissão.

-- 1) Achado 2 — "Auditoria de Ações" (feature_id 63, url /admin/audit) é órfã: a rota real
-- (/api/admin/audit) que alimenta essa tela estava em route_permissions_config apontando pra
-- feature_id 41 ("Auditoria de Logs do Sistema", cuja página real é /admin/logs — uma tela
-- totalmente diferente, confirmado que /admin/logs chama /api/admin/logs, não /api/admin/
-- audit). Corrige o vínculo pra apontar pra feature certa.
UPDATE public.route_permissions_config
   SET feature_id = 63, updated_at = NOW()
 WHERE route_pattern = '/api/admin/audit' AND method = 'GET' AND feature_id = 41;

-- 2) Cadastro das 3 features que nunca tiveram nenhuma linha de permissão — CRUD real
-- confirmado lendo o código de cada rota (docs/CHECKPOINT.md tem o detalhe por feature).
-- Só cadastra o catálogo (permissions) — decisão de QUEM recebe cada ação
-- (role_permissions) fica pra depois, por pedido explícito do usuário.

-- Analytics de Captura (108, cta-analytics) — só GET, sem nenhuma escrita.
INSERT INTO public.permissions (feature_id, action, description)
VALUES (108, 'read', 'Ver métricas de captura de CTA (cliques/submissões por destino)')
ON CONFLICT (feature_id, action) DO NOTHING;

-- Destinos de CTA (107, cta-destinos) — CRUD completo confirmado (GET/POST/PUT/DELETE).
INSERT INTO public.permissions (feature_id, action, description) VALUES
  (107, 'read',   'Ver destinos de CTA cadastrados'),
  (107, 'create', 'Cadastrar novo destino de CTA'),
  (107, 'update', 'Editar destino de CTA existente'),
  (107, 'delete', 'Remover destino de CTA')
ON CONFLICT (feature_id, action) DO NOTHING;

-- Mecanismos (109, cta-mecanismos) — lê configs de rastreio + salva config Meta/Evolution +
-- regenera a API key do webhook genérico (ação destrutiva/irreversível, mapeada como execute).
INSERT INTO public.permissions (feature_id, action, description) VALUES
  (109, 'read',    'Ver mecanismos de rastreio configurados (webhook, Meta, Evolution)'),
  (109, 'update',  'Salvar configuração de webhook do Meta/Evolution'),
  (109, 'execute', 'Regenerar a chave de API do webhook genérico (invalida a anterior)')
ON CONFLICT (feature_id, action) DO NOTHING;
