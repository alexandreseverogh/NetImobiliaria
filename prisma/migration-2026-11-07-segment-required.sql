-- Segmento obrigatório para tenant (exceto Master Platform) e para cliente do tipo conta_gerenciada.
-- Consumidores PF (consumidor_pf) continuam sem segmento.
-- Decisões aprovadas em 2026-11-07. Idempotente.

-- 1) Preenchimento dos registros que hoje estão sem segmento.
UPDATE public.tenants
   SET segment_id = (SELECT id FROM public.system_segments WHERE slug = 'imobiliaria')
 WHERE id = 'c828d003-6213-4464-aa38-6c5d10a0aa9a' AND segment_id IS NULL;   -- Net Imobiliária

UPDATE public.clientes
   SET segment_id = (SELECT id FROM public.system_segments WHERE slug = 'marketing-digital')
 WHERE segment_id IS NULL AND tipo_cliente = 'conta_gerenciada'
   AND uuid IN ('f85178d9-88e5-42c4-8ee0-f829c1adff85',   -- Cliente Marcelo 1
                'da9f31ca-fe5e-49dc-8216-49d611d0ce24',   -- Cliente Marcelo 3
                'a3ad232d-9dad-4a85-9434-8b8336644f12',   -- Cliente de Marcelo
                'd1f06a24-c3d8-4104-9cd6-88122c0f0f52');  -- Frank Aguiar

UPDATE public.clientes
   SET segment_id = (SELECT id FROM public.system_segments WHERE slug = 'carros')
 WHERE uuid = '4fd85c83-b362-4597-850d-e7361f6e9359' AND segment_id IS NULL;  -- Old Cars

-- 2) Regras no banco. Master Platform é isento.
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_segment_required;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_segment_required
  CHECK (segment_id IS NOT NULL OR id = '00000000-0000-0000-0000-000000000001');

ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_segment_required;
ALTER TABLE public.clientes ADD CONSTRAINT clientes_segment_required
  CHECK (tipo_cliente <> 'conta_gerenciada' OR segment_id IS NOT NULL);

-- 3) Ajuste da regra de cliente: segmento obrigatório para TODO tipo, exceto consumidor_pf (decisão 2b).
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_segment_required;
ALTER TABLE public.clientes ADD CONSTRAINT clientes_segment_required
  CHECK (tipo_cliente = 'consumidor_pf' OR segment_id IS NOT NULL);
