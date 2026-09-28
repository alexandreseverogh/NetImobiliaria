-- Migração: 2026-09-28
-- Field Builder (/admin/master/fields, slug 'field-builder') define schema de metadado
-- COMPARTILHADO por todo tenant de um segmento (system_metadata_fields.segment não é
-- escopado por tenant_id) — foi provisionado por engano como se fosse feature normal de
-- tenant: role_permissions pro role "Administrador" (read/update/create/delete) +
-- tenant_feature_overrides ativo em vários tenants reais. Efeito real, não hipotético:
-- qualquer Administrador de tenant conseguia editar o schema de captação de lead/imóvel de
-- TODAS as outras empresas do mesmo segmento, não só da própria.
--
-- Corrigido removendo os dois registros de acesso. Master continua com acesso total via
-- bypass automático (is_system_role=true, verificado direto na API) — não depende de
-- nenhuma linha nestas 2 tabelas, mesmo padrão já usado por outras páginas Master-only
-- reais desta plataforma (ex.: "Gestão de Cobrança", migration-2026-09-20).
--
-- Busca a feature por slug/url (não por id literal — o id pode divergir entre ambientes).
-- Idempotente — seguro rodar mais de uma vez.

BEGIN;

DELETE FROM public.role_permissions
WHERE permission_id IN (
  SELECT p.id FROM public.permissions p
  JOIN public.system_features sf ON sf.id = p.feature_id
  WHERE sf.slug = 'field-builder' OR sf.url = '/admin/master/fields'
);

DELETE FROM public.tenant_feature_overrides
WHERE feature_id IN (
  SELECT id FROM public.system_features
  WHERE slug = 'field-builder' OR url = '/admin/master/fields'
);

COMMIT;

-- Verificação pós-migração (as duas devem retornar 0 linhas):
-- SELECT rp.* FROM public.role_permissions rp
--   JOIN public.permissions p ON p.id = rp.permission_id
--   JOIN public.system_features sf ON sf.id = p.feature_id
--   WHERE sf.slug = 'field-builder';
-- SELECT tfo.* FROM public.tenant_feature_overrides tfo
--   JOIN public.system_features sf ON sf.id = tfo.feature_id
--   WHERE sf.slug = 'field-builder';
