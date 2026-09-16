-- T1 (docs/PLANO_TIKTOK.md §2.3/§10) — network_defaults.tiktok, mesmo padrão zero-código já
-- usado por meta/google (system_segments.network_defaults, sem alteração de schema).
--
-- Aplicado só no segmento Imobiliário nesta rodada (o que a Trilha F/G de teste usa) — demais
-- segmentos ganham a chave quando o Master decidir ativar TikTok pra eles (mesmo padrão que
-- Google não está em todos os segmentos hoje).
--
-- instant_form_supported=false é o guardrail deliberado do §3: o Wizard (T3, fora desta rodada)
-- não deve oferecer CTA de Instant Form nativo do TikTok enquanto não houver webhook pra ele —
-- sem isso, o lead fica invisível pra plataforma (mesmo problema que travou a Visão 4 do Google
-- por meses). Falha honesta na Fase 1: só oferecer CTA de tráfego, que já funciona hoje via
-- /api/r/{trackingId}.

UPDATE public.system_segments
SET network_defaults = network_defaults || jsonb_build_object(
  'tiktok', jsonb_build_object(
    'objective', 'LEAD_GENERATION',
    'optimization_goal', 'CONVERT',
    'billing_event', 'OCPM',
    'video_max_seconds', 60,
    'instant_form_supported', false,
    'suggested_interests', '[]'::jsonb
  )
)
WHERE name = 'Imobiliário';
