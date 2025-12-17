-- =====================================================
-- SCHEMA DO BANCO DE DADOS - NET IMOBILIÁRIA
-- =====================================================

-- Habilitar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABELA DE USUÁRIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    cargo VARCHAR(50) NOT NULL CHECK (cargo IN ('ADMIN', 'CORRETOR', 'ASSISTENTE')),
    ativo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABELA DE RECURSOS (IMÓVEIS, PROXIMIDADES, ETC.)
-- =====================================================
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABELA DE AÇÕES (READ, WRITE, DELETE, ADMIN)
-- =====================================================
CREATE TABLE IF NOT EXISTS actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(20) UNIQUE NOT NULL CHECK (name IN ('READ', 'WRITE', 'DELETE', 'ADMIN')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABELA DE PERMISSÕES (RECURSO + AÇÃO)
-- =====================================================
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_id, action_id)
);

-- =====================================================
-- TABELA DE PERMISSÕES DO USUÁRIO
-- =====================================================
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    active BOOLEAN DEFAULT true,
    UNIQUE(user_id, permission_id)
);

-- =====================================================
-- TABELA DE LOGS DE AUDITORIA
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABELA DE SESSÕES (TOKENS JWT)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- SISTEMA DE IMÓVEIS
-- ========================================

-- Tabela de tipos de imóvel
CREATE TABLE IF NOT EXISTS tipos_imovel (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de status de imóvel
CREATE TABLE IF NOT EXISTS status_imovel (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    cor VARCHAR(7) DEFAULT '#3B82F6',
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    consulta_imovel_internauta BOOLEAN DEFAULT false
);

-- Inserir status padrão "Ativo"
INSERT INTO status_imovel (id, nome, cor, descricao, ativo, created_at, updated_at, consulta_imovel_internauta) 
VALUES (1, 'Ativo', '#22c55e', 'Ativo', true, NOW(), NOW(), true)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    cor = EXCLUDED.cor,
    descricao = EXCLUDED.descricao,
    ativo = EXCLUDED.ativo,
    updated_at = EXCLUDED.updated_at,
    consulta_imovel_internauta = EXCLUDED.consulta_imovel_internauta;

-- Tabela de relacionamento imóvel-amenidades
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

-- Tabela de tipos de documentos para imóveis
CREATE TABLE IF NOT EXISTS tipo_documento_imovel (
    id SERIAL PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL UNIQUE,
    consulta_imovel_internauta BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela principal de imóveis
CREATE TABLE IF NOT EXISTS imoveis (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(100) UNIQUE NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    tipo_fk INTEGER REFERENCES tipos_imovel(id),
    finalidade_fk INTEGER REFERENCES finalidades_imovel(id),
    status_fk INTEGER REFERENCES status_imovel(id),
    
    -- Informações básicas
    preco DECIMAL(12,2),
    preco_condominio DECIMAL(8,2),
    preco_iptu DECIMAL(8,2),
    taxa_extra DECIMAL(8,2),
    area_total DECIMAL(8,2),
    area_construida DECIMAL(8,2),
    quartos INTEGER,
    banheiros INTEGER,
    suites INTEGER,
    vagas_garagem INTEGER,
    varanda INTEGER,
    
    -- Localização
    endereco VARCHAR(300),
    numero VARCHAR(10),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade_fk VARCHAR(100),
    estado_fk CHAR(2),
    cep VARCHAR(10),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    -- Características
    ano_construcao INTEGER,
    andar INTEGER,
    total_andares INTEGER,
    mobiliado BOOLEAN DEFAULT false,
    aceita_permuta BOOLEAN DEFAULT false,
    aceita_financiamento BOOLEAN DEFAULT true,
    
    
    -- Metadados
    destaque BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de imagens dos imóveis
CREATE TABLE IF NOT EXISTS imovel_imagens (
    id SERIAL PRIMARY KEY,
    imovel_id INTEGER REFERENCES imoveis(id) ON DELETE CASCADE,
    nome_arquivo VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    descricao VARCHAR(200),
    ordem INTEGER DEFAULT 0,
    principal BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de documentos dos imóveis
CREATE TABLE IF NOT EXISTS imovel_documentos (
    id SERIAL PRIMARY KEY,
    id_tipo_documento INTEGER NOT NULL REFERENCES tipo_documento_imovel(id),
    id_imovel INTEGER NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
    documento BYTEA NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    tamanho_bytes BIGINT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de visitas aos imóveis
CREATE TABLE IF NOT EXISTS imovel_visitas (
    id SERIAL PRIMARY KEY,
    imovel_id INTEGER REFERENCES imoveis(id) ON DELETE CASCADE,
    cliente_nome VARCHAR(200) NOT NULL,
    cliente_telefone VARCHAR(20),
    cliente_email VARCHAR(200),
    data_visita TIMESTAMP NOT NULL,
    horario_inicio TIME,
    horario_fim TIME,
    observacoes TEXT,
    status VARCHAR(50) DEFAULT 'agendada',
    corretor_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de favoritos dos clientes
CREATE TABLE IF NOT EXISTS imovel_favoritos (
    id SERIAL PRIMARY KEY,
    imovel_id INTEGER REFERENCES imoveis(id) ON DELETE CASCADE,
    cliente_email VARCHAR(200) NOT NULL,
    cliente_nome VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(imovel_id, cliente_email)
);

-- ========================================
-- ÍNDICES PARA PERFORMANCE
-- ========================================

-- Índices para imóveis
CREATE INDEX IF NOT EXISTS idx_imoveis_codigo ON imoveis(codigo);
CREATE INDEX IF NOT EXISTS idx_imoveis_tipo_fk ON imoveis(tipo_fk);
CREATE INDEX IF NOT EXISTS idx_imoveis_finalidade_fk ON imoveis(finalidade_fk);
CREATE INDEX IF NOT EXISTS idx_imoveis_status_fk ON imoveis(status_fk);
CREATE INDEX IF NOT EXISTS idx_imoveis_preco ON imoveis(preco);
CREATE INDEX IF NOT EXISTS idx_imoveis_cidade_fk ON imoveis(cidade_fk);
CREATE INDEX IF NOT EXISTS idx_imoveis_estado_fk ON imoveis(estado_fk);
CREATE INDEX IF NOT EXISTS idx_imoveis_bairro ON imoveis(bairro);
CREATE INDEX IF NOT EXISTS idx_imoveis_quartos ON imoveis(quartos);
CREATE INDEX IF NOT EXISTS idx_imoveis_area_total ON imoveis(area_total);
CREATE INDEX IF NOT EXISTS idx_imoveis_ativo ON imoveis(ativo);
CREATE INDEX IF NOT EXISTS idx_imoveis_destaque ON imoveis(destaque);

-- Índices para imagens
CREATE INDEX IF NOT EXISTS idx_imovel_imagens_imovel_id ON imovel_imagens(imovel_id);
CREATE INDEX IF NOT EXISTS idx_imovel_imagens_principal ON imovel_imagens(principal);

-- Índices para visitas
CREATE INDEX IF NOT EXISTS idx_imovel_visitas_imovel_id ON imovel_visitas(imovel_id);
CREATE INDEX IF NOT EXISTS idx_imovel_visitas_data ON imovel_visitas(data_visita);
CREATE INDEX IF NOT EXISTS idx_imovel_visitas_corretor_id ON imovel_visitas(corretor_id);

-- ========================================
-- TRIGGERS PARA AUDITORIA
-- ========================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_imoveis_updated_at ON imoveis;
CREATE TRIGGER update_imoveis_updated_at 
    BEFORE UPDATE ON imoveis 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tipos_imovel_updated_at ON tipos_imovel;
CREATE TRIGGER update_tipos_imovel_updated_at 
    BEFORE UPDATE ON tipos_imovel 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_status_imovel_updated_at ON status_imovel;
CREATE TRIGGER update_status_imovel_updated_at 
    BEFORE UPDATE ON status_imovel 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VIEWS ÚTEIS
-- ========================================

-- View para imóveis com informações completas
CREATE OR REPLACE VIEW imoveis_completos AS
SELECT 
    i.*,
    ti.nome as tipo_nome,
    fi.nome as finalidade_nome,
    si.nome as status_nome,
    si.cor as status_cor,
    u.nome as corretor_nome,
    (SELECT COUNT(*) FROM imovel_imagens ii WHERE ii.imovel_id = i.id AND ii.ativo = true) as total_imagens,
    (SELECT COUNT(*) FROM imovel_imagens ii WHERE ii.imovel_id = i.id AND ii.ativo = true AND ii.principal = true) as tem_imagem_principal
FROM imoveis i
LEFT JOIN tipos_imovel ti ON i.tipo_fk = ti.id
LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
LEFT JOIN status_imovel si ON i.status_fk = si.id
LEFT JOIN users u ON i.created_by = u.id
WHERE i.ativo = true;

-- View para estatísticas de imóveis
CREATE OR REPLACE VIEW estatisticas_imoveis AS
SELECT 
    COUNT(*) as total_imoveis,
    COUNT(CASE WHEN status_fk = 1 THEN 1 END) as disponiveis,
    COUNT(CASE WHEN status_fk = 2 THEN 1 END) as vendidos,
    COUNT(CASE WHEN status_fk = 3 THEN 1 END) as alugados,
    COUNT(CASE WHEN destaque = true THEN 1 END) as em_destaque,
    AVG(preco) as preco_medio,
    MIN(preco) as preco_minimo,
    MAX(preco) as preco_maximo
FROM imoveis 
WHERE ativo = true;

