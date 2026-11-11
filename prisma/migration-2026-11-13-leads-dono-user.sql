-- Dono do lead no CRM (2026-11-13): o usuário que passou a atuar no lead (primeira ação humana).
-- Separado de corretor_atribuido_id, que continua sendo o campo de roteamento (transbordo, SLA,
-- fila de resgate) e é preenchido automaticamente pela distribuição — inclusive em leads de campanha.
-- NULL = ainda não atendido por ninguém.
-- Idempotente: pode rodar mais de uma vez.

BEGIN;

ALTER TABLE public.leads_staging
  ADD COLUMN IF NOT EXISTS dono_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_staging_dono_user
  ON public.leads_staging (dono_user_id)
  WHERE dono_user_id IS NOT NULL;

-- Backfill: para leads que já têm atividade registrada por um humano, o dono é o autor da
-- primeira delas. Leads sem nenhuma ação humana ficam NULL ("Ainda não atendido").
UPDATE public.leads_staging l
   SET dono_user_id = sub.usuario_id
  FROM (
    SELECT DISTINCT ON (lead_uuid) lead_uuid, usuario_id
      FROM public.atividades_lead
     WHERE origem = 'humano' AND usuario_id IS NOT NULL AND deleted_at IS NULL
     ORDER BY lead_uuid, created_at ASC
  ) sub
 WHERE l.lead_uuid = sub.lead_uuid
   AND l.dono_user_id IS NULL;

COMMIT;
