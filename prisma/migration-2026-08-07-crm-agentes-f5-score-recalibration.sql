-- F5 — Recalibração de Score (docs/PLANO_AGENTES_ACELERACAO_CRM.md §3.2/§6)
--
-- Achado real que muda o desenho literal do §4 do plano: o PUT de
-- /api/admin/master/segments/[id]/qualification-rules (Master) e o correspondente end-to-end
-- do tenant fazem DELETE + reinsert (replace-all) a cada save — nenhum `id` de
-- crm_qualificacao_regras_segmento/_tenant sobrevive entre edições. Guardar leads_gerados/
-- leads_convertidos/taxa_conversao_observada como COLUNAS na própria linha da regra (como o
-- §4 original propunha via ALTER TABLE) seria apagado no próximo save do Master/tenant, mesmo
-- sem nenhuma mudança de conteúdo. Corrigido: as estatísticas são computadas AO VIVO por
-- (escopo, tag_resultante) — nunca armazenadas como coluna da regra — em
-- src/lib/crm/agents/scoreRecalibrationService.ts, lido tanto pela UI (GET) quanto pelo job
-- diário. `tag_resultante` é a identidade real que já importa pro motor de qualificação
-- (ConciergeService.matchByKeyword casa por tag, não por id de regra).
--
-- A fila de sugestão de recalibração TAMBÉM não pode reaproveitar
-- campanhasmarketingdigital."AgentAction"-mirror (public.crm_agent_actions, F0) — aquela
-- tabela exige lead_uuid NOT NULL (é sobre um LEAD); recalibração é sobre uma REGRA
-- (config), sem lead nenhum por trás. Tabela própria, aprovação 1-clique in-app (Master/
-- tenant já autenticado na mesma tela — nunca PIN+WhatsApp, que existe especificamente pra
-- ações que falam com o CLIENTE, como reactivation).

CREATE TABLE public.crm_score_recalibration_suggestions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope                     varchar(10) NOT NULL,   -- 'segmento' | 'tenant'
  segment_id                uuid REFERENCES public.system_segments(id) ON DELETE CASCADE,
  tenant_id                 uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  tag_resultante            varchar(100) NOT NULL,
  score_atual               integer NOT NULL,
  score_sugerido            integer NOT NULL,
  leads_gerados             integer NOT NULL,
  leads_convertidos         integer NOT NULL,
  taxa_conversao_observada  numeric(5,2) NOT NULL,
  status                    varchar(20) NOT NULL DEFAULT 'PENDING', -- PENDING|APPLIED|DISMISSED
  created_at                timestamptz NOT NULL DEFAULT now(),
  decided_at                timestamptz,
  CONSTRAINT crm_score_recal_scope_ck CHECK (scope IN ('segmento', 'tenant')),
  CONSTRAINT crm_score_recal_scope_target_ck CHECK (
    (scope = 'segmento' AND segment_id IS NOT NULL AND tenant_id IS NULL) OR
    (scope = 'tenant' AND tenant_id IS NOT NULL AND segment_id IS NULL)
  )
);

CREATE INDEX idx_crm_score_recal_segment
  ON public.crm_score_recalibration_suggestions(segment_id, status) WHERE scope = 'segmento';
CREATE INDEX idx_crm_score_recal_tenant
  ON public.crm_score_recalibration_suggestions(tenant_id, status) WHERE scope = 'tenant';

-- 1 sugestão PENDING por (escopo, alvo, tag) — o job diário nunca duplica a mesma sugestão
-- em rodadas seguidas enquanto ela ainda não foi decidida.
CREATE UNIQUE INDEX idx_crm_score_recal_unique_pending
  ON public.crm_score_recalibration_suggestions(
    scope,
    COALESCE(segment_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    tag_resultante
  )
  WHERE status = 'PENDING';
