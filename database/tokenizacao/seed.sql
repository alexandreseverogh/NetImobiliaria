-- =====================================================
-- DADOS INICIAIS - NET IMOBILIÁRIA
-- =====================================================

-- Inserir recursos do sistema
INSERT INTO resources (name, description) VALUES
('imoveis', 'Gestão de imóveis'),
('proximidades', 'Gestão de proximidades'),
('amenidades', 'Gestão de amenidades'),
('usuarios', 'Gestão de usuários'),
('relatorios', 'Relatórios do sistema')
ON CONFLICT (name) DO NOTHING;

-- Inserir ações disponíveis
INSERT INTO actions (name, description) VALUES
('READ', 'Permissão de leitura'),
('WRITE', 'Permissão de escrita'),
('DELETE', 'Permissão de exclusão'),
('ADMIN', 'Permissão administrativa')
ON CONFLICT (name) DO NOTHING;

-- Inserir permissões (recurso + ação)
INSERT INTO permissions (resource_id, action_id)
SELECT r.id, a.id
FROM resources r, actions a
WHERE r.name IN ('imoveis', 'proximidades', 'amenidades', 'usuarios', 'relatorios')
  AND a.name IN ('READ', 'WRITE', 'DELETE', 'ADMIN')
ON CONFLICT (resource_id, action_id) DO NOTHING;

-- Inserir usuário administrador
INSERT INTO users (username, email, password, nome, cargo, ativo) VALUES
('admin', 'admin@netimobiliaria.com.br', '$2b$12$JWbAvlu9obzYDNNbeT4Bh.o7Pf1NuaDIaWlXaYWy3zcEPiZEhybVC', 'Administrador Principal', 'ADMIN', true),
('corretor1', 'joao@netimobiliaria.com.br', '$2b$12$aQa3DLOe6NnGJ1Usb2Q.pes33KS5RqocNQxexrEE6Aqeq7dr6vI/e', 'João Silva', 'CORRETOR', true),
('assistente1', 'maria@netimobiliaria.com.br', '$2b$12$FGe.7c8DRXL6Bsz8eF/A1OOI18S9z9qCcT9c5emX3Eg9csq.2j.uq', 'Maria Santos', 'ASSISTENTE', true)
ON CONFLICT (username) DO NOTHING;

-- Atribuir permissões ao administrador (TODAS)
INSERT INTO user_permissions (user_id, permission_id, granted_by)
SELECT 
    u.id,
    p.id,
    u.id
FROM users u, permissions p
WHERE u.username = 'admin'
ON CONFLICT (user_id, permission_id) DO NOTHING;

-- Atribuir permissões ao corretor (READ + WRITE em imóveis e proximidades)
INSERT INTO user_permissions (user_id, permission_id, granted_by)
SELECT 
    u.id,
    p.id,
    (SELECT id FROM users WHERE username = 'admin')
FROM users u, permissions p
JOIN resources r ON p.resource_id = r.id
JOIN actions a ON p.action_id = a.id
WHERE u.username = 'corretor1'
  AND r.name IN ('imoveis', 'proximidades')
  AND a.name IN ('READ', 'WRITE')
ON CONFLICT (user_id, permission_id) DO NOTHING;

-- Atribuir permissões ao assistente (apenas READ)
INSERT INTO user_permissions (user_id, permission_id, granted_by)
SELECT 
    u.id,
    p.id,
    (SELECT id FROM users WHERE username = 'admin')
FROM users u, permissions p
JOIN resources r ON p.resource_id = r.id
JOIN actions a ON p.action_id = a.id
WHERE u.username = 'assistente1'
  AND a.name = 'READ'
ON CONFLICT (user_id, permission_id) DO NOTHING;

-- Inserir log de auditoria inicial
INSERT INTO audit_logs (user_id, action, resource_type, details, ip_address)
SELECT 
    u.id,
    'SYSTEM_INITIALIZATION',
    'DATABASE',
    '{"message": "Sistema inicializado", "version": "1.0.0"}',
    '127.0.0.1'
FROM users u
WHERE u.username = 'admin';

-- ========================================
-- DADOS INICIAIS PARA IMÓVEIS
-- ========================================

-- Inserir tipos de imóvel
INSERT INTO tipos_imovel (nome, descricao) VALUES
('Casa', 'Casa residencial'),
('Apartamento', 'Apartamento residencial'),
('Cobertura', 'Cobertura de apartamento'),
('Sobrado', 'Casa de dois ou mais pavimentos'),
('Terreno', 'Terreno para construção'),
('Comercial', 'Imóvel para uso comercial'),
('Rural', 'Imóvel rural ou sítio'),
('Studio', 'Apartamento compacto'),
('Kitnet', 'Apartamento pequeno'),
('Loft', 'Espaço aberto e integrado')
ON CONFLICT (nome) DO NOTHING;

-- Inserir status de imóvel
INSERT INTO status_imovel (nome, cor, descricao) VALUES
('Disponível', '#10B981', 'Imóvel disponível para venda ou aluguel'),
('Vendido', '#EF4444', 'Imóvel já foi vendido'),
('Alugado', '#F59E0B', 'Imóvel está alugado'),
('Reservado', '#8B5CF6', 'Imóvel está reservado'),
('Em Negociação', '#06B6D4', 'Imóvel em processo de negociação'),
('Indisponível', '#6B7280', 'Imóvel temporariamente indisponível')
ON CONFLICT (nome) DO NOTHING;

-- Inserir alguns imóveis de exemplo
INSERT INTO imoveis (codigo, titulo, descricao, tipo_id, status_id, preco, area_total, quartos, banheiros, vagas_garagem, endereco, bairro, cidade, estado, cep, created_by) VALUES
('CASA001', 'Casa em Boa Viagem', 'Linda casa com 3 quartos, 2 banheiros e garagem para 2 carros. Localizada em uma das melhores regiões de Recife.', 
 (SELECT id FROM tipos_imovel WHERE nome = 'Casa'), 
 (SELECT id FROM status_imovel WHERE nome = 'Disponível'), 
 850000.00, 180.00, 3, 2, 2, 'Rua das Flores, 123', 'Boa Viagem', 'Recife', 'PE', '51030-000', 
 (SELECT id FROM users WHERE username = 'admin')),

('APT001', 'Apartamento no Centro', 'Apartamento moderno com 2 quartos, 1 banheiro e 1 vaga de garagem. Ideal para investimento.', 
 (SELECT id FROM tipos_imovel WHERE nome = 'Apartamento'), 
 (SELECT id FROM status_imovel WHERE nome = 'Disponível'), 
 450000.00, 75.00, 2, 1, 1, 'Rua do Comércio, 456', 'Centro', 'Recife', 'PE', '50030-000', 
 (SELECT id FROM users WHERE username = 'admin')),

('TERR001', 'Terreno em Piedade', 'Terreno plano de 300m², ideal para construção. Localização privilegiada com toda infraestrutura.', 
 (SELECT id FROM tipos_imovel WHERE nome = 'Terreno'), 
 (SELECT id FROM status_imovel WHERE nome = 'Disponível'), 
 180000.00, 300.00, 0, 0, 0, 'Rua das Palmeiras, 789', 'Piedade', 'Recife', 'PE', '50750-000', 
 (SELECT id FROM users WHERE username = 'admin'))
ON CONFLICT (codigo) DO NOTHING;

-- Inserir características para os imóveis
INSERT INTO imovel_caracteristicas (imovel_id, caracteristica, valor) VALUES
(1, 'Piscina', 'Sim'),
(1, 'Churrasqueira', 'Sim'),
(1, 'Área de lazer', 'Sim'),
(1, 'Segurança 24h', 'Sim'),
(2, 'Elevador', 'Sim'),
(2, 'Portaria', 'Sim'),
(2, 'Academia', 'Sim'),
(3, 'Esgoto', 'Sim'),
(3, 'Água', 'Sim'),
(3, 'Luz', 'Sim')
ON CONFLICT DO NOTHING;

