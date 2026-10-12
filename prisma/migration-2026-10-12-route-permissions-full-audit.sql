-- Auditoria completa: toda feature ativa com URL em /admin ou /crm que ainda não tinha
-- entrada em route_permissions_config (33 encontradas em 2026-10-12 — bem além dos 2
-- casos pontuais que motivaram esta correção: Campanhas quase inteiro, seção Master,
-- Logs, Segurança, etc.). Sem esse mapeamento, o Log de Acessos (feature_access_logs)
-- nunca resolve um nome legível pra essas telas — mostra o path cru.
--
-- INSERT...SELECT (não uma lista fixa de linhas) de propósito: generativo a partir do
-- estado real de system_features, então nenhuma feature nova que seguir o mesmo padrão
-- (ter url e estar ativa) fica de fora por esquecimento — e é seguro rodar de novo
-- (ON CONFLICT DO NOTHING) se mais alguma escapar no futuro.

INSERT INTO public.route_permissions_config
  (route_pattern, method, feature_id, default_action, requires_auth, requires_2fa, is_active)
SELECT
  sf.url, 'GET', sf.id, 'READ', true, false, true
FROM public.system_features sf
WHERE sf.is_active = true
  AND sf.url IS NOT NULL AND sf.url <> ''
  AND (sf.url LIKE '/admin%' OR sf.url LIKE '/crm%')
ON CONFLICT (route_pattern, method) DO NOTHING;
