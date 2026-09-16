-- ============================================================================
-- Badge "Agente de IA" vs "Atendente" nas Atividades do CRM
-- Data: 2026-08-09
-- Schema: public
-- APLICAR VIA psql — NUNCA `prisma db push`
--   docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria \
--     < prisma/migration-2026-08-09-atividades-origem-ia.sql
--
-- Até aqui, toda atividade registrada em atividades_lead nascia de uma ação humana (o form
-- "+ Nova Atividade", usuario_id sempre vindo do JWT de quem está logado). As duas ações
-- automáticas que a plataforma já executa hoje — reativação automática (F4/G6,
-- reactivationExecutor.ts) e resposta do chatbot (M4.1, botAdapter.ts) — nunca deixavam
-- rastro nenhum nesta tela: o atendente olhando a ficha do lead no Kanban não tinha como
-- saber que a IA já tinha respondido o cliente.
-- ============================================================================

-- 1) Quem registrou a atividade: humano (padrão, preserva 100% do histórico existente) ou IA.
ALTER TABLE public.atividades_lead
  ADD COLUMN IF NOT EXISTS origem varchar(10) NOT NULL DEFAULT 'humano';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'atividades_lead_origem_valores'
      AND conrelid = 'public.atividades_lead'::regclass
  ) THEN
    ALTER TABLE public.atividades_lead
      ADD CONSTRAINT atividades_lead_origem_valores CHECK (origem IN ('humano', 'ia'));
  END IF;
END $$;

COMMENT ON COLUMN public.atividades_lead.origem IS
  'humano (padrão) = registrada por um usuário logado (usuario_id preenchido). '
  'ia = gerada automaticamente pela plataforma (reativação G6 ou chatbot M4.1), usuario_id NULL.';

-- 2) Tipo de atividade dedicado — mesmo padrão de seed já usado desde 2026-08-03 (CROSS JOIN
--    tenants que já têm Kanban), aplicado a todo tenant existente. is_entrada=false porque é
--    sempre uma ação NOSSA (a plataforma respondendo), nunca do cliente — mesma convenção de
--    G0 (tipos_atividade.is_entrada). Cor gold-premium (#c5a028): mesmo acento já usado em
--    toda a plataforma para identificar conteúdo gerado por IA (avisos, badges de bot).
INSERT INTO public.tipos_atividade (tenant_id, nome, icone, cor, ordem, is_entrada)
SELECT DISTINCT t.id, 'Resposta Automática (IA)', 'lucide-Bot', '#c5a028', 99, false
FROM public.tenants t
JOIN public.kanban_colunas kc ON kc.tenant_id = t.id
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FIM.
-- ============================================================================
