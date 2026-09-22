-- Segmento "Gestão de Marketing Digital" — campos sem UI dedicada hoje (mesmo padrão de todo
-- segmento existente: network_defaults.meta/.google fora de suggested_interests, funnel_stages,
-- creative_taxonomy, primary_kpis sempre só via SQL na criação) + reclassificação do tenant real
-- "Marketing Digital" pro novo segmento (decisão explícita do usuário, 2026-09-22 — era
-- "Imobiliário" por herança do primeiro segmento criado na plataforma, nunca uma escolha
-- deliberada). Roda DEPOIS que o segmento base já foi criado via API (scratchpad/
-- create-marketing-digital-segment.mjs), casando por slug/name — não depende de UUID fixo.

UPDATE public.system_segments
SET network_defaults = COALESCE(network_defaults, '{}'::jsonb) || '{
  "meta": {
    "objective": "OUTCOME_LEADS",
    "billing_event": "IMPRESSIONS",
    "custom_event_type": "LEAD",
    "optimization_goal": "LEAD_GENERATION",
    "promoted_object_type": "PIXEL_WITH_CONVERSION",
    "special_ad_categories": []
  },
  "google": {
    "campaign_types": ["SEARCH", "PERFORMANCE_MAX"],
    "bidding_strategy": "MAXIMIZE_CONVERSIONS",
    "headline_max_chars": 30,
    "description_max_chars": 90,
    "impression_share_target": 70,
    "negation_spend_threshold_pct": 10,
    "negative_seed_terms": ["curso gratis", "como fazer sozinho", "vaga de emprego", "trabalhe conosco", "apostila", "pdf gratis", "concurso", "estagio", "freelancer barato", "home office sem investimento"]
  }
}'::jsonb,
    funnel_stages = '[
      {"key": "awareness", "kpi": "reach", "label": "Conscientização", "objective": "BRAND_AWARENESS"},
      {"key": "consideration", "kpi": "ctr", "label": "Consideração", "objective": "TRAFFIC"},
      {"key": "lead", "kpi": "cpl", "label": "Captação de Lead", "objective": "LEAD_GENERATION"},
      {"key": "diagnostico", "kpi": "diagnostico_rate", "label": "Diagnóstico Agendado", "objective": "LEAD_GENERATION"},
      {"key": "sale", "kpi": "conversion_rate", "label": "Contrato Fechado", "objective": "CONVERSIONS"}
    ]'::jsonb,
    creative_taxonomy = '{
      "angles": ["roi_comprovado", "diagnostico_gratuito", "case_de_sucesso", "medo_de_ficar_para_tras", "preco_transparente"],
      "formats": ["depoimento_cliente", "antes_depois_metricas", "video_explicativo", "carrossel_servicos", "reels_bastidores"],
      "cta_types": ["WHATSAPP_MESSAGE", "LEAD_FORM", "CALL_NOW", "WEBSITE"]
    }'::jsonb,
    primary_kpis = '[
      {"key": "cpl", "unit": "BRL", "label": "Custo por Lead (CPL)", "lower_is_better": true},
      {"key": "ctr", "unit": "%", "label": "Taxa de Cliques (CTR)", "lower_is_better": false},
      {"key": "frequency", "unit": "x", "label": "Frequência", "lower_is_better": true},
      {"key": "cpm", "unit": "BRL", "label": "Custo por Mil Impressões (CPM)", "lower_is_better": true}
    ]'::jsonb
WHERE slug = 'marketing-digital';

UPDATE public.tenants
SET segment_id = (SELECT id FROM public.system_segments WHERE slug = 'marketing-digital')
WHERE name = 'Marketing Digital';
