acho iar tabela Clientes
-- Executar este script no PostgreSQL

CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE, -- Formato: 000.000.000-00
    telefone VARCHAR(15) NOT NULL, -- Formato: (99) 99999-9999
    endereco VARCHAR(200),
    numero VARCHAR(10),
    bairro VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Adicionar comentários para documentação
COMMENT ON TABLE clientes IS 'Tabela de clientes da imobiliária';
COMMENT ON COLUMN clientes.id IS 'Chave primária auto incremento';
COMMENT ON COLUMN clientes.nome IS 'Nome completo do cliente';
COMMENT ON COLUMN clientes.cpf IS 'CPF do cliente com formatação';
COMMENT ON COLUMN clientes.telefone IS 'Telefone com formatação (99) 99999-9999';
COMMENT ON COLUMN clientes.endereco IS 'Endereço do cliente';
COMMENT ON COLUMN clientes.numero IS 'Número do endereço';
COMMENT ON COLUMN clientes.bairro IS 'Bairro do cliente';

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_bairro ON clientes(bairro);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_clientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clientes_updated_at 
    BEFORE UPDATE ON clientes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_clientes_updated_at();
