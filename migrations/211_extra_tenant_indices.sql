-- Migration 211: Índices de Performance Multi-Tenant para tabelas auxiliares
-- Objetivo: Garantir rapidez nas consultas filtradas por tenant_id.

BEGIN;

-- 1. Áreas de Atuação
CREATE INDEX IF NOT EXISTS idx_corretor_areas_atuacao_tenant ON corretor_areas_atuacao(tenant_id);

-- 2. Agendamentos (Garantir que o índice exista)
CREATE INDEX IF NOT EXISTS idx_agendamentos_tenant_id_perf ON agendamentos(tenant_id);

-- 3. Visitas de Imóveis
CREATE INDEX IF NOT EXISTS idx_imovel_visitas_tenant_id_perf ON imovel_visitas(tenant_id);

COMMIT;
