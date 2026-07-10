-- ============================================================
-- Migration 2026-07-08: Mensageria M4.1+M4.2 — persona do bot + 1ª ferramenta de dados
-- Ver docs/PLANO_MENSAGERIA.md seções 14.5, 14.6-A, 18.1
--
-- Schema (bot_flows/bot_sessions/segment_data_entities) já existe desde a migração de
-- 2026-07-06 (M0). Esta migração só adiciona DADOS: o prompt de persona (fallback global +
-- especialização do segmento Imobiliário) e a 1ª entidade consultável (imóveis), que serve
-- de referência para segmentos futuros cadastrarem as próprias.
-- Idempotente: pode rodar mais de uma vez sem duplicar.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Persona do bot — fallback global
-- ============================================================
INSERT INTO public.system_prompt_templates (
  template_key, title, content, variables, is_active, created_at, updated_at
)
VALUES (
  'mensageria_bot_persona',
  'Mensageria — Persona do Bot (fallback global)',
  E'Você é o assistente virtual da {{tenant_name}}, respondendo pelo canal de mensagens da empresa.\n\nSeja cordial, direto e responda sempre em português do Brasil. Use as ferramentas de consulta de dados disponíveis para responder com informações reais — nunca invente dados que uma ferramenta poderia confirmar. Se o visitante pedir para falar com uma pessoa, ou se você não conseguir ajudar, ofereça transferir para um atendente humano.',
  '["tenant_name"]'::jsonb,
  true, NOW(), NOW()
)
ON CONFLICT (template_key, version) WHERE segment_id IS NULL
DO UPDATE SET content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW();

-- ============================================================
-- 2. Persona do bot — especialização do segmento Imobiliário
-- ============================================================
INSERT INTO public.system_prompt_templates (
  segment_id, template_key, title, content, variables, is_active, created_at, updated_at
)
SELECT
  ss.id,
  'mensageria_bot_persona',
  'Mensageria — Persona do Bot (Imobiliário)',
  E'Você é o assistente virtual da {{tenant_name}}, uma imobiliária. Seu papel é ajudar visitantes a encontrar imóveis, tirar dúvidas sobre compra/locação e coletar informações de contato para o time comercial continuar o atendimento.\n\nSeja cordial, direto e responda sempre em português do Brasil. Quando o visitante perguntar sobre imóveis disponíveis (bairro, quartos, faixa de preço, etc.), use a ferramenta de consulta de imóveis para responder com dados reais — nunca invente características ou preços. Se não encontrar nada que combine, diga isso claramente e pergunte se pode ajustar os critérios. Se o visitante pedir para falar com uma pessoa, ou a conversa não estiver avançando, ofereça transferir para um atendente humano.',
  '["tenant_name"]'::jsonb,
  true, NOW(), NOW()
FROM public.system_segments ss
WHERE ss.slug = 'imobiliaria'
ON CONFLICT (segment_id, template_key, version) WHERE segment_id IS NOT NULL
DO UPDATE SET content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW();

-- ============================================================
-- 3. 1ª ferramenta de dados — imóveis (segmento Imobiliário, todos os tenants do segmento)
-- ============================================================
INSERT INTO mensageria.segment_data_entities (
  segment_id, tenant_id, entity_name, table_name, description, columns, relations,
  tenant_column, default_filter, max_rows, is_active
)
SELECT
  ss.id, NULL, 'imovel', 'imoveis',
  'Imóveis ativos à venda/locação — use para responder perguntas sobre disponibilidade, bairro, preço e características.',
  '[
    {"name":"id","type":"number","description":"Identificador do imóvel","selectable":true,"filterable":false},
    {"name":"titulo","type":"text","description":"Título do anúncio","selectable":true,"filterable":false},
    {"name":"bairro","type":"text","description":"Bairro do imóvel","selectable":true,"filterable":true},
    {"name":"cidade_fk","type":"text","description":"Cidade do imóvel","selectable":true,"filterable":true},
    {"name":"estado_fk","type":"text","description":"UF do imóvel","selectable":true,"filterable":true},
    {"name":"quartos","type":"number","description":"Número de quartos","selectable":true,"filterable":true},
    {"name":"banheiros","type":"number","description":"Número de banheiros","selectable":true,"filterable":true},
    {"name":"vagas_garagem","type":"number","description":"Vagas de garagem","selectable":true,"filterable":true},
    {"name":"area_total","type":"number","description":"Área total em m²","selectable":true,"filterable":false},
    {"name":"preco","type":"number","description":"Preço em reais","selectable":true,"filterable":false}
  ]'::jsonb,
  '[]'::jsonb,
  'tenant_id', 'ativo = true', 5, true
FROM public.system_segments ss
WHERE ss.slug = 'imobiliaria'
  AND NOT EXISTS (
    SELECT 1 FROM mensageria.segment_data_entities sde
     WHERE sde.segment_id = ss.id AND sde.entity_name = 'imovel' AND sde.tenant_id IS NULL
  );

COMMIT;
