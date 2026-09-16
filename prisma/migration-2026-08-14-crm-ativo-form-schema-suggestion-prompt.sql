-- CRM: prompt de sugestão de campos de "Perfil de Interesse" (form_schema_json) por segmento.
-- Mesmo padrão já usado em FASE 18.3 (segment_angles_suggestion) — LLM SUGERE, nunca decide;
-- o Master sempre revisa/edita/remove antes de confirmar via PUT /ativo-config.

INSERT INTO public.system_prompt_templates (
  template_key, title, content, variables, is_active, created_at, updated_at
)
VALUES (
  'crm_ativo_form_schema_suggestion',
  'Sugestão de Campos de Perfil de Interesse (CRM)',
  E'Você é um especialista em CRM e captação de leads no Brasil.\n\nO segmento de negócio é:\n- Nome: {{segment_name}}\n- Descrição: {{segment_description}}\n\nUm atendente desse negócio, ao cadastrar manualmente um lead que ainda NÃO decidiu um item específico do catálogo (ex.: ainda está pesquisando, não fechou em um produto exato), precisa de um formulário curto para descrever o que esse cliente está procurando.\n\nSugira de 4 a 7 CAMPOS desse formulário — as perguntas mais úteis para entender a demanda de um cliente típico desse segmento (ex.: para uma revendedora de carros: marca desejada, faixa de preço, ano, tipo de câmbio; para uma clínica: especialidade procurada, urgência, convênio).\n\nRegras:\n1. name: identificador técnico, minúsculo, snake_case, sem acento, sem espaço (ex: faixa_preco, marca_desejada). Vira o nome da variável salva no lead.\n2. label: rótulo curto em PT-BR pra exibir no formulário (ex: "Faixa de Preço").\n3. type: exatamente um destre 4 valores: "text" (texto curto), "number" (número), "currency" (valor em dinheiro), "select" (lista — mas trate como texto livre, não invente opções).\n4. required: true só para 1 ou 2 campos realmente essenciais (ex.: o que o cliente quer, faixa de orçamento). A maioria deve ser false — não crie fricção desnecessária no cadastro manual.\n5. Nunca repita o mesmo name duas vezes.\n6. Responda APENAS com um array JSON válido, sem texto antes ou depois.\n\nFormato exato:\n[\n  {"name":"exemplo_campo","label":"Rótulo do Campo","type":"text","required":false}\n]',
  '["segment_name","segment_description"]'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (template_key, version) WHERE segment_id IS NULL
DO UPDATE SET
  content    = EXCLUDED.content,
  variables  = EXCLUDED.variables,
  updated_at = NOW();
