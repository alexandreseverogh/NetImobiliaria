-- FASE 17-A — Controle de permissão de geração de imagens fictícias por IA por segmento
-- Default false = seguro: imóveis, carros e outros segmentos com produto físico real
-- começam sem geração de imagens fictícias. Master admin habilita explicitamente.

ALTER TABLE public.system_segments
  ADD COLUMN IF NOT EXISTS "imagens_por_ia" BOOLEAN NOT NULL DEFAULT false;

-- Comentário descritivo na coluna
COMMENT ON COLUMN public.system_segments."imagens_por_ia" IS
  'Permite geração de imagens fictícias via IA (Flux/DALL-E). '
  'False para segmentos com produto físico real (imóveis, carros, etc.). '
  'True para serviços, SaaS e segmentos onde imagens de lifestyle/conceito são aceitáveis.';
