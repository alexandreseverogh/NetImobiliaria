-- Fase 0 (regras configuráveis): todo tenant precisa de sua linha em parametros_imoveis.
-- Antes, o DistributionEngine caía em valores fixos no código quando a linha faltava (10 dos 12
-- tenants ativos não tinham linha). Esta migração cria a linha com os DEFAULTS da própria
-- tabela, então o comportamento de roteamento não muda para ninguém. Idempotente.
INSERT INTO public.parametros_imoveis (tenant_id)
SELECT t.id
  FROM public.tenants t
 WHERE NOT EXISTS (
   SELECT 1 FROM public.parametros_imoveis p WHERE p.tenant_id = t.id
 )
ON CONFLICT (tenant_id) DO NOTHING;
