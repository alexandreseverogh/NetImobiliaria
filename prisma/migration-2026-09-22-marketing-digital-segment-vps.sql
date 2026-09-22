-- =============================================================================
-- Replicação do segmento "Gestão de Marketing Digital" para o banco da VPS
-- =============================================================================
--
-- O que é: réplica byte-a-byte do estado REAL e já testado deste segmento no
-- banco local (criado via API real da plataforma, LLM real, testado ponta a
-- ponta com lead real — ver docs/CHECKPOINT.md, entrada 2026-09-22). Gerado
-- automaticamente a partir do banco local (nunca digitado à mão) para evitar
-- o risco de corrupção de acentuação já documentado neste projeto ao colar
-- texto em português direto em terminal/curl.
--
-- Cobre, nesta ordem: system_segments (o segmento em si) · system_segment_modules
-- (módulos contratáveis, resolvidos por slug — funciona mesmo se os UUIDs de
-- system_modules forem diferentes na VPS) · system_benchmarks (30 parâmetros) ·
-- crm_qualificacao_regras_segmento (7 regras) · crm_fit_criterios_segmento (6
-- critérios de ICP) · crm_agentes_config_segmento (5 agentes) ·
-- crm_ativo_config_segmento (1) · segment_distribution_strategies (2) ·
-- campanhasmarketingdigital.segment_angle_terms (12 termos de Trends) ·
-- system_prompt_templates (7 prompts completos).
--
-- O que NÃO está incluído, de propósito: a troca de segmento do tenant real
-- "Marketing Digital" (`UPDATE public.tenants SET segment_id = ...`). Não dá
-- pra saber se existe um tenant com esse nome exato na VPS — decida e rode
-- esse passo separado, à parte, se fizer sentido (ver instruções após este
-- arquivo).
--
-- Idempotente: todo INSERT tem ON CONFLICT DO NOTHING (ou WHERE NOT EXISTS,
-- no caso da tabela sem PK natural) — rodar 2x não duplica nada. Os únicos
-- pré-requisitos são que os 8 módulos referenciados por slug já existam em
-- system_modules (adm-provisionado, cadastros, crm, trafego-pago, mensageria
-- — os mesmos 5 usados aqui) e que as tabelas de destino já existam (todas
-- migrações padrão da plataforma, presumivelmente já aplicadas na VPS).
--
-- COMO APLICAR (DBeaver):
--   1. Conecte no Postgres da VPS (a mesma conexão que você já usa para
--      administrar o banco de produção/staging).
--   2. Abra este arquivo no DBeaver: SQL Editor → Open SQL Script → selecione
--      este .sql (ou cole o conteúdo inteiro num SQL Editor novo).
--   3. Confirme que o editor está apontando para o banco/schema certo
--      (canto superior do editor mostra a conexão ativa).
--   4. Rode o script INTEIRO de uma vez (Execute SQL Script — Alt+X no
--      DBeaver, não Ctrl+Enter, que roda só a instrução sob o cursor).
--   5. Confira o resultado: `SELECT id, name, slug FROM public.system_segments
--      WHERE slug = 'marketing-digital';` deve retornar 1 linha com o id
--      214fc4bf-3be5-4fda-b2be-21c71037323f.
--
-- =============================================================================

BEGIN;

INSERT INTO public.system_segments
  (id, name, slug, description, icon, color_theme, is_active, vocabulary, funnel_stages, creative_taxonomy, primary_kpis, network_defaults, cpl_ideal, cpl_critical, ctr_min, imagens_por_ia, chatbot_max_turns_default, distribution_role_name, crm_ia_ativa, next_best_action_captacao_fit_minimo)
VALUES
  ('214fc4bf-3be5-4fda-b2be-21c71037323f', 'Gestão de Marketing Digital', 'marketing-digital', 'Agências, consultorias e profissionais autônomos de gestão de tráfego pago e marketing digital — o próprio tenant vende gestão de campanhas (Meta, Google, TikTok), criação de conteúdo e consultoria de performance para negócios de qualquer segmento.', 'box', '#7c3aed', 't', '{"product": "gestão de tráfego pago", "currency": "BRL", "products": "serviços de marketing digital", "cta_terms": ["Agendar diagnóstico gratuito", "Falar com um especialista", "Solicitar proposta", "Ver estudo de caso"], "lead_term": "prospect", "pain_points": ["CPL alto", "ROI baixo", "falta de tempo pra gerir anúncios", "agência anterior sem resultado", "dificuldade em escalar vendas"], "product_types": ["gestão de Meta Ads", "gestão de Google Ads", "gestão de TikTok Ads", "consultoria de performance", "produção de criativos", "automação de atendimento (CRM/WhatsApp)"], "audience_terms": ["dono de negócio", "empreendedor", "gestor de marketing", "sócio-administrador"], "conversion_term": "reunião de diagnóstico"}'::jsonb, '[{"key": "awareness", "kpi": "reach", "label": "Conscientização", "objective": "BRAND_AWARENESS"}, {"key": "consideration", "kpi": "ctr", "label": "Consideração", "objective": "TRAFFIC"}, {"key": "lead", "kpi": "cpl", "label": "Captação de Lead", "objective": "LEAD_GENERATION"}, {"key": "diagnostico", "kpi": "diagnostico_rate", "label": "Diagnóstico Agendado", "objective": "LEAD_GENERATION"}, {"key": "sale", "kpi": "conversion_rate", "label": "Contrato Fechado", "objective": "CONVERSIONS"}]'::jsonb, '{"angles": ["roi_comprovado", "diagnostico_gratuito", "case_de_sucesso", "medo_de_ficar_para_tras", "preco_transparente"], "formats": ["depoimento_cliente", "antes_depois_metricas", "video_explicativo", "carrossel_servicos", "reels_bastidores"], "cta_types": ["WHATSAPP_MESSAGE", "LEAD_FORM", "CALL_NOW", "WEBSITE"]}'::jsonb, '[{"key": "cpl", "unit": "BRL", "label": "Custo por Lead (CPL)", "lower_is_better": true}, {"key": "ctr", "unit": "%", "label": "Taxa de Cliques (CTR)", "lower_is_better": false}, {"key": "frequency", "unit": "x", "label": "Frequência", "lower_is_better": true}, {"key": "cpm", "unit": "BRL", "label": "Custo por Mil Impressões (CPM)", "lower_is_better": true}]'::jsonb, '{"meta": {"objective": "OUTCOME_LEADS", "billing_event": "IMPRESSIONS", "custom_event_type": "LEAD", "optimization_goal": "LEAD_GENERATION", "promoted_object_type": "PIXEL_WITH_CONVERSION", "special_ad_categories": []}, "google": {"campaign_types": ["SEARCH", "PERFORMANCE_MAX"], "bidding_strategy": "MAXIMIZE_CONVERSIONS", "headline_max_chars": 30, "negative_seed_terms": ["curso gratis", "como fazer sozinho", "vaga de emprego", "trabalhe conosco", "apostila", "pdf gratis", "concurso", "estagio", "freelancer barato", "home office sem investimento"], "description_max_chars": 90, "impression_share_target": 70, "negation_spend_threshold_pct": 10}}'::jsonb, '60.00', '150.00', '0.8000', 't', '8', 'Gestor de Contas', 't', '75')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.system_segment_modules (segment_id, module_id)
SELECT '214fc4bf-3be5-4fda-b2be-21c71037323f', id FROM public.system_modules WHERE slug IN ('adm-provisionado', 'cadastros', 'crm', 'trafego-pago', 'mensageria')
ON CONFLICT DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('9f97211b-b1f9-4888-b523-5bfadb403c54', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'frequency_max', 'Frequência Máxima', '2.5000', 'NUM', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('fc4f81eb-fc9a-4957-b0aa-a5a5e2b81cb3', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'spend_no_lead', 'Gasto sem Lead (R$)', '100.0000', 'BRL', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('d4c19d34-d848-45f5-b36a-8ce1eb2de746', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'min_leads_scale', 'Leads Mín. p/ Escalar', '3.0000', 'NUM', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('cf179d38-6490-45a9-90d0-caa3ced0c7d7', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'min_days_running', 'Dias Mín. Rodando', '4.0000', 'NUM', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('439a01b2-ce98-4ad6-baae-b4be9cf5ac43', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'hook_rate_critical', 'Hook Rate Crítico (%)', '10.0000', 'PCT', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('222167d7-7697-44f1-81ef-b4606665707c', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'hook_rate_min', 'Hook Rate Mínimo (%)', '15.0000', 'PCT', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('c6f9dac7-d690-49c1-bb91-2754344b5a55', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'scale_budget_base_pct', 'Escala Base (%)', '10.0000', 'PCT', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('10931dc6-95e8-43be-ac07-5618a4c8454f', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'scale_budget_max_pct', 'Escala Máxima (%)', '25.0000', 'PCT', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('20295c19-0552-4fc9-86fc-8be3c9c40453', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'scale_ratio_cap', 'CTR Cap (×threshold)', '3.0000', 'NUM', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('874c4941-687a-40a2-9e42-352d4d068d3f', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'downscale_budget_pct', 'Redução de Budget (%)', '30.0000', 'PCT', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('7359acb1-3c0e-4f0b-8d23-50670efaf70d', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'scale_budget_max', 'Teto Absoluto (R$)', '0.0000', 'BRL', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('e2c96647-2239-4fa2-93e0-4ca391c53d19', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'scale_budget_pct', 'Escala Legada (%)', '25.0000', 'PCT', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('bda4830f-e059-437f-b189-9f86c14df3e4', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'cpm_delta_max', 'CPM Delta Máx (%)', '0.2000', 'PCT', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('9784b111-612a-474b-96d6-577167de527c', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'hook_rate_good', 'hook_rate_good', '25.0000', 'BRL', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('920b0eae-8d63-47d7-aa00-b0254fcd317c', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'cpl_ideal', 'CPL Ideal (R$)', '60.0000', 'BRL', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('ccfa84c8-4011-4694-8720-d0cb366e64f0', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'cpl_critical', 'CPL Crítico (R$)', '150.0000', 'BRL', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('7ee63301-5e56-469b-8118-666797db78cc', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'ctr_min', 'CTR Mínimo (%)', '0.8000', 'PCT', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('a7c96c51-cb8a-4e41-8e57-ed562bbe9c46', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'ctr_scale', 'CTR p/ Escalar (%)', '1.6000', 'PCT', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('eb9fb923-9a8f-4c48-a793-6cd9b1d65932', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'avg_fit_scale_min', 'Fit Médio Mín. p/ Escalar', '45.0000', 'NUM', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('760dc593-e504-4f52-83cc-d1fa025ee397', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'fir_floor', 'First Impression Ratio Mín', '0.2000', 'NUM', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('754bcd01-06b3-4b43-b005-f3e0dc85a3cf', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'learning_conv_target', 'Conversões p/ Sair do Learning', '50.0000', 'NUM', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('d3101150-211e-40fd-8646-1b3a25baa4a7', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'pressure_w_engagement', 'Peso Engagement (Pressão)', '0.4000', 'NUM', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('0eafcf6a-2afe-4a41-8d60-09fbdbc1ea6d', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'pressure_w_conversion', 'Peso Conversão (Pressão)', '0.3500', 'NUM', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('9a52a76f-ae0c-4579-a41f-624652ab3a68', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'pressure_w_quality', 'Peso Qualidade (Pressão)', '0.2500', 'NUM', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('d6959178-9c83-42d7-b6a4-6eb02c74cc90', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'is_lost_budget_scale_min', 'is_lost_budget_scale_min', '20.0000', 'BRL', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('8ae7cecf-4050-4bfb-8764-f33add98dcd1', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'realloc_min_cpl_gap_pct', 'realloc_min_cpl_gap_pct', '30.0000', 'BRL', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('67390178-172d-4ffa-8c7f-6e92217cad04', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'realloc_max_pct_of_source', 'realloc_max_pct_of_source', '30.0000', 'BRL', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('a5475a3d-9ee9-490a-9711-c1f393f2231b', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'realloc_marginal_haircut_pct', 'realloc_marginal_haircut_pct', '25.0000', 'BRL', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('5ff847c2-6d7e-43a3-a97c-730a5fd03e17', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'realloc_max_abs_cents', 'realloc_max_abs_cents', '5000.0000', 'BRL', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description)
VALUES ('70e332f9-2803-4974-89e3-9ef04a6524b6', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'realloc_cooldown_days', 'realloc_cooldown_days', '14.0000', 'BRL', NULL)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
INSERT INTO public.crm_qualificacao_regras_segmento (id, segment_id, palavras_chave, tag_resultante, resumo_modelo, score_base, ordem, ativa)
VALUES ('4f40f9e7-efaa-420a-84de-9b24d7faa0f0', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'quanto custa, quanto vocês cobram, valor do serviço, tabela de preços, investimento mensal, mensalidade', '💰 Pergunta de Investimento', 'Lead perguntou diretamente sobre valores/investimento — já está avaliando contratar, foco em apresentar range de investimento e agendar diagnóstico.', '8', '0', 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.crm_qualificacao_regras_segmento (id, segment_id, palavras_chave, tag_resultante, resumo_modelo, score_base, ordem, ativa)
VALUES ('48166e89-09eb-467e-9207-a358a7fcb0f6', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'meu CPL está alto, gasto muito e não converte, minha agência atual não entrega resultado, trocar de agência, não estou satisfeito com meus anúncios', '🔥 Insatisfeito com Resultado Atual', 'Lead já investe em tráfego pago mas está insatisfeito com o resultado — alta prontidão, já tem budget e experiência prévia, prioridade de contato.', '10', '1', 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.crm_qualificacao_regras_segmento (id, segment_id, palavras_chave, tag_resultante, resumo_modelo, score_base, ordem, ativa)
VALUES ('11f6d90f-44b2-420e-8dd0-05b1e8e15ac7', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'quero começar a anunciar, nunca fiz tráfego pago, como funciona anúncio no instagram, quero divulgar meu negócio', '🌱 Primeira Vez em Tráfego Pago', 'Lead nunca investiu em mídia paga — precisa de educação sobre o processo e expectativa de prazo/resultado antes de falar em contrato.', '6', '2', 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.crm_qualificacao_regras_segmento (id, segment_id, palavras_chave, tag_resultante, resumo_modelo, score_base, ordem, ativa)
VALUES ('1b7e8ba2-4932-4efb-b088-f089fc1ba69a', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'gerencio sozinho, cuido dos meus anúncios, não tenho tempo pra mexer nisso, preciso de alguém pra assumir', '⏱️ Sobrecarregado, Quer Terceirizar', 'Lead já roda campanhas por conta própria mas quer delegar — sinal forte de intenção de contratar, já entende o valor do serviço.', '9', '3', 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.crm_qualificacao_regras_segmento (id, segment_id, palavras_chave, tag_resultante, resumo_modelo, score_base, ordem, ativa)
VALUES ('7d6108cd-f193-4109-a879-641110c5ebba', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'quero triplicar as vendas, dobrar o faturamento, escalar o negócio, aumentar vendas online, vender mais pela internet', '📈 Objetivo de Crescimento Agressivo', 'Lead com meta ambiciosa de crescimento — qualificar orçamento disponível real antes de prometer prazo, pode ter expectativa desalinhada com investimento.', '7', '4', 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.crm_qualificacao_regras_segmento (id, segment_id, palavras_chave, tag_resultante, resumo_modelo, score_base, ordem, ativa)
VALUES ('33f20f67-da83-4d7c-b2fe-35329529c3b1', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'só pesquisando, cotação, orçamento sem compromisso, comparando agências, ainda não decidi', '👀 Cotação / Pesquisa de Mercado', 'Lead está comparando fornecedores — baixa urgência, focar em diferencial competitivo e prova social em vez de pressionar fechamento.', '3', '5', 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.crm_qualificacao_regras_segmento (id, segment_id, palavras_chave, tag_resultante, resumo_modelo, score_base, ordem, ativa)
VALUES ('1cb73d81-f24f-43e7-a139-48ad89248b48', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'indicação, fulano me indicou, conheço um cliente de vocês, vi o case de vocês', '🤝 Vindo por Indicação/Prova Social', 'Lead chegou por indicação ou case — já tem confiança prévia na agência, ciclo de decisão tende a ser mais curto.', '9', '6', 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.crm_fit_criterios_segmento (id, segment_id, criterio, peso, ordem, ativo)
VALUES ('7f73d5de-b335-44ab-b13a-9db1d169e77f', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'Investimento mensal em mídia paga (ou disposição real para investir) compatível com o ticket mínimo de gestão praticado pela agência', '9', '0', 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.crm_fit_criterios_segmento (id, segment_id, criterio, peso, ordem, ativo)
VALUES ('7cc91287-1bb5-4fd9-a7b4-11f45b726ebb', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'É o dono do negócio ou o responsável real pela decisão de marketing, não apenas pesquisando a pedido de terceiros', '8', '1', 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.crm_fit_criterios_segmento (id, segment_id, criterio, peso, ordem, ativo)
VALUES ('33e3c198-8aca-4df3-b76c-347f8cd7266f', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'Já tem (ou está disposto a estruturar rapidamente) um produto/serviço maduro o suficiente para ser anunciado — não é apenas uma ideia em fase de validação', '7', '2', 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.crm_fit_criterios_segmento (id, segment_id, criterio, peso, ordem, ativo)
VALUES ('325bbdc8-0a90-4cdf-a1b0-a6f6b47016fe', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'Expectativa de prazo para ver resultado é realista (semanas/meses), não busca retorno imediato incompatível com o tempo real de otimização de campanha', '6', '3', 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.crm_fit_criterios_segmento (id, segment_id, criterio, peso, ordem, ativo)
VALUES ('1b426189-a0b1-4b3e-8780-2d8eb856fd01', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'Segmento de negócio do lead está dentro do que a agência já tem expertise ou cases reais comprovados', '6', '4', 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.crm_fit_criterios_segmento (id, segment_id, criterio, peso, ordem, ativo)
VALUES ('50ce1a46-5009-42a2-a6f5-cc65b01310ab', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'Tem estrutura mínima para atender a demanda gerada (equipe de vendas, capacidade operacional) — evita vender tráfego para quem não consegue converter o lead depois', '5', '5', 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.crm_agentes_config_segmento (id, segment_id, agent_key, ativo, params)
VALUES ('d065c20f-027a-46c4-81fc-27e912df8d8a', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'pendencia_atendimento', 't', '{"fator_reatribuicao": "6", "minutos_1o_contato": "20", "fator_escalonamento": "3", "minutos_continuidade": "180"}'::jsonb)
ON CONFLICT (segment_id, agent_key) DO NOTHING;
INSERT INTO public.crm_agentes_config_segmento (id, segment_id, agent_key, ativo, params)
VALUES ('97801acc-0b6e-4945-ac2e-ca076f64f49c', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'stage_stagnation', 't', '{}'::jsonb)
ON CONFLICT (segment_id, agent_key) DO NOTHING;
INSERT INTO public.crm_agentes_config_segmento (id, segment_id, agent_key, ativo, params)
VALUES ('0719c8b6-1016-4a5d-82ff-74531a8357a9', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'next_best_action', 't', '{"qtd_atividades_contexto": "5"}'::jsonb)
ON CONFLICT (segment_id, agent_key) DO NOTHING;
INSERT INTO public.crm_agentes_config_segmento (id, segment_id, agent_key, ativo, params)
VALUES ('36e10eee-0e80-441c-9139-1f48912a99a8', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'reactivation', 't', '{"dias_inatividade": "10", "requer_revisao_extra": "false"}'::jsonb)
ON CONFLICT (segment_id, agent_key) DO NOTHING;
INSERT INTO public.crm_agentes_config_segmento (id, segment_id, agent_key, ativo, params)
VALUES ('9bb449b0-239f-47b4-b525-aed928fed075', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'score_recalibration', 't', '{"janela_dias": "90", "min_leads_amostra": "10", "divergencia_minima_pct": "30"}'::jsonb)
ON CONFLICT (segment_id, agent_key) DO NOTHING;
INSERT INTO public.crm_ativo_config_segmento (id, segment_id, target_table, target_fk_column, target_name_column, target_label, layout_json, form_schema_json, is_active)
VALUES ('ee7c5c3a-a74c-44ec-85b4-6ba40b14f597', '214fc4bf-3be5-4fda-b2be-21c71037323f', NULL, NULL, NULL, NULL, '{}'::jsonb, '[{"name": "segmento_negocio_lead", "type": "text", "label": "Segmento do Negócio do Lead", "required": true}, {"name": "ja_investe_em_anuncios", "type": "text", "label": "Já Investe em Anúncios Hoje?", "required": false}, {"name": "principal_objetivo", "type": "text", "label": "Principal Objetivo (vendas/leads/branding)", "required": true}, {"name": "canal_de_interesse", "type": "text", "label": "Canal de Interesse (Meta/Google/TikTok)", "required": false}, {"name": "urgencia", "type": "text", "label": "Urgência (quando quer começar)", "required": false}]'::jsonb, 't')
ON CONFLICT (segment_id) DO NOTHING;
INSERT INTO public.segment_distribution_strategies (id, segment_id, strategy_key, priority, is_active, config)
VALUES ('b8fa39fb-50e8-4b19-a942-6504cd52840a', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'round_robin', '1', 't', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.segment_distribution_strategies (id, segment_id, strategy_key, priority, is_active, config)
VALUES ('76b5e2a5-a08f-46d3-a920-5eea441dbf0c', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'plantonista_fallback', '2', 't', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
INSERT INTO campanhasmarketingdigital.segment_angle_terms (segment_id, angle_slug, angle_label, search_term, weight, geo, locale)
SELECT '214fc4bf-3be5-4fda-b2be-21c71037323f', 'roi_comprovado', 'ROI Comprovado', 'gestão de tráfego pago com resultado', '1', 'BR', 'pt-BR'
WHERE NOT EXISTS (SELECT 1 FROM campanhasmarketingdigital.segment_angle_terms WHERE segment_id = '214fc4bf-3be5-4fda-b2be-21c71037323f' AND angle_slug = 'roi_comprovado' AND search_term = 'gestão de tráfego pago com resultado');
INSERT INTO campanhasmarketingdigital.segment_angle_terms (segment_id, angle_slug, angle_label, search_term, weight, geo, locale)
SELECT '214fc4bf-3be5-4fda-b2be-21c71037323f', 'roi_comprovado', 'ROI Comprovado', 'agência de marketing digital resultado', '1', 'BR', 'pt-BR'
WHERE NOT EXISTS (SELECT 1 FROM campanhasmarketingdigital.segment_angle_terms WHERE segment_id = '214fc4bf-3be5-4fda-b2be-21c71037323f' AND angle_slug = 'roi_comprovado' AND search_term = 'agência de marketing digital resultado');
INSERT INTO campanhasmarketingdigital.segment_angle_terms (segment_id, angle_slug, angle_label, search_term, weight, geo, locale)
SELECT '214fc4bf-3be5-4fda-b2be-21c71037323f', 'diagnostico_gratuito', 'Diagnóstico Gratuito', 'diagnóstico gratuito marketing digital', '1', 'BR', 'pt-BR'
WHERE NOT EXISTS (SELECT 1 FROM campanhasmarketingdigital.segment_angle_terms WHERE segment_id = '214fc4bf-3be5-4fda-b2be-21c71037323f' AND angle_slug = 'diagnostico_gratuito' AND search_term = 'diagnóstico gratuito marketing digital');
INSERT INTO campanhasmarketingdigital.segment_angle_terms (segment_id, angle_slug, angle_label, search_term, weight, geo, locale)
SELECT '214fc4bf-3be5-4fda-b2be-21c71037323f', 'diagnostico_gratuito', 'Diagnóstico Gratuito', 'auditoria de anúncios grátis', '1', 'BR', 'pt-BR'
WHERE NOT EXISTS (SELECT 1 FROM campanhasmarketingdigital.segment_angle_terms WHERE segment_id = '214fc4bf-3be5-4fda-b2be-21c71037323f' AND angle_slug = 'diagnostico_gratuito' AND search_term = 'auditoria de anúncios grátis');
INSERT INTO campanhasmarketingdigital.segment_angle_terms (segment_id, angle_slug, angle_label, search_term, weight, geo, locale)
SELECT '214fc4bf-3be5-4fda-b2be-21c71037323f', 'case_de_sucesso', 'Case de Sucesso', 'case de sucesso gestão de tráfego', '1', 'BR', 'pt-BR'
WHERE NOT EXISTS (SELECT 1 FROM campanhasmarketingdigital.segment_angle_terms WHERE segment_id = '214fc4bf-3be5-4fda-b2be-21c71037323f' AND angle_slug = 'case_de_sucesso' AND search_term = 'case de sucesso gestão de tráfego');
INSERT INTO campanhasmarketingdigital.segment_angle_terms (segment_id, angle_slug, angle_label, search_term, weight, geo, locale)
SELECT '214fc4bf-3be5-4fda-b2be-21c71037323f', 'case_de_sucesso', 'Case de Sucesso', 'agência de tráfego pago depoimentos', '1', 'BR', 'pt-BR'
WHERE NOT EXISTS (SELECT 1 FROM campanhasmarketingdigital.segment_angle_terms WHERE segment_id = '214fc4bf-3be5-4fda-b2be-21c71037323f' AND angle_slug = 'case_de_sucesso' AND search_term = 'agência de tráfego pago depoimentos');
INSERT INTO campanhasmarketingdigital.segment_angle_terms (segment_id, angle_slug, angle_label, search_term, weight, geo, locale)
SELECT '214fc4bf-3be5-4fda-b2be-21c71037323f', 'terceirizar_gestao', 'Terceirizar a Gestão', 'contratar gestor de tráfego pago', '1', 'BR', 'pt-BR'
WHERE NOT EXISTS (SELECT 1 FROM campanhasmarketingdigital.segment_angle_terms WHERE segment_id = '214fc4bf-3be5-4fda-b2be-21c71037323f' AND angle_slug = 'terceirizar_gestao' AND search_term = 'contratar gestor de tráfego pago');
INSERT INTO campanhasmarketingdigital.segment_angle_terms (segment_id, angle_slug, angle_label, search_term, weight, geo, locale)
SELECT '214fc4bf-3be5-4fda-b2be-21c71037323f', 'terceirizar_gestao', 'Terceirizar a Gestão', 'terceirizar anúncios facebook', '1', 'BR', 'pt-BR'
WHERE NOT EXISTS (SELECT 1 FROM campanhasmarketingdigital.segment_angle_terms WHERE segment_id = '214fc4bf-3be5-4fda-b2be-21c71037323f' AND angle_slug = 'terceirizar_gestao' AND search_term = 'terceirizar anúncios facebook');
INSERT INTO campanhasmarketingdigital.segment_angle_terms (segment_id, angle_slug, angle_label, search_term, weight, geo, locale)
SELECT '214fc4bf-3be5-4fda-b2be-21c71037323f', 'preco_transparente', 'Preço Transparente', 'quanto custa gestão de tráfego pago', '1', 'BR', 'pt-BR'
WHERE NOT EXISTS (SELECT 1 FROM campanhasmarketingdigital.segment_angle_terms WHERE segment_id = '214fc4bf-3be5-4fda-b2be-21c71037323f' AND angle_slug = 'preco_transparente' AND search_term = 'quanto custa gestão de tráfego pago');
INSERT INTO campanhasmarketingdigital.segment_angle_terms (segment_id, angle_slug, angle_label, search_term, weight, geo, locale)
SELECT '214fc4bf-3be5-4fda-b2be-21c71037323f', 'preco_transparente', 'Preço Transparente', 'preço agência de marketing digital', '1', 'BR', 'pt-BR'
WHERE NOT EXISTS (SELECT 1 FROM campanhasmarketingdigital.segment_angle_terms WHERE segment_id = '214fc4bf-3be5-4fda-b2be-21c71037323f' AND angle_slug = 'preco_transparente' AND search_term = 'preço agência de marketing digital');
INSERT INTO campanhasmarketingdigital.segment_angle_terms (segment_id, angle_slug, angle_label, search_term, weight, geo, locale)
SELECT '214fc4bf-3be5-4fda-b2be-21c71037323f', 'crescimento_vendas', 'Crescimento de Vendas', 'aumentar vendas com anúncios online', '1', 'BR', 'pt-BR'
WHERE NOT EXISTS (SELECT 1 FROM campanhasmarketingdigital.segment_angle_terms WHERE segment_id = '214fc4bf-3be5-4fda-b2be-21c71037323f' AND angle_slug = 'crescimento_vendas' AND search_term = 'aumentar vendas com anúncios online');
INSERT INTO campanhasmarketingdigital.segment_angle_terms (segment_id, angle_slug, angle_label, search_term, weight, geo, locale)
SELECT '214fc4bf-3be5-4fda-b2be-21c71037323f', 'crescimento_vendas', 'Crescimento de Vendas', 'gerar mais leads qualificados', '1', 'BR', 'pt-BR'
WHERE NOT EXISTS (SELECT 1 FROM campanhasmarketingdigital.segment_angle_terms WHERE segment_id = '214fc4bf-3be5-4fda-b2be-21c71037323f' AND angle_slug = 'crescimento_vendas' AND search_term = 'gerar mais leads qualificados');
INSERT INTO public.system_prompt_templates (id, segment_id, template_key, version, title, content, variables, is_active)
VALUES ('e96d4058-ae29-4b97-acdb-1b2b4463c799', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'agent_enrich', '2', 'Enriquecimento de Insight — Gestão de Marketing Digital', 'Você é um especialista sênior em tráfego pago digital, atuando dentro de uma agência que gerencia as próprias campanhas de aquisição de clientes (venda do serviço de gestão de marketing digital). Enriqueça esta recomendação com contexto prático e específico do mercado de venda de serviços de marketing digital B2B em português BR. Máximo 180 caracteres.

Campanha: {{campaign_name}}
Insight: {{insight_title}}
Dados: {{insight_description}}
Confiança: {{confidence}}%

Referência do segmento: CPL ideal para captação de leads B2B de gestão de tráfego R$60-80, CTR saudável >0.8%, frequência máxima 2.5x (audiência de decisores é mais estreita que consumidor final).

Responda APENAS JSON: {"description": "texto enriquecido"}', '["campaign_name", "insight_title", "insight_description", "confidence"]'::jsonb, 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.system_prompt_templates (id, segment_id, template_key, version, title, content, variables, is_active)
VALUES ('dd7aba0a-fa3b-44fb-989e-48ab79359a03', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'briefing_closing', '2', 'Briefing de Fechamento — Gestão de Marketing Digital', 'Você é um especialista sênior em tráfego pago para agências que vendem gestão de marketing digital.

Este é o briefing de FECHAMENTO DO DIA. Foque na performance de hoje, comparação com metas do segmento (CPL ideal: R$60, CTR saudável: >0.8%, frequência máxima: 2.5x) e recomendações para amanhã.

## Dados das Campanhas (hoje)

{{campaigns_json}}

## Totais do Dia
- Gasto total: R${{total_spend}}
- Cliques: {{total_clicks}}
- Impressões: {{total_impressions}}
- Leads: {{total_leads}}
- Campanhas ativas: {{active_campaigns}}/{{total_campaigns}}

## Variação vs Ontem
- Gasto: {{delta_spend}}%
- Cliques: {{delta_clicks}}%
- Impressões: {{delta_impressions}}%
- Leads: {{delta_leads}}%

## Alertas Automáticos
{{rule_insights}}

Responda APENAS com JSON válido:
{
  "urgentAlerts": ["string"],
  "performanceSummary": "string",
  "campaignAnalysis": [{"campaignName": "string", "status": "healthy|warning|critical", "recommendation": "string", "priority": "high|medium|low"}],
  "budgetRecommendations": ["string"],
  "actionItems": ["string"],
  "tomorrowPlan": "string"
}', '["campaigns_json", "total_spend", "total_clicks", "total_impressions", "total_leads", "active_campaigns", "total_campaigns", "delta_spend", "delta_clicks", "delta_impressions", "delta_leads", "rule_insights"]'::jsonb, 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.system_prompt_templates (id, segment_id, template_key, version, title, content, variables, is_active)
VALUES ('5cc08450-27df-4126-95a1-c2f011dcd33b', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'briefing_morning', '2', 'Briefing Matinal — Gestão de Marketing Digital', 'Você é um especialista sênior em tráfego pago para agências que vendem gestão de marketing digital. Sua especialidade é gerar leads qualificados de donos de negócio interessados em contratar gestão de tráfego pago, via Meta Ads, Google Ads e TikTok Ads.

Este é o briefing MATINAL. Foque no resumo do período anterior, alertas urgentes e plano de ação para o dia que está começando. Use terminologia do mercado de agências (CPL, lead qualificado, diagnóstico, proposta, contrato fechado, gestor de contas).

## Dados das Campanhas (últimos {{period_days}} dias)

{{campaigns_json}}

## Totais do Período
- Gasto total: R${{total_spend}}
- Cliques: {{total_clicks}}
- Impressões: {{total_impressions}}
- Leads: {{total_leads}}
- Campanhas ativas: {{active_campaigns}}/{{total_campaigns}}

## Variação vs Período Anterior
- Gasto: {{delta_spend}}%
- Cliques: {{delta_clicks}}%
- Impressões: {{delta_impressions}}%
- Leads: {{delta_leads}}%

## Alertas do Motor de Regras
{{rule_insights}}

## Instruções
Analise com foco em:
1. Canibalização entre campanhas (públicos sobrepostos — comum quando várias campanhas miram o mesmo perfil de dono de negócio)
2. Realocação de budget (tirar de quem tem CPL alto, escalar quem tem CPL abaixo de R$60)
3. Fadiga criativa (frequência acima de 2.5x = audiência B2B já saturada, trocar criativo/prova social)
4. Qualidade do lead vs volume (lead que já demonstrou insatisfação com resultado atual tem prioridade sobre lead apenas cotando)
5. Consistência de mensagem entre anúncio e proposta de valor real da agência (evitar prometer algo que o time comercial não confirma depois)

Responda APENAS com JSON válido:
{
  "urgentAlerts": ["string — alertas que precisam de ação imediata"],
  "performanceSummary": "string — resumo geral da performance em 2-3 frases",
  "campaignAnalysis": [{"campaignName": "string", "status": "healthy|warning|critical", "recommendation": "string — recomendação específica e acionável", "priority": "high|medium|low"}],
  "budgetRecommendations": ["string — sugestões de realocação de budget"],
  "actionItems": ["string — ações concretas para executar hoje"],
  "tomorrowPlan": "string — o que focar amanhã"
}', '["period_days", "campaigns_json", "total_spend", "total_clicks", "total_impressions", "total_leads", "active_campaigns", "total_campaigns", "delta_spend", "delta_clicks", "delta_impressions", "delta_leads", "rule_insights"]'::jsonb, 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.system_prompt_templates (id, segment_id, template_key, version, title, content, variables, is_active)
VALUES ('f837eef0-1737-4326-88cf-63a1813623a7', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'crm_agent_next_best_action', '2', 'Próxima Ação Sugerida (CRM) — Gestão de Marketing Digital', 'Você é um consultor de vendas experiente de uma agência de tráfego pago, ajudando um gestor de contas a decidir a MELHOR PRÓXIMA AÇÃO concreta para avançar este lead rumo ao fechamento de um contrato de gestão de marketing digital. Baseie-se só nos dados reais abaixo — nunca invente informação que não foi dada (não invente valor de proposta, prazo de contrato ou serviço específico que não estejam nos dados).

Lead: {{nome_lead}}
Etapa atual do funil: {{etapa_atual}} (há {{tempo_na_etapa}})
Classificação de intenção: {{tag_sonho}} — {{resumo_ia}}
Score de Intenção (0-10): {{score_prontidao}}
Score de Fit / encaixe no perfil ideal (0-10): {{score_fit}}

Atividades já registradas com este lead (mais recente primeiro):
{{atividades_recentes}}

Responda em português, em 1 a 3 frases diretas e específicas, com a próxima ação concreta que o gestor de contas deveria tomar agora (ex.: enviar case de sucesso de segmento parecido, agendar diagnóstico gratuito, esclarecer um ponto específico da objeção levantada, enviar proposta) — nunca uma recomendação genérica como "entre em contato" ou "continue o acompanhamento". Se não houver dado suficiente para uma recomendação específica, diga isso honestamente em vez de inventar. Responda só com o texto da recomendação, sem títulos nem formatação.', '["nome_lead", "etapa_atual", "tempo_na_etapa", "tag_sonho", "resumo_ia", "score_prontidao", "score_fit", "atividades_recentes"]'::jsonb, 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.system_prompt_templates (id, segment_id, template_key, version, title, content, variables, is_active)
VALUES ('c9803c8d-53da-4b66-96eb-590687c98a91', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'crm_agent_reactivation_message', '2', 'Mensagem de Reativação (CRM) — Gestão de Marketing Digital', 'Você é um gestor de contas experiente de uma agência de tráfego pago, rascunhando uma mensagem de WhatsApp curta pra reativar um lead que parou de responder. Baseie-se só nos dados reais abaixo — nunca invente informação que não foi dada (não invente valor de proposta, condição comercial, desconto ou prazo que não estejam nos dados).

Lead: {{nome_lead}}
Dias sem nenhum contato: {{dias_inativo}}
Etapa atual do funil: {{etapa_atual}}
Classificação de intenção: {{tag_sonho}} — {{resumo_ia}}

Escreva uma mensagem de WhatsApp curta (2-4 frases), tom humano e consultivo, nunca robótico ou genérico — deve soar como um gestor de contas real retomando contato (ex.: perguntar se ainda faz sentido conversar sobre os resultados, oferecer um novo case ou dado relevante do mercado dele, perguntar se algo mudou na prioridade do negócio), nunca um lembrete automático. Não se apresente como "assistente virtual". Nunca prometa desconto, condição especial ou prazo que não foi informado. Responda só com o texto da mensagem, sem títulos, aspas ou formatação extra.', '["nome_lead", "dias_inativo", "etapa_atual", "tag_sonho", "resumo_ia"]'::jsonb, 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.system_prompt_templates (id, segment_id, template_key, version, title, content, variables, is_active)
VALUES ('73572fb4-87fd-4900-afce-69d31ef3a874', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'crm_lead_qualification', '3', 'Qualificação de Lead (CRM) — Gestão de Marketing Digital', 'Você é um consultor de vendas experiente de uma agência de gestão de tráfego pago e marketing digital, atuando como a primeira triagem de um lead que acabou de chegar — alguém interessado em CONTRATAR os serviços de gestão de marketing digital desta agência. Analise a mensagem abaixo e identifique a real intenção/motivação por trás dela — não apenas palavras soltas, o contexto completo.

Use seu conhecimento real do mercado de gestão de tráfego pago no Brasil para interpretar sinais que um consultor de vendas experiente reconheceria: perguntas diretas sobre "quanto custa"/"valores" costumam indicar decisão já em estágio avançado, não simples curiosidade; menção a "minha agência atual não entrega resultado" ou "meu CPL está alto" é sinal de altíssima prontidão — o lead já entende o produto e está insatisfeito com o status quo, não precisa ser educado sobre o que é tráfego pago; "nunca fiz anúncio" ou "não sei como funciona" indica fase de educação, exige mais contexto antes de falar de contrato; "só cotando"/"comparando agências" é sinal real de baixa urgência, mesmo que a pessoa pareça interessada — não deve ser tratado como prioridade igual a quem já demonstrou insatisfação real; metas como "triplicar as vendas" ou "dobrar o faturamento" merecem qualificação cuidadosa do orçamento disponível antes de prometer prazo, porque expectativa desalinhada com investimento é a causa mais comum de insatisfação pós-venda neste mercado; segmentos de negócio muito distintos (ex.: e-commerce, serviço local, infoproduto, B2B) têm ciclos de decisão diferentes — não trate um dono de loja física como se tivesse a mesma urgência de um lançador de curso online.

Mensagem do lead:
{{mensagem}}

Regras táticas do negócio (vocabulário e prioridades conhecidas deste segmento — use como guia, mas confie no seu próprio julgamento quando a mensagem não bater exatamente com nenhuma delas):
{{regras_taticas}}

Critérios de encaixe no perfil ideal de cliente deste negócio (avalie SEPARADAMENTE da intenção — um lead pode estar muito engajado mas fora do perfil ideal, ou o contrário; se não houver informação suficiente na mensagem pra avaliar algum critério, não invente nem penalize, considere neutro):
{{criterios_fit}}

Responda SOMENTE com um objeto JSON válido, sem nenhum texto antes ou depois, exatamente neste formato:
{"tag_sonho": "rótulo curto da intenção/desejo detectado", "resumo_ia": "resumo de 1-2 frases para quem for atender este lead", "score_prontidao": número inteiro de 0 a 10 indicando o quão pronto este lead está para avançar agora, "score_fit": número inteiro de 0 a 10 indicando o quão bem este lead se encaixa no perfil ideal de cliente, com base nos critérios acima}', '["mensagem", "regras_taticas", "criterios_fit"]'::jsonb, 't')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.system_prompt_templates (id, segment_id, template_key, version, title, content, variables, is_active)
VALUES ('5bf99a8b-b44b-437c-9941-65b3336cdc40', '214fc4bf-3be5-4fda-b2be-21c71037323f', 'mensageria_bot_persona', '2', 'Mensageria — Persona do Bot (Gestão de Marketing Digital)', 'Você é o assistente virtual da {{tenant_name}}, uma agência/consultoria de gestão de tráfego pago e marketing digital. Seu papel é tirar dúvidas de potenciais clientes sobre os serviços oferecidos (gestão de Meta Ads, Google Ads, TikTok Ads, criação de criativos, automação de atendimento) e coletar informações de contato para o time comercial continuar o atendimento.

Regras importantes:
- Responda SEMPRE em português do Brasil — mesmo que a pergunta seja em outro idioma ou sobre um assunto totalmente fora do seu papel. Nunca responda em outro idioma, em nenhuma circunstância.
- Se o visitante perguntar algo sem relação com os serviços da agência, responda com cordialidade que você não tem conhecimento sobre esse assunto específico, deixe claro que seu papel é ajudar com dúvidas sobre gestão de marketing digital, e pergunte se pode ajudar com algo relacionado a isso.
- Nunca invente valores de investimento, prazo de resultado ou garantias que não tenham sido fornecidas — cada agência tem sua própria política comercial, e prometer algo sem confirmação real pode gerar expectativa que o time comercial depois não consegue cumprir. Se perguntarem preço/valores específicos, explique que isso depende do escopo do negócio do lead e ofereça agendar uma conversa com um especialista para um diagnóstico personalizado.
- Se o visitante pedir para falar com uma pessoa, demonstrar urgência real, ou a conversa não estiver avançando, ofereça transferir para um atendente humano.
- Se o visitante pedir um dado específico que não veio no resultado de uma ferramenta de consulta (um campo que a empresa ainda não disponibilizou pra você), diga claramente que não tem essa informação disponível no momento e incentive o visitante a falar com um atendente humano pra esse detalhe — nunca invente o valor nem ignore a pergunta silenciosamente.', '["tenant_name"]'::jsonb, 't')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =============================================================================
-- PASSO OPCIONAL — reclassificar o tenant real "Marketing Digital" para este
-- segmento (deliberadamente FORA da transação acima — decida antes de rodar).
-- =============================================================================
--
-- No banco local, o tenant "Marketing Digital" foi reclassificado do segmento
-- Imobiliário para este novo segmento (é a própria agência gestora, seu real
-- caso de uso). Não sabemos se existe, na VPS, um tenant com esse MESMO nome
-- exato — confirme antes de rodar o UPDATE abaixo (ex.: SELECT id, name,
-- segment_id FROM public.tenants WHERE name ILIKE '%marketing%';). Só depois
-- de confirmar o nome/id certo, descomente e rode:
--
-- UPDATE public.tenants
--    SET segment_id = '214fc4bf-3be5-4fda-b2be-21c71037323f'
--  WHERE name = 'Marketing Digital';
--
-- (Se preferir, substitua o WHERE por `id = '<uuid-do-tenant-na-vps>'` — mais
-- seguro que casar por nome.)
-- =============================================================================
