-- Tabela de Pontuação e Métricas de Gamificação
CREATE TABLE IF NOT EXISTS corretor_scores (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    xp_total BIGINT DEFAULT 0,
    nivel INT DEFAULT 1,
    badges JSONB DEFAULT '[]'::jsonb,
    
    -- Métricas para cálculo de Score
    leads_recebidos INT DEFAULT 0,
    leads_aceitos INT DEFAULT 0,
    leads_perdidos_sla INT DEFAULT 0, -- Penalidade
    visitas_realizadas INT DEFAULT 0,
    vendas_realizadas INT DEFAULT 0,
    tempo_medio_resposta_segundos INT DEFAULT 0, -- Em segundos
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index para ranking rápido
CREATE INDEX IF NOT EXISTS idx_corretor_scores_xp ON corretor_scores(xp_total DESC);
