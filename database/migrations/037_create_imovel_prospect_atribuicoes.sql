-- Migração 037: Restaurar tabela imovel_prospect_atribuicoes
-- Tabela crítica para distribuição de leads, perdida na sincronização.

CREATE TABLE IF NOT EXISTS public.imovel_prospect_atribuicoes (
    id SERIAL PRIMARY KEY,
    prospect_id INTEGER NOT NULL REFERENCES imovel_prospects(id) ON DELETE CASCADE,
    corretor_fk UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'atribuido', -- atribuido, aceito, expirado, recusado
    motivo JSONB DEFAULT '{}',
    expira_em TIMESTAMP WITH TIME ZONE,
    data_aceite TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_atribuicoes_status ON imovel_prospect_atribuicoes(status);
CREATE INDEX IF NOT EXISTS idx_atribuicoes_prospect ON imovel_prospect_atribuicoes(prospect_id);
CREATE INDEX IF NOT EXISTS idx_atribuicoes_corretor ON imovel_prospect_atribuicoes(corretor_fk);
CREATE INDEX IF NOT EXISTS idx_atribuicoes_expira ON imovel_prospect_atribuicoes(expira_em) WHERE status = 'atribuido';

-- Trigger para updated_at (opcional, mas boa prática)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_atribuicoes_modtime ON imovel_prospect_atribuicoes;
CREATE TRIGGER update_atribuicoes_modtime BEFORE UPDATE ON imovel_prospect_atribuicoes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
