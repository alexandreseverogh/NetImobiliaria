-- 025_add_proximos_corretores_recebem_leads.sql
-- Adiciona o parâmetro de roteamento: quantos "próximos corretores" recebem leads antes do fallback plantonista.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'parametros'
      AND column_name = 'proximos_corretores_recebem_leads'
  ) THEN
    ALTER TABLE public.parametros
      ADD COLUMN proximos_corretores_recebem_leads INTEGER NOT NULL DEFAULT 3;
  END IF;
END $$;

-- Garantir que exista pelo menos uma linha
INSERT INTO public.parametros (vl_destaque_nacional)
SELECT 0.00
WHERE NOT EXISTS (SELECT 1 FROM public.parametros);


