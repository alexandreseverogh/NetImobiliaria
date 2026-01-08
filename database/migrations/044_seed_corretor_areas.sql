-- Migration 044: Seed 'corretor_areas_atuacao' for verification
-- Reason: Populate table with test data to verify routing logic.
-- Broker: Jose Damasio Neto (4d456e42-4031-46ba-9b5c-912bec1d28b5)
-- Area: PE / Recife

INSERT INTO public.corretor_areas_atuacao (corretor_fk, estado_fk, cidade_fk)
SELECT '4d456e42-4031-46ba-9b5c-912bec1d28b5', 'PE', 'Recife'
WHERE NOT EXISTS (
    SELECT 1 FROM public.corretor_areas_atuacao 
    WHERE corretor_fk = '4d456e42-4031-46ba-9b5c-912bec1d28b5' 
      AND estado_fk = 'PE' 
      AND cidade_fk = 'Recife'
);
