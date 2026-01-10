-- Criar tabela de financiadores
CREATE TABLE IF NOT EXISTS public.financiadores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    telefone VARCHAR(20),
    email VARCHAR(255),
    site VARCHAR(255),
    endereco TEXT,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_financiadores_nome ON public.financiadores(nome);
CREATE INDEX IF NOT EXISTS idx_financiadores_ativo ON public.financiadores(ativo);
CREATE INDEX IF NOT EXISTS idx_financiadores_cnpj ON public.financiadores(cnpj);

-- Inserir alguns financiadores de exemplo
INSERT INTO public.financiadores (nome, cnpj, telefone, email, site) VALUES
('Caixa Econômica Federal', '00.360.305/0001-04', '(11) 3004-1105', 'atendimento@caixa.gov.br', 'https://www.caixa.gov.br'),
('Banco do Brasil', '00.000.000/0001-91', '(11) 4004-0001', 'atendimento@bb.com.br', 'https://www.bb.com.br'),
('Itaú Unibanco', '60.701.190/0001-04', '(11) 4004-4828', 'atendimento@itau.com.br', 'https://www.itau.com.br'),
('Bradesco', '60.746.948/0001-12', '(11) 4002-4022', 'atendimento@bradesco.com.br', 'https://www.bradesco.com.br'),
('Santander', '90.400.888/0001-42', '(11) 4004-3535', 'atendimento@santander.com.br', 'https://www.santander.com.br')
ON CONFLICT (cnpj) DO NOTHING;

COMMENT ON TABLE public.financiadores IS 'Tabela de instituições financeiras para financiamento de imóveis';
