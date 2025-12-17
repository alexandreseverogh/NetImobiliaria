-- Criar tabela imovel_amenidades
CREATE TABLE IF NOT EXISTS imovel_amenidades (
    id SERIAL PRIMARY KEY,
    imovel_fk INTEGER REFERENCES imoveis(id) ON DELETE CASCADE,
    amenidade_fk INTEGER REFERENCES amenidades(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Evitar duplicatas
    UNIQUE(imovel_fk, amenidade_fk)
);

-- Verificar se a tabela foi criada
\d imovel_amenidades;
