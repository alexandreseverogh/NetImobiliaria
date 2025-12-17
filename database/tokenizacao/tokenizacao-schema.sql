-- 🏠 Schema de Banco de Dados para Tokenização
-- Net Imobiliária - Sistema de Tokenização de Imóveis

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- TABELAS BASE (herdadas do projeto principal)
-- ========================================

-- Tabela de usuários (sincronizada do projeto principal)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  nome VARCHAR(100) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de imóveis (sincronizada do projeto principal)
CREATE TABLE IF NOT EXISTS imoveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT,
  valor DECIMAL(15,2) NOT NULL,
  endereco TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sistema de permissões (sincronizado do projeto principal)
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id),
  action_id UUID REFERENCES actions(id),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(resource_id, action_id)
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  permission_id UUID REFERENCES permissions(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- ========================================
-- TABELAS ESPECÍFICAS PARA TOKENIZAÇÃO
-- ========================================

-- Tabela de tokens de imóveis
CREATE TABLE tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imovel_id UUID REFERENCES imoveis(id) ON DELETE CASCADE,
  contract_address VARCHAR(42) UNIQUE, -- Endereço do smart contract
  token_symbol VARCHAR(10) NOT NULL, -- Símbolo do token (ex: NETHOUSE01)
  token_name VARCHAR(100) NOT NULL, -- Nome do token
  total_supply DECIMAL(18,8) NOT NULL, -- Total de tokens disponíveis
  token_price DECIMAL(18,8) NOT NULL, -- Preço por token em BRL
  valor_total_imovel DECIMAL(18,8) NOT NULL, -- Valor total do imóvel
  percentual_liquidez DECIMAL(5,2) DEFAULT 100.00, -- % do imóvel tokenizado
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, ACTIVE, PAUSED, COMPLETED
  data_tokenizacao TIMESTAMP,
  data_finalizacao TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_percentual CHECK (percentual_liquidez > 0 AND percentual_liquidez <= 100),
  CONSTRAINT check_total_supply CHECK (total_supply > 0),
  CONSTRAINT check_token_price CHECK (token_price > 0)
);

-- Tabela de investidores
CREATE TABLE investidores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(42) UNIQUE, -- Endereço da carteira blockchain
  kyc_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, EXPIRED
  kyc_data JSONB, -- Dados do KYC (CPF, RG, comprovantes)
  compliance_score INTEGER DEFAULT 0, -- Score de compliance (0-100)
  limite_investimento DECIMAL(18,8) DEFAULT 1000000.00, -- Limite de investimento
  data_aprovacao_kyc TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_compliance_score CHECK (compliance_score >= 0 AND compliance_score <= 100),
  CONSTRAINT check_limite_investimento CHECK (limite_investimento > 0)
);

-- Tabela de transações
CREATE TABLE transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  investidor_id UUID REFERENCES investidores(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL, -- BUY, SELL, TRANSFER, DIVIDEND
  quantidade DECIMAL(18,8) NOT NULL,
  preco_unitario DECIMAL(18,8) NOT NULL,
  valor_total DECIMAL(18,8) NOT NULL,
  taxa_plataforma DECIMAL(18,8) DEFAULT 0,
  tx_hash VARCHAR(66), -- Hash da transação blockchain
  block_number BIGINT,
  gas_used BIGINT,
  gas_price DECIMAL(18,8),
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, CONFIRMED, FAILED, CANCELLED
  data_confirmacao TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_quantidade CHECK (quantidade > 0),
  CONSTRAINT check_preco_unitario CHECK (preco_unitario > 0),
  CONSTRAINT check_valor_total CHECK (valor_total > 0)
);

-- Tabela de carteiras (holdings dos investidores)
CREATE TABLE carteiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investidor_id UUID REFERENCES investidores(id) ON DELETE CASCADE,
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  quantidade DECIMAL(18,8) NOT NULL DEFAULT 0,
  valor_medio DECIMAL(18,8) NOT NULL DEFAULT 0,
  valor_atual DECIMAL(18,8) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(investidor_id, token_id),
  CONSTRAINT check_quantidade_carteira CHECK (quantidade >= 0)
);

-- Tabela de compliance e relatórios
CREATE TABLE compliance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  tipo_relatorio VARCHAR(50) NOT NULL, -- CVM_MONTHLY, CVM_QUARTERLY, CVM_ANNUAL, AML_CHECK, KYC_REVIEW
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, SUBMITTED, APPROVED, REJECTED
  dados_relatorio JSONB, -- Dados do relatório
  data_vencimento DATE,
  data_submissao TIMESTAMP,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_data_vencimento CHECK (data_vencimento >= CURRENT_DATE)
);

-- Tabela de receitas da plataforma
CREATE TABLE receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(50) NOT NULL, -- TOKENIZACAO, GESTAO, COMPLIANCE, LISTAGEM, TRADING
  token_id UUID REFERENCES tokens(id) ON DELETE SET NULL,
  investidor_id UUID REFERENCES investidores(id) ON DELETE SET NULL,
  transacao_id UUID REFERENCES transacoes(id) ON DELETE SET NULL,
  valor DECIMAL(18,8) NOT NULL,
  percentual DECIMAL(5,2), -- Percentual aplicado
  periodo VARCHAR(20), -- MONTHLY, QUARTERLY, ANNUAL, ONE_TIME
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, COLLECTED, REFUNDED
  data_vencimento DATE,
  data_coleta TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_valor_receita CHECK (valor > 0),
  CONSTRAINT check_percentual_receita CHECK (percentual IS NULL OR (percentual >= 0 AND percentual <= 100))
);

-- Tabela de dividendos (distribuição de rendimentos)
CREATE TABLE dividendos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  tipo_dividendo VARCHAR(30) NOT NULL, -- RENTAL_INCOME, PROPERTY_APPRECIATION, SPECIAL_DISTRIBUTION
  valor_total DECIMAL(18,8) NOT NULL,
  valor_por_token DECIMAL(18,8) NOT NULL,
  data_distribuicao DATE NOT NULL,
  data_pagamento DATE,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, CALCULATED, PAID
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_valor_total_dividendo CHECK (valor_total > 0),
  CONSTRAINT check_valor_por_token CHECK (valor_por_token > 0)
);

-- Tabela de distribuição de dividendos por investidor
CREATE TABLE dividendos_investidores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dividendo_id UUID REFERENCES dividendos(id) ON DELETE CASCADE,
  investidor_id UUID REFERENCES investidores(id) ON DELETE CASCADE,
  quantidade_tokens DECIMAL(18,8) NOT NULL,
  valor_dividendo DECIMAL(18,8) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PAID, FAILED
  data_pagamento TIMESTAMP,
  tx_hash VARCHAR(66),
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_quantidade_tokens_dividendo CHECK (quantidade_tokens > 0),
  CONSTRAINT check_valor_dividendo_investidor CHECK (valor_dividendo > 0)
);

-- Tabela de auditoria e logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de configurações da plataforma
CREATE TABLE platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  data_type VARCHAR(20) DEFAULT 'STRING', -- STRING, NUMBER, BOOLEAN, JSON
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de sincronização
CREATE TABLE sync_metadata (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL,
  last_sync TIMESTAMP DEFAULT NOW(),
  records_processed INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'SUCCESS',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- ÍNDICES PARA PERFORMANCE
-- ========================================

-- Índices para tokens
CREATE INDEX idx_tokens_imovel_id ON tokens(imovel_id);
CREATE INDEX idx_tokens_contract_address ON tokens(contract_address);
CREATE INDEX idx_tokens_status ON tokens(status);
CREATE INDEX idx_tokens_data_tokenizacao ON tokens(data_tokenizacao);

-- Índices para investidores
CREATE INDEX idx_investidores_user_id ON investidores(user_id);
CREATE INDEX idx_investidores_wallet_address ON investidores(wallet_address);
CREATE INDEX idx_investidores_kyc_status ON investidores(kyc_status);

-- Índices para transações
CREATE INDEX idx_transacoes_token_id ON transacoes(token_id);
CREATE INDEX idx_transacoes_investidor_id ON transacoes(investidor_id);
CREATE INDEX idx_transacoes_tipo ON transacoes(tipo);
CREATE INDEX idx_transacoes_status ON transacoes(status);
CREATE INDEX idx_transacoes_tx_hash ON transacoes(tx_hash);
CREATE INDEX idx_transacoes_created_at ON transacoes(created_at);

-- Índices para carteiras
CREATE INDEX idx_carteiras_investidor_id ON carteiras(investidor_id);
CREATE INDEX idx_carteiras_token_id ON carteiras(token_id);

-- Índices para compliance
CREATE INDEX idx_compliance_logs_token_id ON compliance_logs(token_id);
CREATE INDEX idx_compliance_logs_tipo_relatorio ON compliance_logs(tipo_relatorio);
CREATE INDEX idx_compliance_logs_status ON compliance_logs(status);
CREATE INDEX idx_compliance_logs_data_vencimento ON compliance_logs(data_vencimento);

-- Índices para receitas
CREATE INDEX idx_receitas_tipo ON receitas(tipo);
CREATE INDEX idx_receitas_token_id ON receitas(token_id);
CREATE INDEX idx_receitas_investidor_id ON receitas(investidor_id);
CREATE INDEX idx_receitas_status ON receitas(status);
CREATE INDEX idx_receitas_data_vencimento ON receitas(data_vencimento);

-- Índices para dividendos
CREATE INDEX idx_dividendos_token_id ON dividendos(token_id);
CREATE INDEX idx_dividendos_data_distribuicao ON dividendos(data_distribuicao);
CREATE INDEX idx_dividendos_status ON dividendos(status);

-- Índices para audit logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ========================================
-- TRIGGERS PARA AUDITORIA
-- ========================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em tabelas relevantes
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_imoveis_updated_at BEFORE UPDATE ON imoveis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tokens_updated_at BEFORE UPDATE ON tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_investidores_updated_at BEFORE UPDATE ON investidores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_carteiras_updated_at BEFORE UPDATE ON carteiras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_platform_config_updated_at BEFORE UPDATE ON platform_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VIEWS PARA CONSULTAS COMPLEXAS
-- ========================================

-- View de carteiras com informações detalhadas
CREATE VIEW carteiras_detalhadas AS
SELECT 
  c.id,
  c.investidor_id,
  i.user_id,
  u.username,
  u.nome as nome_investidor,
  c.token_id,
  t.contract_address,
  t.token_symbol,
  t.token_name,
  im.titulo as imovel_titulo,
  c.quantidade,
  c.valor_medio,
  c.valor_atual,
  (c.quantidade * c.valor_atual) as valor_total_atual,
  ((c.valor_atual - c.valor_medio) / c.valor_medio * 100) as percentual_lucro_perda
FROM carteiras c
JOIN investidores i ON c.investidor_id = i.id
JOIN users u ON i.user_id = u.id
JOIN tokens t ON c.token_id = t.id
JOIN imoveis im ON t.imovel_id = im.id;

-- View de receitas por tipo
CREATE VIEW receitas_por_tipo AS
SELECT 
  tipo,
  COUNT(*) as total_transacoes,
  SUM(valor) as valor_total,
  AVG(valor) as valor_medio,
  MIN(valor) as valor_minimo,
  MAX(valor) as valor_maximo,
  DATE_TRUNC('month', created_at) as mes
FROM receitas
GROUP BY tipo, DATE_TRUNC('month', created_at)
ORDER BY mes DESC, valor_total DESC;

-- View de compliance pendente
CREATE VIEW compliance_pendente AS
SELECT 
  cl.id,
  cl.token_id,
  t.token_symbol,
  im.titulo as imovel_titulo,
  cl.tipo_relatorio,
  cl.data_vencimento,
  cl.status,
  CASE 
    WHEN cl.data_vencimento < CURRENT_DATE THEN 'VENCIDO'
    WHEN cl.data_vencimento <= CURRENT_DATE + INTERVAL '7 days' THEN 'PRÓXIMO DO VENCIMENTO'
    ELSE 'EM DIA'
  END as status_vencimento
FROM compliance_logs cl
JOIN tokens t ON cl.token_id = t.id
JOIN imoveis im ON t.imovel_id = im.id
WHERE cl.status IN ('PENDING', 'SUBMITTED')
ORDER BY cl.data_vencimento ASC;

-- ========================================
-- FUNÇÕES AUXILIARES
-- ========================================

-- Função para calcular valor total da carteira de um investidor
CREATE OR REPLACE FUNCTION calcular_valor_carteira(investidor_uuid UUID)
RETURNS DECIMAL(18,8) AS $$
DECLARE
  valor_total DECIMAL(18,8) := 0;
BEGIN
  SELECT COALESCE(SUM(quantidade * valor_atual), 0)
  INTO valor_total
  FROM carteiras
  WHERE investidor_id = investidor_uuid;
  
  RETURN valor_total;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar limite de investimento
CREATE OR REPLACE FUNCTION verificar_limite_investimento(investidor_uuid UUID, valor_investimento DECIMAL(18,8))
RETURNS BOOLEAN AS $$
DECLARE
  limite DECIMAL(18,8);
  investido DECIMAL(18,8);
BEGIN
  SELECT limite_investimento INTO limite
  FROM investidores
  WHERE id = investidor_uuid;
  
  SELECT COALESCE(SUM(valor_total), 0) INTO investido
  FROM transacoes
  WHERE investidor_id = investidor_uuid AND tipo = 'BUY' AND status = 'CONFIRMED';
  
  RETURN (investido + valor_investimento) <= limite;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- COMENTÁRIOS NAS TABELAS
-- ========================================

COMMENT ON TABLE tokens IS 'Tokens de imóveis tokenizados na blockchain';
COMMENT ON TABLE investidores IS 'Investidores com dados de KYC e compliance';
COMMENT ON TABLE transacoes IS 'Transações de compra/venda de tokens';
COMMENT ON TABLE carteiras IS 'Carteiras dos investidores com seus holdings';
COMMENT ON TABLE compliance_logs IS 'Logs de compliance e relatórios para CVM';
COMMENT ON TABLE receitas IS 'Receitas da plataforma por diferentes fontes';
COMMENT ON TABLE dividendos IS 'Distribuição de dividendos aos investidores';
COMMENT ON TABLE audit_logs IS 'Logs de auditoria de todas as operações';
COMMENT ON TABLE platform_config IS 'Configurações da plataforma';

-- ========================================
-- GRANTS E PERMISSÕES
-- ========================================

-- Criar usuário específico para aplicação (se necessário)
-- CREATE USER netimobiliaria_tokenizacao WITH PASSWORD 'senha_segura';
-- GRANT CONNECT ON DATABASE net_imobiliaria_tokenizacao TO netimobiliaria_tokenizacao;
-- GRANT USAGE ON SCHEMA public TO netimobiliaria_tokenizacao;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO netimobiliaria_tokenizacao;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO netimobiliaria_tokenizacao;

-- ========================================
-- CONFIGURAÇÕES INICIAIS
-- ========================================

-- Inserir configurações padrão da plataforma
INSERT INTO platform_config (config_key, config_value, description, data_type) VALUES
('tokenizacao_taxa_percentual', '2.5', 'Taxa de tokenização em %', 'NUMBER'),
('gestao_taxa_anual', '1.0', 'Taxa de gestão anual em %', 'NUMBER'),
('compliance_taxa_anual', '0.5', 'Taxa de compliance anual em %', 'NUMBER'),
('trading_taxa_maker', '0.1', 'Taxa de trading para makers em %', 'NUMBER'),
('trading_taxa_taker', '0.2', 'Taxa de trading para takers em %', 'NUMBER'),
('kyc_limite_investimento_padrao', '1000000', 'Limite padrão de investimento em BRL', 'NUMBER'),
('blockchain_network', 'ethereum', 'Rede blockchain utilizada', 'STRING'),
('compliance_cvm_ativo', 'true', 'Se compliance CVM está ativo', 'BOOLEAN'),
('plataforma_ativa', 'true', 'Se plataforma está ativa para novos investimentos', 'BOOLEAN');

-- Inserir recursos específicos para tokenização
INSERT INTO resources (name, description) VALUES
('tokens', 'Gestão de tokens de imóveis'),
('blockchain', 'Operações blockchain'),
('compliance', 'Conformidade CVM'),
('trading', 'Mercado secundário'),
('investidores', 'Gestão de investidores'),
('receitas', 'Controle de receitas'),
('dividendos', 'Distribuição de dividendos');

-- Inserir ações padrão
INSERT INTO actions (name, description) VALUES
('READ', 'Visualização'),
('WRITE', 'Criação e edição'),
('DELETE', 'Exclusão'),
('ADMIN', 'Controle total'),
('TRADE', 'Operações de trading'),
('COMPLIANCE', 'Operações de compliance');

-- ========================================
-- FINALIZAÇÃO
-- ========================================

-- Atualizar estatísticas
ANALYZE;

-- Log de criação
INSERT INTO sync_metadata (sync_type, records_processed, status) 
VALUES ('schema_creation', 0, 'SUCCESS');

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Schema de tokenização criado com sucesso!';
    RAISE NOTICE '📊 Tabelas criadas: %, Índices: %, Views: %', 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'),
        (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'),
        (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public');
END $$;
