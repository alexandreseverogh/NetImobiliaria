-- Textos e limites da auditoria por segmento.
-- Substitui números embutidos em auditReportService.ts (estimativas, limites de exibição,
-- faixas de LLA e de campanhas por cliente). Cada linha é um parâmetro de um segmento.
-- Estimativas usam min/max; limites de exibição usam só value_min.
-- Idempotente: cria a tabela se não existir e semeia os valores padrão para segmentos ativos
-- que ainda não os têm (ON CONFLICT DO NOTHING).

CREATE TABLE IF NOT EXISTS campanhasmarketingdigital.audit_text_settings (
  segment_id  UUID NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  param_key   VARCHAR(60) NOT NULL,
  value_min   NUMERIC(12,4) NOT NULL,
  value_max   NUMERIC(12,4),
  updated_at  TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (segment_id, param_key)
);

-- Valores padrão atuais (os mesmos que estavam fixos no código).
-- lead_gain_factor       : fração do CTR usada na estimativa de leads adicionais (0.8)
-- cpl_reduction          : redução estimada de CPL ao ativar MOF, em % (15–30)
-- tracking_gain          : eficiência estimada com tracking limpo, em % (10–20)
-- scale_gain             : escala estimada de leads com LLA, em % (40–80)
-- lla_range              : faixa de LLA sugerida, em % (1–3)
-- problem_dimensions     : quantas dimensões piores são avaliadas para problemas (5)
-- max_problems           : máximo de problemas exibidos (3)
-- max_opportunities      : máximo de oportunidades exibidas (3)
-- client_campaigns_top   : campanhas exibidas por cliente no ranking (2)
-- tenant_campaigns_top   : campanhas exibidas na empresa principal (3)
INSERT INTO campanhasmarketingdigital.audit_text_settings (segment_id, param_key, value_min, value_max)
SELECT s.id, p.param_key, p.value_min, p.value_max
FROM public.system_segments s
CROSS JOIN (VALUES
  ('lead_gain_factor',     0.8,  NULL::numeric),
  ('cpl_reduction',       15,    30),
  ('tracking_gain',       10,    20),
  ('scale_gain',          40,    80),
  ('lla_range',            1,     3),
  ('problem_dimensions',   5,  NULL::numeric),
  ('max_problems',         3,  NULL::numeric),
  ('max_opportunities',    3,  NULL::numeric),
  ('client_campaigns_top', 2,  NULL::numeric),
  ('tenant_campaigns_top', 3,  NULL::numeric)
) AS p(param_key, value_min, value_max)
WHERE s.is_active = true
ON CONFLICT (segment_id, param_key) DO NOTHING;
