-- ========================================
-- TABELA: imovel_status (Histórico de mudanças de status)
-- ========================================

-- Criar tabela de histórico de status de imóveis
CREATE TABLE IF NOT EXISTS imovel_status (
    id SERIAL PRIMARY KEY,
    imovel_fk INTEGER REFERENCES imoveis(id) ON DELETE CASCADE,
    status_fk INTEGER REFERENCES status_imovel(id) ON DELETE SET NULL,
    observacao TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para performance
    CONSTRAINT fk_imovel_status_imovel FOREIGN KEY (imovel_fk) 
        REFERENCES imoveis(id) ON DELETE CASCADE,
    CONSTRAINT fk_imovel_status_status FOREIGN KEY (status_fk) 
        REFERENCES status_imovel(id) ON DELETE SET NULL
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_imovel_status_imovel ON imovel_status(imovel_fk);
CREATE INDEX IF NOT EXISTS idx_imovel_status_status ON imovel_status(status_fk);
CREATE INDEX IF NOT EXISTS idx_imovel_status_created_at ON imovel_status(created_at DESC);

-- Comentários para documentação
COMMENT ON TABLE imovel_status IS 'Histórico de mudanças de status dos imóveis';
COMMENT ON COLUMN imovel_status.imovel_fk IS 'Referência ao imóvel';
COMMENT ON COLUMN imovel_status.status_fk IS 'Referência ao status aplicado';
COMMENT ON COLUMN imovel_status.observacao IS 'Observação sobre a mudança de status';
COMMENT ON COLUMN imovel_status.created_by IS 'Usuário que fez a alteração';
