-- 030_add_sla_minutos_aceite_lead.sql
-- SLA de aceite do lead (em minutos), lido por roteamento e pelo worker de transbordo.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'parametros'
      AND column_name = 'sla_minutos_aceite_lead'
  ) THEN
    ALTER TABLE public.parametros
      ADD COLUMN sla_minutos_aceite_lead INTEGER NOT NULL DEFAULT 5;
  END IF;
END $$;

-- Garantir que exista pelo menos uma linha
INSERT INTO public.parametros (vl_destaque_nacional)
SELECT 0.00
WHERE NOT EXISTS (SELECT 1 FROM public.parametros);


