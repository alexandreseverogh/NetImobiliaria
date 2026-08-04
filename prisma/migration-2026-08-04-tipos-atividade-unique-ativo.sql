-- ============================================================
-- Fix real: tipos_atividade desativados (soft-delete, ativo=false)
-- ocupavam a vaga do nome pra sempre — os índices únicos nunca
-- filtravam por `ativo`, então recriar (ou renomear outro tipo para)
-- um nome já usado por um tipo desativado sempre falhava com
-- "Já existe uma atividade com esse nome nesse escopo", mesmo o
-- nome não aparecendo em lugar nenhum da UI (GET só lista ativo=true).
-- ============================================================

DROP INDEX IF EXISTS public.ux_tipos_atividade_tenant;
DROP INDEX IF EXISTS public.ux_tipos_atividade_client;

CREATE UNIQUE INDEX ux_tipos_atividade_tenant
  ON public.tipos_atividade(tenant_id, nome) WHERE client_id IS NULL AND ativo = true;
CREATE UNIQUE INDEX ux_tipos_atividade_client
  ON public.tipos_atividade(tenant_id, client_id, nome) WHERE client_id IS NOT NULL AND ativo = true;
