-- Renomeia corretor_areas_atuacao → atendente_area_atuacao. A tabela já era estruturalmente
-- genérica (qualquer "vendedor" de qualquer segmento pode ter linhas aqui — a estratégia
-- geo_area já lê essa tabela via config, não mais hardcoded); só o nome era imóvel-específico.
-- Operação de metadado (instantânea, sem cópia de dado). Nenhum segmento tem sellerAreaTable
-- explícito em segment_distribution_strategies.config (confirmado: todos usam o default do
-- código), então nenhum dado de config precisa mudar — só o default no código (ver commit).

ALTER TABLE public.corretor_areas_atuacao RENAME TO atendente_area_atuacao;

ALTER TABLE public.atendente_area_atuacao RENAME CONSTRAINT corretor_areas_atuacao_pkey TO atendente_area_atuacao_pkey;
ALTER TABLE public.atendente_area_atuacao RENAME CONSTRAINT corretor_areas_atuacao_corretor_fk_fkey TO atendente_area_atuacao_corretor_fk_fkey;
ALTER TABLE public.atendente_area_atuacao RENAME CONSTRAINT corretor_areas_atuacao_created_by_fkey TO atendente_area_atuacao_created_by_fkey;
ALTER TABLE public.atendente_area_atuacao RENAME CONSTRAINT corretor_areas_atuacao_tenant_id_fkey TO atendente_area_atuacao_tenant_id_fkey;
ALTER TABLE public.atendente_area_atuacao RENAME CONSTRAINT corretor_areas_atuacao_updated_by_fkey TO atendente_area_atuacao_updated_by_fkey;

ALTER INDEX public.idx_corretor_areas_atuacao_tenant RENAME TO idx_atendente_area_atuacao_tenant;
ALTER INDEX public.idx_corretor_areas_corretor RENAME TO idx_atendente_area_atuacao_corretor;
ALTER INDEX public.idx_corretor_areas_local RENAME TO idx_atendente_area_atuacao_local;

ALTER SEQUENCE public.corretor_areas_atuacao_id_seq RENAME TO atendente_area_atuacao_id_seq;
