-- =====================================================
-- SCHEMA ADICIONAL - AMENIDADES E PROXIMIDADES
-- Net Imobiliária - Migração de dados estáticos
-- =====================================================

-- ========================================
-- SISTEMA DE AMENIDADES
-- ========================================

-- Tabela de categorias de amenidades
CREATE TABLE IF NOT EXISTS categorias_amenidades (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    icone VARCHAR(50), -- Para armazenar emoji ou classe de ícone
    cor VARCHAR(7) DEFAULT '#3B82F6', -- Cor hexadecimal para UI
    ordem INTEGER DEFAULT 0, -- Para ordenação na interface
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de amenidades
CREATE TABLE IF NOT EXISTS amenidades (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES categorias_amenidades(id) ON DELETE SET NULL,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    icone VARCHAR(50), -- Emoji ou classe de ícone específico da amenidade
    popular BOOLEAN DEFAULT false, -- Para destacar amenidades mais procuradas
    ordem INTEGER DEFAULT 0, -- Ordem dentro da categoria
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(categoria_id, nome) -- Evita duplicatas na mesma categoria
);

-- Tabela de relacionamento imóveis x amenidades (N:N)
CREATE TABLE IF NOT EXISTS imovel_amenidades (
    id SERIAL PRIMARY KEY,
    imovel_id INTEGER REFERENCES imoveis(id) ON DELETE CASCADE,
    amenidade_id INTEGER REFERENCES amenidades(id) ON DELETE CASCADE,
    observacoes TEXT, -- Para observações específicas sobre a amenidade no imóvel
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(imovel_id, amenidade_id) -- Evita duplicatas
);

-- ========================================
-- SISTEMA DE PROXIMIDADES
-- ========================================

-- Tabela de categorias de proximidades
CREATE TABLE IF NOT EXISTS categorias_proximidades (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    icone VARCHAR(50), -- Para armazenar emoji ou classe de ícone
    cor VARCHAR(7) DEFAULT '#10B981', -- Cor hexadecimal para UI
    ordem INTEGER DEFAULT 0, -- Para ordenação na interface
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de proximidades
CREATE TABLE IF NOT EXISTS proximidades (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES categorias_proximidades(id) ON DELETE SET NULL,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    icone VARCHAR(50), -- Emoji ou classe de ícone específico da proximidade
    popular BOOLEAN DEFAULT false, -- Para destacar proximidades mais procuradas
    ordem INTEGER DEFAULT 0, -- Ordem dentro da categoria
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(categoria_id, nome) -- Evita duplicatas na mesma categoria
);

-- Tabela de relacionamento imóveis x proximidades (N:N)
CREATE TABLE IF NOT EXISTS imovel_proximidades (
    id SERIAL PRIMARY KEY,
    imovel_id INTEGER REFERENCES imoveis(id) ON DELETE CASCADE,
    proximidade_id INTEGER REFERENCES proximidades(id) ON DELETE CASCADE,
    distancia_metros INTEGER, -- Distância em metros (opcional)
    tempo_caminhada INTEGER, -- Tempo de caminhada em minutos (opcional)
    observacoes TEXT, -- Para observações específicas sobre a proximidade
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(imovel_id, proximidade_id) -- Evita duplicatas
);

-- ========================================
-- ÍNDICES PARA PERFORMANCE
-- ========================================

-- Índices para amenidades
CREATE INDEX IF NOT EXISTS idx_amenidades_categoria_id ON amenidades(categoria_id);
CREATE INDEX IF NOT EXISTS idx_amenidades_popular ON amenidades(popular);
CREATE INDEX IF NOT EXISTS idx_amenidades_ativo ON amenidades(ativo);
CREATE INDEX IF NOT EXISTS idx_amenidades_nome ON amenidades(nome);

-- Índices para proximidades
CREATE INDEX IF NOT EXISTS idx_proximidades_categoria_id ON proximidades(categoria_id);
CREATE INDEX IF NOT EXISTS idx_proximidades_popular ON proximidades(popular);
CREATE INDEX IF NOT EXISTS idx_proximidades_ativo ON proximidades(ativo);
CREATE INDEX IF NOT EXISTS idx_proximidades_nome ON proximidades(nome);

-- Índices para relacionamentos
CREATE INDEX IF NOT EXISTS idx_imovel_amenidades_imovel_id ON imovel_amenidades(imovel_id);
CREATE INDEX IF NOT EXISTS idx_imovel_amenidades_amenidade_id ON imovel_amenidades(amenidade_id);
CREATE INDEX IF NOT EXISTS idx_imovel_proximidades_imovel_id ON imovel_proximidades(imovel_id);
CREATE INDEX IF NOT EXISTS idx_imovel_proximidades_proximidade_id ON imovel_proximidades(proximidade_id);

-- ========================================
-- TRIGGERS PARA AUDITORIA
-- ========================================

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_categorias_amenidades_updated_at ON categorias_amenidades;
CREATE TRIGGER update_categorias_amenidades_updated_at 
    BEFORE UPDATE ON categorias_amenidades 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_amenidades_updated_at ON amenidades;
CREATE TRIGGER update_amenidades_updated_at 
    BEFORE UPDATE ON amenidades 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categorias_proximidades_updated_at ON categorias_proximidades;
CREATE TRIGGER update_categorias_proximidades_updated_at 
    BEFORE UPDATE ON categorias_proximidades 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_proximidades_updated_at ON proximidades;
CREATE TRIGGER update_proximidades_updated_at 
    BEFORE UPDATE ON proximidades 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VIEWS ÚTEIS
-- ========================================

-- View para amenidades com categoria
CREATE OR REPLACE VIEW amenidades_completas AS
SELECT 
    a.id,
    a.nome,
    a.descricao,
    a.icone,
    a.popular,
    a.ordem,
    a.ativo,
    a.created_at,
    a.updated_at,
    ca.id as categoria_id,
    ca.nome as categoria_nome,
    ca.icone as categoria_icone,
    ca.cor as categoria_cor
FROM amenidades a
LEFT JOIN categorias_amenidades ca ON a.categoria_id = ca.id
WHERE a.ativo = true
ORDER BY ca.ordem, a.ordem, a.nome;

-- View para proximidades com categoria
CREATE OR REPLACE VIEW proximidades_completas AS
SELECT 
    p.id,
    p.nome,
    p.descricao,
    p.icone,
    p.popular,
    p.ordem,
    p.ativo,
    p.created_at,
    p.updated_at,
    cp.id as categoria_id,
    cp.nome as categoria_nome,
    cp.icone as categoria_icone,
    cp.cor as categoria_cor
FROM proximidades p
LEFT JOIN categorias_proximidades cp ON p.categoria_id = cp.id
WHERE p.ativo = true
ORDER BY cp.ordem, p.ordem, p.nome;

-- View para imóveis com amenidades
CREATE OR REPLACE VIEW imoveis_amenidades_completas AS
SELECT 
    i.id as imovel_id,
    i.titulo as imovel_titulo,
    a.id as amenidade_id,
    a.nome as amenidade_nome,
    a.icone as amenidade_icone,
    ca.nome as categoria_nome,
    ia.observacoes
FROM imoveis i
INNER JOIN imovel_amenidades ia ON i.id = ia.imovel_id
INNER JOIN amenidades a ON ia.amenidade_id = a.id
INNER JOIN categorias_amenidades ca ON a.categoria_id = ca.id
WHERE i.ativo = true AND a.ativo = true;

-- View para imóveis com proximidades
CREATE OR REPLACE VIEW imoveis_proximidades_completas AS
SELECT 
    i.id as imovel_id,
    i.titulo as imovel_titulo,
    p.id as proximidade_id,
    p.nome as proximidade_nome,
    p.icone as proximidade_icone,
    cp.nome as categoria_nome,
    ip.distancia_metros,
    ip.tempo_caminhada,
    ip.observacoes
FROM imoveis i
INNER JOIN imovel_proximidades ip ON i.id = ip.imovel_id
INNER JOIN proximidades p ON ip.proximidade_id = p.id
INNER JOIN categorias_proximidades cp ON p.categoria_id = cp.id
WHERE i.ativo = true AND p.ativo = true;

-- ========================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ========================================

COMMENT ON TABLE categorias_amenidades IS 'Categorias para agrupar amenidades (ex: Lazer & Entretenimento, Segurança)';
COMMENT ON TABLE amenidades IS 'Amenidades específicas dos imóveis (ex: Piscina, Academia, Portaria 24h)';
COMMENT ON TABLE imovel_amenidades IS 'Relacionamento N:N entre imóveis e suas amenidades';

COMMENT ON TABLE categorias_proximidades IS 'Categorias para agrupar proximidades (ex: Comércio, Saúde, Educação)';
COMMENT ON TABLE proximidades IS 'Proximidades específicas dos imóveis (ex: Shopping, Hospital, Escola)';
COMMENT ON TABLE imovel_proximidades IS 'Relacionamento N:N entre imóveis e proximidades, com dados de distância';

COMMENT ON COLUMN imovel_proximidades.distancia_metros IS 'Distância em metros do imóvel até a proximidade';
COMMENT ON COLUMN imovel_proximidades.tempo_caminhada IS 'Tempo estimado de caminhada em minutos';