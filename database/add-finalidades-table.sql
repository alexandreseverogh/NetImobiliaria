-- ========================================
-- TABELA DE FINALIDADES DE IMÓVEIS
-- ========================================

-- Tabela de finalidades de imóvel
CREATE TABLE IF NOT EXISTS finalidades_imovel (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_finalidades_imovel_ativo ON finalidades_imovel(ativo);
CREATE INDEX IF NOT EXISTS idx_finalidades_imovel_nome ON finalidades_imovel(nome);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_finalidades_imovel_updated_at ON finalidades_imovel;
CREATE TRIGGER update_finalidades_imovel_updated_at 
    BEFORE UPDATE ON finalidades_imovel 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados iniciais
INSERT INTO finalidades_imovel (nome, descricao) VALUES
('VENDA', 'Imóvel para venda'),
('ALUGUEL', 'Imóvel para aluguel'),
('VENDA_ALUGUEL', 'Imóvel para venda e aluguel')
ON CONFLICT (nome) DO NOTHING;


