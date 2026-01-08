-- Migration 043: Restore 'corretor_areas_atuacao' table
-- Reason: Table is missing in Docker DB, required for Transbordo logic.

CREATE TABLE IF NOT EXISTS public.corretor_areas_atuacao (
    id SERIAL PRIMARY KEY,
    corretor_fk UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    estado_fk VARCHAR(2) NOT NULL, -- UF (PE, SP, etc.)
    cidade_fk VARCHAR(255) NOT NULL, -- Nome da cidade
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by location
CREATE INDEX IF NOT EXISTS idx_corretor_areas_local ON public.corretor_areas_atuacao(estado_fk, cidade_fk);
CREATE INDEX IF NOT EXISTS idx_corretor_areas_corretor ON public.corretor_areas_atuacao(corretor_fk);
