SET client_encoding = 'UTF8';

-- 1. Atualizar layout_json com nomes REAIS das colunas da tabela imoveis
UPDATE crm_segmentos_config 
SET layout_json = '{
  "title_template": "Imovel: {{codigo}}",
  "subtitle_template": "{{titulo}} - {{bairro}}",
  "badges": [
    {"label": "Dorms", "campo": "quartos", "icone": "bed", "prefixo": "", "sufixo": ""},
    {"label": "Suites", "campo": "suites", "icone": "bath", "prefixo": "", "sufixo": ""},
    {"label": "Vagas", "campo": "vagas_garagem", "icone": "car-front", "prefixo": "", "sufixo": ""},
    {"label": "Area", "campo": "area_total", "icone": "maximize", "prefixo": "", "sufixo": " m2"},
    {"label": "Valor", "campo": "preco", "icone": "dollar-sign", "prefixo": "R$ ", "sufixo": ""}
  ]
}'::jsonb,
updated_at = NOW()
WHERE domain_id = 1;

-- 2. Vincular imoveis reais aos leads de teste (que nao possuem imovel_id)
-- Buscar IDs de imoveis existentes e distribuir entre os leads
DO $$
DECLARE
  imovel_ids INT[];
  lead_rec RECORD;
  idx INT := 0;
BEGIN
  SELECT ARRAY_AGG(id ORDER BY id) INTO imovel_ids FROM imoveis WHERE ativo = true LIMIT 8;
  
  IF imovel_ids IS NULL OR array_length(imovel_ids, 1) = 0 THEN
    -- fallback: pegar qualquer imovel
    SELECT ARRAY_AGG(id ORDER BY id) INTO imovel_ids FROM imoveis LIMIT 8;
  END IF;
  
  IF imovel_ids IS NOT NULL AND array_length(imovel_ids, 1) > 0 THEN
    FOR lead_rec IN SELECT lead_uuid FROM leads_staging WHERE imovel_id IS NULL ORDER BY created_at
    LOOP
      UPDATE leads_staging 
      SET imovel_id = imovel_ids[1 + (idx % array_length(imovel_ids, 1))]
      WHERE lead_uuid = lead_rec.lead_uuid;
      idx := idx + 1;
    END LOOP;
    RAISE NOTICE 'Vinculados % leads a imoveis.', idx;
  ELSE
    RAISE NOTICE 'Nenhum imovel encontrado para vincular.';
  END IF;
END $$;
